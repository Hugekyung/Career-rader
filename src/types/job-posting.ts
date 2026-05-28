import type { JobFitAnalysis } from "./job-fit";
import type { JobProvider } from "./job-source";

export interface JobPosting {
  id: string;
  source: string;
  provider?: JobProvider;
  title: string;
  company?: string;
  url: string;
  sourceUrl?: string;
  detailText?: string;
  fit?: JobFitAnalysis;
  collectedAt: string;
}
