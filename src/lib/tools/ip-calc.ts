
export interface SubnetInfo {
    address: string;
    netmask: string;
    cidr: number;
    wildcard: string;
    network: string; // CIDR format
    broadcast: string;
    hostMin: string;
    hostMax: string;
    hosts: number;
    binaryIp: string;
    binaryNetmask: string;
    class: string;
}

export function calculateSubnet(ip: string, cidrOrMask: string): SubnetInfo | null {
    try {
        // Parse IP
        const ipParts = ip.trim().split('.').map(Number);
        if (ipParts.length !== 4 || ipParts.some(p => isNaN(p) || p < 0 || p > 255)) return null;
        const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];

        // Parse CIDR or Netmask
        let cidr = 0;
        if (cidrOrMask.includes('.')) {
            // Netmask
            const maskParts = cidrOrMask.trim().split('.').map(Number);
            if (maskParts.length !== 4) return null;
            const maskNum = (maskParts[0] << 24) | (maskParts[1] << 16) | (maskParts[2] << 8) | maskParts[3];
            // Count bits
            cidr = 0;
            let temp = maskNum;
            // This is a naive count for contiguous masks. 
            // For a robust calculator we assume contiguous 1s properly.
            // Let's just convert mask to CIDR.
            // Standard approach: count set bits? Only if contiguous.
            // Let's rely on user entering valid masks or CIDR.
            let m = maskNum;
            while ((m & 0x80000000) !== 0) {
                cidr++;
                m = m << 1;
            }
        } else {
            // CIDR
            cidr = parseInt(cidrOrMask.replace('/', ''), 10);
            if (isNaN(cidr) || cidr < 0 || cidr > 32) return null;
        }

        const maskNum = cidr === 0 ? 0 : (~0) << (32 - cidr);
        const networkNum = ipNum & maskNum;
        const broadcastNum = networkNum | (~maskNum);
        const wildcardNum = ~maskNum;

        const hosts = cidr === 32 ? 1 : cidr === 31 ? 2 : (Math.pow(2, 32 - cidr) - 2);

        // Formats
        const numToIp = (num: number) => {
            return [
                (num >>> 24) & 255,
                (num >>> 16) & 255,
                (num >>> 8) & 255,
                num & 255
            ].join('.');
        };

        const numToBinary = (num: number) => {
            return [
                ((num >>> 24) & 255).toString(2).padStart(8, '0'),
                ((num >>> 16) & 255).toString(2).padStart(8, '0'),
                ((num >>> 8) & 255).toString(2).padStart(8, '0'),
                (num & 255).toString(2).padStart(8, '0')
            ].join('.');
        };

        const hostMinNum = networkNum + 1;
        const hostMaxNum = broadcastNum - 1;

        // Class Naive Check
        const firstByte = ipParts[0];
        let ipClass = 'Unknown';
        if (firstByte >= 1 && firstByte <= 126) ipClass = 'A';
        else if (firstByte >= 128 && firstByte <= 191) ipClass = 'B';
        else if (firstByte >= 192 && firstByte <= 223) ipClass = 'C';
        else if (firstByte >= 224 && firstByte <= 239) ipClass = 'D (Multicast)';
        else if (firstByte >= 240 && firstByte <= 254) ipClass = 'E (Experimental)';


        return {
            address: ip,
            netmask: numToIp(maskNum),
            cidr: cidr,
            wildcard: numToIp(wildcardNum),
            network: `${numToIp(networkNum)}/${cidr}`,
            broadcast: numToIp(broadcastNum),
            hostMin: cidr >= 31 ? 'N/A' : numToIp(hostMinNum),
            hostMax: cidr >= 31 ? 'N/A' : numToIp(hostMaxNum),
            hosts: hosts < 0 ? 0 : hosts,
            binaryIp: numToBinary(ipNum),
            binaryNetmask: numToBinary(maskNum),
            class: ipClass
        };

    } catch (e) {
        return null;
    }
}
