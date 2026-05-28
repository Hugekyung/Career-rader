export type JobProvider = "JobKorea" | "Saramin" | "Manual";

export interface JobSource {
  name: string;
  company?: string;
  provider?: JobProvider;
  url: string;
  includeUrlPatterns: string[];
  excludeUrlPatterns?: string[];
  requiredKeywords?: string[];
  excludeKeywords?: string[];
  maxItems?: number;
}
