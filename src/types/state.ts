export interface SeenItem {
  url: string;
  seenAt: string;
}

export interface SeenState {
  seenArticles: SeenItem[];
  seenJobs: SeenItem[];
  updatedAt: string;
}
