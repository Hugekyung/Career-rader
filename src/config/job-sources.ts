import type { JobSource } from "../types/job-source";

export const jobSources: JobSource[] = [
  // {
  //   name: "Zighang",
  //   url: "https://zighang.com/recruitment",
  //   includeUrlPatterns: ["/recruitment/"],
  //   excludeUrlPatterns: ["login", "bookmark", "company"],
  //   maxItems: 30,
  // },
  // {
  //   name: "Wanted",
  //   url: "https://www.wanted.co.kr/wdlist",
  //   includeUrlPatterns: ["/wd/"],
  //   excludeUrlPatterns: ["login", "resume", "events", "company"],
  //   maxItems: 30,
  // },
  {
    name: "JobKorea",
    url: "https://www.jobkorea.co.kr/recruit/joblist?localorder=1&menucode=local",
    includeUrlPatterns: ["/Recruit/GI_Read/"],
    excludeUrlPatterns: ["Login", "Co_Read", "Help"],
    maxItems: 30,
  },
  {
    name: "Saramin",
    url: "https://www.saramin.co.kr/zf_user/jobs/public/list",
    includeUrlPatterns: ["/zf_user/jobs/relay/view", "/zf_user/jobs/view"],
    excludeUrlPatterns: ["login", "company-info", "scrap"],
    maxItems: 30,
  },
];
