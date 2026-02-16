// Type for center markers on the map (from map_index.json)
export interface MapCenter {
    ogrn: string;
    name: string;
    short_name: string;
    lat: number;
    lon: number;
    rid_count: number;
    project_count: number;
    top_keywords: Array<{
        keyword: string;
        count: number;
    }>;
    scientific_domains: Array<{
        code: string;
        name: string;
    }>;
    okogu?: string;
    total_funding?: number;
}

// Type for detailed center information (from centers/{ogrn}.json)
export interface CenterDetail {
    ogrn: string;
    name: string;
    short_name: string;
    total_funding?: number;
    top_keywords: Array<{
        keyword: string;
        count: number;
    }>;
    rid_types: Record<string, number>;
    scientific_domains: Array<{
        code: string;
        name: string;
    }>;
    rids: Array<{
        name: string;
        rid_type: string;
        created_date: string;
        abstract: string;
        keywords: string[];
        protections: Array<{
            date: string;
            protection_way: string;
        }>;
        usage?: Array<{
            type: 'own' | 'external';
            date: string;
            description?: string;
            organization?: string;
            contract_type?: string;
        }>;
    }>;
    projects: ProjectEntry[];
}

export interface ProjectEntry {
    name: string;
    report_type: string;
    stage_start_date: string;
    stage_end_date: string;
    status?: string;
    finance_total?: number;
    abstract: string;
    keywords: string[];
    workers_total?: number;
    publication_count: number;
}

// Type for the overall map data structure
export interface MapData {
    generated_at: string;
    total_centers: number;
    centers: MapCenter[];
}
export type FundingTier = 'all' | 'small' | 'medium' | 'large';
