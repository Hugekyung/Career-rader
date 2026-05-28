export interface JobSource {
  name: string;
  company?: string;
  url: string;
  includeUrlPatterns: string[];
  excludeUrlPatterns?: string[];
  maxItems?: number;
}
