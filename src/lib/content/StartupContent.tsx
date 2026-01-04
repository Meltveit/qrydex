
export const STARTUP_CONTENT = {
    topics: {
        validation: {
            icon: '🧪',
            color: 'blue',
            steps: [
                { title: 'Define the Problem', text: 'Talk to 10 potential customers. Ask about their PAIN, not your solution.' },
                { title: 'Check Competitors', text: 'Use Qrydex to search for existing companies in this niche.' },
                { title: 'Landing Page Test', text: 'Set up a simple site. Drive traffic. See if people click "Buy".' }
            ],
            searches: [
                { query: 'Market Research Agency', label: 'Find Research Agencies' },
                { query: 'Consulting', label: 'Strategy Consultants' }
            ]
        },
        prototyping: {
            icon: '🛠️',
            color: 'indigo',
            steps: [
                { title: 'Sketch & Specification', text: 'Create technical drawings (CAD) or detailed specs.' },
                { title: 'Find a Partner', text: 'Search for "Contract Manufacturing" or "Prototyping" in Qrydex.' },
                { title: 'MVP (Minimum Viable Product)', text: 'Build the simplest version that solves the core problem.' }
            ],
            searches: [
                { query: 'Contract Manufacturing', label: 'Contract Manufacturers' },
                { query: 'Prototyping Service', label: 'Prototyping Labs' },
                { query: 'Industrial Design', label: 'Industrial Designers' },
                { query: 'FabLab', label: 'Makerspaces / FabLabs' }
            ]
        },
        sourcing: {
            icon: '🚢',
            color: 'orange',
            steps: [
                { title: 'Identify Components', text: 'List every part associated with your product.' },
                { title: 'Domestic vs International', text: 'Decide if you want local quality or global pricing.' },
                { title: 'Request Quotes (RFQ)', text: 'Contact 3-5 suppliers from Qrydex.' }
            ],
            searches: [
                { query: 'Wholesale', label: 'Wholesalers' },
                { query: 'Distributor', label: 'Distributors' },
                { query: 'Logistics', label: 'Freight Forwarders' }
            ]
        },
        funding: {
            icon: '💰',
            color: 'green',
            steps: [
                { title: 'Bootstrapping', text: 'Use own savings to keep 100% equity.' },
                { title: 'Soft Funding', text: 'Apply for government grants (Innovasjon Norge, etc).' },
                { title: 'Investors', text: 'Find Angels or VCs that specialize in your industry.' }
            ],
            searches: [
                { query: 'Venture Capital', label: 'VC Firms' },
                { query: 'Investment', label: 'Investment Companies' },
                { query: 'Grants', label: 'Grant Consultants' }
            ]
        },
        starting: {
            icon: '🏢',
            color: 'purple',
            steps: [
                { title: 'Choose Entity Type', text: 'Sole proprietorship (ENK) vs Corporation (AS).' },
                { title: 'Register', text: 'Submit papers to the government registry.' },
                { title: 'Bank Account', text: 'Open a business account and get share capital ready.' }
            ],
            searches: [
                { query: 'Accounting', label: 'Accountants' },
                { query: 'Lawyer', label: 'Corporate Lawyers' },
                { query: 'Auditor', label: 'Auditors' }
            ]
        },
        distribution: {
            icon: '🚚',
            color: 'teal',
            steps: [
                { title: 'Channel Strategy', text: 'Direct to Consumer (DTC) or Retail/B2B?' },
                { title: 'Find Distributors', text: 'Agents who can sell your product for a commission.' },
                { title: 'Logistics', text: 'Warehousing and shipping solutions.' }
            ],
            searches: [
                { query: '3PL', label: '3PL / Warehousing' },
                { query: 'Sales Agent', label: 'Sales Agents' },
                { query: 'Retail Chain', label: 'Retail Chains' }
            ]
        }
    },
    countries: {
        no: {
            name: 'Norway',
            flag: '🇳🇴',
            agencies: [
                { name: 'Brønnøysundregistrene', link: 'https://brreg.no', desc: 'Official Company Registry' },
                { name: 'Skatteetaten', link: 'https://skatteetaten.no', desc: 'Tax Authority' },
                { name: 'Innovasjon Norge', link: 'https://innovasjonnorge.no', desc: 'Grants & Advice' },
                { name: 'Altinn', link: 'https://altinn.no', desc: 'Public Reporting Portal' }
            ]
        },
        se: {
            name: 'Sweden',
            flag: '🇸🇪',
            agencies: [
                { name: 'Bolagsverket', link: 'https://bolagsverket.se', desc: 'Company Registration' },
                { name: 'Skatteverket', link: 'https://skatteverket.se', desc: 'Tax Agency' },
                { name: 'Verksamt.se', link: 'https://verksamt.se', desc: 'Business Portal' },
                { name: 'Vinnova', link: 'https://vinnova.se', desc: 'Innovation Agency' }
            ]
        },
        dk: {
            name: 'Denmark',
            flag: '🇩🇰',
            agencies: [
                { name: 'Virk', link: 'https://virk.dk', desc: 'Business Portal (CVR)' },
                { name: 'Erhvervsstyrelsen', link: 'https://erst.dk', desc: 'Business Authority' },
                { name: 'Skat', link: 'https://skat.dk', desc: 'Tax Authority' }
            ]
        },
        uk: {
            name: 'UK',
            flag: '🇬🇧',
            agencies: [
                { name: 'Companies House', link: 'https://gov.uk/companies-house', desc: 'Company Registry' },
                { name: 'HMRC', link: 'https://gov.uk/hmrc', desc: 'Tax & Customs' },
                { name: 'Gov.uk Business', link: 'https://gov.uk/browse/business', desc: 'Business Guide' }
            ]
        },
        us: {
            name: 'USA',
            flag: '🇺🇸',
            agencies: [
                { name: 'IRS (EIN)', link: 'https://irs.gov', desc: 'Tax ID (EIN)' },
                { name: 'SBA', link: 'https://sba.gov', desc: 'Small Business Admin' },
                { name: 'USPTO', link: 'https://uspto.gov', desc: 'Patents & Trademarks' }
            ]
        },
        de: {
            name: 'Germany',
            flag: '🇩🇪',
            agencies: [
                { name: 'Unternehmensregister', link: 'https://unternehmensregister.de', desc: 'Business Register' },
                { name: 'BMWK', link: 'https://bmwk.de', desc: 'Ministry for Economic Affairs' }
            ]
        }
    }
};
