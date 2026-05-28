export interface Article {
  id: string;
  source: string;
  title: string;
  url: string;
  description?: string;
  publishedAt?: string;
  collectedAt: string;
  tags?: string[];
}
