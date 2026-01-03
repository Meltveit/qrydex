'use server';

import dns from 'node:dns/promises';

export type DnsRecordType = 'A' | 'AAAA' | 'MX' | 'TXT' | 'NS' | 'CNAME' | 'SOA' | 'ALL';

export interface DnsResult {
    type: string;
    value: string;
    priority?: number; // For MX
    ttl?: number;      // Note: Node.js dns module doesn't always return TTL for all record types in standard lookups
}

export interface DnsLookupResponse {
    success: boolean;
    records?: DnsResult[];
    error?: string;
}

function cleanDomain(input: string): string {
    return input
        .trim()
        .replace(/^https?:\/\//, '') // Remove protocol
        .replace(/\/.*$/, '') // Remove path
        .toLowerCase();
}

export async function lookupDns(domain: string, recordType: DnsRecordType = 'ALL'): Promise<DnsLookupResponse> {
    const cleanedDomain = cleanDomain(domain);

    if (!cleanedDomain || cleanedDomain.includes(' ')) {
        return { success: false, error: 'Invalid domain name' };
    }

    try {
        const records: DnsResult[] = [];

        // Helper to safely fetch records
        const fetchRecords = async (type: DnsRecordType) => {
            try {
                switch (type) {
                    case 'A':
                        const aRecords = await dns.resolve4(cleanedDomain);
                        aRecords.forEach(r => records.push({ type: 'A', value: r }));
                        break;
                    case 'AAAA':
                        const aaaaRecords = await dns.resolve6(cleanedDomain);
                        aaaaRecords.forEach(r => records.push({ type: 'AAAA', value: r }));
                        break;
                    case 'MX':
                        const mxRecords = await dns.resolveMx(cleanedDomain);
                        mxRecords.forEach(r => records.push({ type: 'MX', value: r.exchange, priority: r.priority }));
                        break;
                    case 'TXT':
                        const txtRecords = await dns.resolveTxt(cleanedDomain);
                        txtRecords.forEach(r => records.push({ type: 'TXT', value: r.join(' ') }));
                        break;
                    case 'NS':
                        const nsRecords = await dns.resolveNs(cleanedDomain);
                        nsRecords.forEach(r => records.push({ type: 'NS', value: r }));
                        break;
                    case 'CNAME':
                        const cnameRecords = await dns.resolveCname(cleanedDomain);
                        cnameRecords.forEach(r => records.push({ type: 'CNAME', value: r }));
                        break;
                    case 'SOA':
                        const soaRecord = await dns.resolveSoa(cleanedDomain);
                        records.push({
                            type: 'SOA',
                            value: `nsname=${soaRecord.nsname} hostmaster=${soaRecord.hostmaster} serial=${soaRecord.serial}`
                        });
                        break;
                }
            } catch (err: any) {
                // Ignore "ENODATA" or "ENOTFOUND" for specific types when searching ALL
                if (err.code !== 'ENODATA' && err.code !== 'ENOTFOUND') {
                    console.error(`Error resolving ${type} for ${cleanedDomain}:`, err);
                }
            }
        };

        if (recordType === 'ALL') {
            await Promise.all([
                fetchRecords('A'),
                fetchRecords('AAAA'),
                fetchRecords('MX'),
                fetchRecords('TXT'),
                fetchRecords('NS'),
                fetchRecords('CNAME'),
                fetchRecords('SOA')
            ]);
        } else {
            await fetchRecords(recordType);
        }

        if (records.length === 0) {
            // Second check: if generic resolve fails or returns empty, check if it's because the domain truly doesn't exist
            // But we handled individual errors above.
            return { success: true, records: [] };
        }

        return { success: true, records };

    } catch (error: any) {
        console.error('DNS Lookup Generic Error:', error);
        return { success: false, error: error.message || 'Failed to resolve DNS' };
    }
}
