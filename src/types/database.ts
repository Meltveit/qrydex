export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface RegistryData {
    org_nr?: string;
    vat_number?: string;
    vat_status?: 'Active' | 'Inactive' | 'Unknown';
    last_verified_registry?: string;
    legal_name?: string;
    registered_address?: string;
    registration_date?: string;
    company_status?: 'Active' | 'Dissolved' | 'Liquidation' | 'Unknown';
    industry_codes?: string[];
    employee_count?: number;
}

export interface QualityAnalysis {
    website_url?: string;
    has_ssl?: boolean;
    content_freshness?: string;
    professional_email?: boolean;
    contact_email?: string;
    contact_phone?: string;
    industry_category?: string;
    ai_summary?: string;
    quality_score?: number;
    last_analyzed?: string;
    red_flags?: string[];
}

export interface NewsSignal {
    date: string;
    headline: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    source: string;
    url?: string;
    impact_score: number;
}

export interface TrustScoreBreakdown {
    registry_verified: number;
    quality_score: number;
    news_sentiment: number;
}

export interface Database {
    public: {
        Tables: {
            businesses: {
                Row: {
                    id: string;
                    org_number: string;
                    legal_name: string;
                    country_code: string;
                    domain: string | null;
                    registry_data: RegistryData;
                    quality_analysis: QualityAnalysis;
                    news_signals: NewsSignal[];
                    trust_score: number;
                    trust_score_breakdown: TrustScoreBreakdown;
                    created_at: string;
                    updated_at: string;
                    last_verified_at: string | null;
                    verification_status: 'pending' | 'verified' | 'failed';
                    search_vector: string | null;
                };
                Insert: {
                    id?: string;
                    org_number: string;
                    legal_name: string;
                    country_code: string;
                    domain?: string | null;
                    registry_data?: RegistryData;
                    quality_analysis?: QualityAnalysis;
                    news_signals?: NewsSignal[];
                    trust_score?: number;
                    trust_score_breakdown?: TrustScoreBreakdown;
                    created_at?: string;
                    updated_at?: string;
                    last_verified_at?: string | null;
                    verification_status?: 'pending' | 'verified' | 'failed';
                };
                Update: {
                    id?: string;
                    org_number?: string;
                    legal_name?: string;
                    country_code?: string;
                    domain?: string | null;
                    registry_data?: RegistryData;
                    quality_analysis?: QualityAnalysis;
                    news_signals?: NewsSignal[];
                    trust_score?: number;
                    trust_score_breakdown?: TrustScoreBreakdown;
                    updated_at?: string;
                    last_verified_at?: string | null;
                    verification_status?: 'pending' | 'verified' | 'failed';
                };
            };
            verification_logs: {
                Row: {
                    id: string;
                    business_id: string;
                    verification_type: 'registry' | 'ai_quality' | 'news';
                    status: 'success' | 'failed' | 'partial';
                    details: Json;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    business_id: string;
                    verification_type: 'registry' | 'ai_quality' | 'news';
                    status: 'success' | 'failed' | 'partial';
                    details?: Json;
                    created_at?: string;
                };
                Update: {
                    status?: 'success' | 'failed' | 'partial';
                    details?: Json;
                };
            };
            premium_verifications: {
                Row: {
                    id: string;
                    business_id: string;
                    verification_type: string;
                    status: 'verified' | 'pending' | 'expired';
                    verified_date: string | null;
                    expiry_date: string | null;
                    certificate_document_url: string | null;
                    verified_by: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    business_id: string;
                    verification_type: string;
                    status?: 'verified' | 'pending' | 'expired';
                    verified_date?: string | null;
                    expiry_date?: string | null;
                    certificate_document_url?: string | null;
                    verified_by?: string | null;
                    created_at?: string;
                };
                Update: {
                    status?: 'verified' | 'pending' | 'expired';
                    verified_date?: string | null;
                    expiry_date?: string | null;
                    certificate_document_url?: string | null;
                    verified_by?: string | null;
                };
            };
        };
    };
}

export type Business = Database['public']['Tables']['businesses']['Row'];
export type BusinessInsert = Database['public']['Tables']['businesses']['Insert'];
export type BusinessUpdate = Database['public']['Tables']['businesses']['Update'];
export type VerificationLog = Database['public']['Tables']['verification_logs']['Row'];
export type PremiumVerification = Database['public']['Tables']['premium_verifications']['Row'];
