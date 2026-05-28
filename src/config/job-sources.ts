import type { JobSource } from "../types/job-source";

export const requiredBackendKeywords = [
  "node.js",
  "nodejs",
  "node",
  "nestjs",
  "nest.js",
  "express",
];

export const excludedNonBackendKeywords = [
  "프론트엔드",
  "frontend",
  "퍼블리셔",
  "디자이너",
  "마케팅",
  "영업",
  "보험",
  "물류",
];

export const jobSources: JobSource[] = [
  {
    name: "JobKorea Node.js",
    provider: "JobKorea",
    url: "https://www.jobkorea.co.kr/Search/?stext=node.js&tabType=recruit&ord=RegDtDesc",
    includeUrlPatterns: ["/Recruit/GI_Read/"],
    excludeUrlPatterns: ["Login", "Co_Read", "Help"],
    requiredKeywords: requiredBackendKeywords,
    excludeKeywords: excludedNonBackendKeywords,
    maxItems: 15,
  },
  {
    name: "JobKorea NestJS",
    provider: "JobKorea",
    url: "https://www.jobkorea.co.kr/Search/?stext=nestjs&tabType=recruit&ord=RegDtDesc",
    includeUrlPatterns: ["/Recruit/GI_Read/"],
    excludeUrlPatterns: ["Login", "Co_Read", "Help"],
    requiredKeywords: requiredBackendKeywords,
    excludeKeywords: excludedNonBackendKeywords,
    maxItems: 15,
  },
  {
    name: "Saramin Node.js",
    provider: "Saramin",
    url: "https://www.saramin.co.kr/zf_user/search/recruit?searchword=node.js&recruitPage=1&recruitSort=reg_dt",
    includeUrlPatterns: ["/zf_user/jobs/relay/view", "/zf_user/jobs/view"],
    excludeUrlPatterns: ["login", "company-info", "scrap"],
    requiredKeywords: requiredBackendKeywords,
    excludeKeywords: excludedNonBackendKeywords,
    maxItems: 15,
  },
  {
    name: "Saramin NestJS",
    provider: "Saramin",
    url: "https://www.saramin.co.kr/zf_user/search/recruit?searchword=nestjs&recruitPage=1&recruitSort=reg_dt",
    includeUrlPatterns: ["/zf_user/jobs/relay/view", "/zf_user/jobs/view"],
    excludeUrlPatterns: ["login", "company-info", "scrap"],
    requiredKeywords: requiredBackendKeywords,
    excludeKeywords: excludedNonBackendKeywords,
    maxItems: 15,
  },
];
