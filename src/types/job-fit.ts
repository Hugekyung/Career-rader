export type JobRecommendation = "적극 지원" | "우선 검토" | "조건부 검토" | "스킵";

export interface JobFitAnalysis {
  score: number;
  recommendation: JobRecommendation;
  positiveReasons: string[];
  negativeReasons: string[];
}
