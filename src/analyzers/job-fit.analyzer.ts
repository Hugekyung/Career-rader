import type { JobFitAnalysis, JobRecommendation } from "../types/job-fit";
import type { JobPosting } from "../types/job-posting";
import { normalizeForKeyword } from "../utils/job-keywords";

interface Rule {
  label: string;
  keywords: string[];
  score: number;
  reason: string;
  type?: "only" | "absence";
  guardKeywords?: string[];
}

const techRules: Rule[] = [
  { label: "Node.js", keywords: ["node.js", "nodejs", "node"], score: 20, reason: "Node.js 기반" },
  { label: "NestJS", keywords: ["nestjs", "nest.js"], score: 20, reason: "NestJS 기반" },
  { label: "TypeScript", keywords: ["typescript", "ts"], score: 15, reason: "TypeScript 사용" },
  {
    label: "MySQL/PostgreSQL",
    keywords: ["mysql", "postgresql", "postgres", "rdb", "rdbms"],
    score: 10,
    reason: "MySQL/PostgreSQL 사용",
  },
  { label: "Redis", keywords: ["redis"], score: 10, reason: "Redis 사용" },
  { label: "AWS", keywords: ["aws", "ec2", "ecs", "lambda", "rds", "s3"], score: 10, reason: "AWS 사용" },
  { label: "Docker", keywords: ["docker", "container", "컨테이너"], score: 8, reason: "Docker/컨테이너 사용" },
  { label: "RabbitMQ/Kafka", keywords: ["rabbitmq", "kafka"], score: 8, reason: "RabbitMQ/Kafka 사용" },
  { label: "REST API", keywords: ["rest api", "restful", "api"], score: 8, reason: "REST API 개발" },
  {
    label: "MSA/Event Driven",
    keywords: ["msa", "microservice", "micro-service", "event driven", "이벤트 기반"],
    score: 10,
    reason: "MSA/Event Driven 구조",
  },
  {
    label: "대용량 트래픽",
    keywords: ["대용량", "대규모", "트래픽", "high traffic", "scale"],
    score: 10,
    reason: "대용량 트래픽 경험",
  },
  { label: "성능 개선", keywords: ["성능 개선", "성능 최적화", "optimization"], score: 10, reason: "성능 개선 업무" },
  { label: "데이터 정합성", keywords: ["데이터 정합성", "정합성", "consistency"], score: 10, reason: "데이터 정합성 업무" },
  { label: "운영 자동화", keywords: ["운영 자동화", "automation", "자동화"], score: 10, reason: "운영 자동화 경험" },
  { label: "외부 API 연동", keywords: ["외부 api", "api 연동", "third-party", "3rd party"], score: 8, reason: "외부 API 연동" },
];

const techNegativeRules: Rule[] = [
  {
    label: "Java/Spring ONLY",
    keywords: ["java", "spring", "spring boot"],
    score: -20,
    reason: "Java/Spring 중심 포지션",
    type: "only",
    guardKeywords: ["node.js", "nodejs", "nestjs", "nest.js"],
  },
  {
    label: "PHP/Laravel ONLY",
    keywords: ["php", "laravel"],
    score: -15,
    reason: "PHP/Laravel 중심 포지션",
    type: "only",
    guardKeywords: ["node.js", "nodejs", "nestjs", "nest.js"],
  },
  {
    label: ".NET ONLY",
    keywords: [".net", "c#", "asp.net"],
    score: -15,
    reason: ".NET 중심 포지션",
    type: "only",
    guardKeywords: ["node.js", "nodejs", "nestjs", "nest.js"],
  },
  {
    label: "Frontend Main",
    keywords: ["프론트엔드", "frontend", "front-end"],
    score: -20,
    reason: "프론트엔드 중심 포지션",
    type: "only",
    guardKeywords: ["백엔드", "backend", "서버", "node.js", "nodejs", "nestjs", "nest.js"],
  },
  {
    label: "React/Vue 중심",
    keywords: ["react", "vue"],
    score: -15,
    reason: "React/Vue 중심 포지션",
    type: "only",
    guardKeywords: ["백엔드", "backend", "서버", "node.js", "nodejs", "nestjs", "nest.js"],
  },
  {
    label: "iOS/Android 중심",
    keywords: ["ios", "android", "안드로이드", "모바일 앱"],
    score: -20,
    reason: "iOS/Android 중심 포지션",
  },
];

const domainRules: Rule[] = [
  { label: "커머스", keywords: ["커머스", "commerce", "이커머스"], score: 15, reason: "커머스 도메인" },
  { label: "결제/정산", keywords: ["결제", "정산", "payment", "billing"], score: 15, reason: "결제/정산 도메인" },
  { label: "플랫폼 서비스", keywords: ["플랫폼", "platform"], score: 12, reason: "플랫폼 서비스" },
  { label: "구독 서비스", keywords: ["구독", "subscription"], score: 10, reason: "구독 서비스" },
  { label: "CRM/마케팅 자동화", keywords: ["crm", "마케팅 자동화"], score: 10, reason: "CRM/마케팅 자동화" },
  { label: "운영 자동화", keywords: ["운영 자동화", "업무 자동화"], score: 12, reason: "운영 자동화 업무" },
  { label: "백오피스 시스템", keywords: ["백오피스", "backoffice", "admin"], score: 10, reason: "백오피스 시스템" },
  { label: "B2B SaaS", keywords: ["b2b", "saas"], score: 10, reason: "B2B SaaS" },
  { label: "API 최적화", keywords: ["api 최적화", "api 성능"], score: 8, reason: "API 최적화" },
  { label: "배치/스케줄러", keywords: ["배치", "scheduler", "스케줄러", "batch"], score: 8, reason: "배치/스케줄러" },
  { label: "비동기 처리", keywords: ["비동기", "async", "asynchronous"], score: 8, reason: "비동기 처리" },
  { label: "메시지 큐", keywords: ["메시지 큐", "message queue", "queue"], score: 8, reason: "메시지 큐" },
  { label: "모니터링/운영", keywords: ["모니터링", "monitoring", "운영"], score: 8, reason: "모니터링/운영" },
  { label: "장애 대응", keywords: ["장애 대응", "incident", "troubleshooting"], score: 8, reason: "장애 대응" },
];

const domainNegativeRules: Rule[] = [
  { label: "SI/상주", keywords: ["si", "상주"], score: -15, reason: "SI/상주 가능성" },
  { label: "파견", keywords: ["파견"], score: -15, reason: "파견 포지션" },
  { label: "유지보수 위주", keywords: ["유지보수"], score: -10, reason: "유지보수 위주" },
  { label: "퍼블리싱 위주", keywords: ["퍼블리싱", "퍼블리셔"], score: -15, reason: "퍼블리싱 위주" },
  { label: "단순 홈페이지 제작", keywords: ["홈페이지 제작", "웹사이트 제작"], score: -20, reason: "단순 홈페이지 제작" },
];

const careerRules: Rule[] = [
  { label: "AI 활용 서비스", keywords: ["ai 활용", "ai 서비스", "인공지능"], score: 10, reason: "AI 활용 서비스" },
  { label: "AI 자동화", keywords: ["ai 자동화", "자동화"], score: 10, reason: "AI 자동화" },
  { label: "플랫폼 확장성", keywords: ["확장성", "scalability", "scale"], score: 8, reason: "플랫폼 확장성" },
  { label: "데이터 기반 의사결정", keywords: ["데이터 기반", "data-driven"], score: 8, reason: "데이터 기반 의사결정" },
  { label: "DevOps 문화", keywords: ["devops", "ci/cd", "cicd"], score: 8, reason: "DevOps 문화" },
  { label: "기술 투자 문화", keywords: ["기술 투자", "기술 문화", "tech culture"], score: 8, reason: "기술 투자 문화" },
];

const careerNegativeRules: Rule[] = [
  {
    label: "레거시 유지보수 ONLY",
    keywords: ["레거시", "유지보수"],
    score: -15,
    reason: "레거시 유지보수 중심",
    type: "only",
    guardKeywords: ["신규", "고도화", "개선", "리뉴얼"],
  },
  { label: "기술 변화 거의 없음", keywords: ["기술 변화 없음", "단순 운영"], score: -10, reason: "기술 변화가 적은 업무" },
  {
    label: "구형 PHP/온프레 ONLY",
    keywords: ["php", "온프레", "on-premise", "on premise"],
    score: -10,
    reason: "구형 PHP/온프레 중심",
    type: "only",
    guardKeywords: ["cloud", "aws", "node.js", "nodejs", "nestjs"],
  },
];

const organizationRiskRules: Rule[] = [
  { label: "상주", keywords: ["상주"], score: -15, reason: "상주 가능성" },
  { label: "야근 잦음 암시", keywords: ["야근", "철야", "주말근무"], score: -10, reason: "야근/주말근무 가능성" },
  { label: "군대식 문화 암시", keywords: ["군대식", "수직적"], score: -10, reason: "수직적 조직 문화 가능성" },
  { label: "연봉 불명확", keywords: ["연봉", "급여", "보상"], score: -5, reason: "연봉/보상 정보 불명확", type: "absence" },
  { label: "복지 거의 없음", keywords: ["복지", "휴가", "지원", "benefit"], score: -5, reason: "복지 정보 부족", type: "absence" },
  {
    label: "기술스택 불명확",
    keywords: ["node.js", "nodejs", "nestjs", "typescript", "mysql", "postgres", "redis", "aws", "docker"],
    score: -5,
    reason: "기술스택 정보 불명확",
    type: "absence",
  },
];

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(normalizeForKeyword(keyword)));
}

function matchesRule(text: string, rule: Rule): boolean {
  const keywordMatched = hasAny(text, rule.keywords);

  if (rule.type === "absence") {
    return !keywordMatched;
  }

  if (!keywordMatched) {
    return false;
  }

  if (rule.type === "only" && rule.guardKeywords && hasAny(text, rule.guardKeywords)) {
    return false;
  }

  return true;
}

function applyPositiveRules(
  text: string,
  rules: Rule[],
  maxScore: number,
): {
  score: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  for (const rule of rules) {
    if (!matchesRule(text, rule)) {
      continue;
    }

    if (score >= maxScore) {
      continue;
    }

    const availableScore = Math.min(rule.score, maxScore - score);
    score += availableScore;
    reasons.push(rule.reason);
  }

  return { score, reasons };
}

function applyNegativeRules(
  text: string,
  rules: Rule[],
  maxPenalty?: number,
): {
  score: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  for (const rule of rules) {
    if (!matchesRule(text, rule)) {
      continue;
    }

    if (maxPenalty !== undefined && Math.abs(score) >= maxPenalty) {
      continue;
    }

    const penalty =
      maxPenalty === undefined ? rule.score : -Math.min(Math.abs(rule.score), maxPenalty - Math.abs(score));
    score += penalty;
    reasons.push(rule.reason);
  }

  return { score, reasons };
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function getRecommendation(score: number): JobRecommendation {
  if (score >= 85) {
    return "적극 지원";
  }

  if (score >= 70) {
    return "우선 검토";
  }

  if (score >= 55) {
    return "조건부 검토";
  }

  return "스킵";
}

export function analyzeJobFit(job: JobPosting): JobFitAnalysis {
  const text = normalizeForKeyword(`${job.title} ${job.company ?? ""} ${job.detailText ?? ""}`);
  const tech = applyPositiveRules(text, techRules, 40);
  const domain = applyPositiveRules(text, domainRules, 30);
  const career = applyPositiveRules(text, careerRules, 15);
  const techNegatives = applyNegativeRules(text, techNegativeRules);
  const domainNegatives = applyNegativeRules(text, domainNegativeRules);
  const careerNegatives = applyNegativeRules(text, careerNegativeRules);
  const organizationRisks = applyNegativeRules(text, organizationRiskRules, 15);
  const score = clampScore(
    tech.score +
      domain.score +
      career.score +
      techNegatives.score +
      domainNegatives.score +
      careerNegatives.score +
      organizationRisks.score,
  );

  return {
    score,
    recommendation: getRecommendation(score),
    positiveReasons: [...tech.reasons, ...domain.reasons, ...career.reasons],
    negativeReasons: [
      ...techNegatives.reasons,
      ...domainNegatives.reasons,
      ...careerNegatives.reasons,
      ...organizationRisks.reasons,
    ],
  };
}

export function analyzeJobPostings(jobs: JobPosting[]): JobPosting[] {
  return jobs.map((job) => ({
    ...job,
    fit: analyzeJobFit(job),
  }));
}
