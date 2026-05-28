export interface JobPosting {
  id: string;
  source: string;
  title: string;
  company?: string;
  url: string;
  sourceUrl?: string;
  collectedAt: string;
}
