import { MAX_DAILY_ARTICLES, MAX_DAILY_JOBS } from "../config/constants";
import type { Article } from "../types/article";
import type { JobPosting } from "../types/job-posting";
import { normalizeWhitespace, truncate } from "../utils/text";

function formatKstDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  return `${parts} KST`;
}

export function formatArticleMessage(input: { articles: Article[] }): string {
  const lines: string[] = ["[Daily Tech Articles]", `실행일: ${formatKstDate(new Date())}`, ""];

  if (input.articles.length === 0) {
    lines.push("신규 기술 아티클이 없습니다.");
    lines.push("");
    lines.push("상태");
    lines.push("- GitHub Actions 정상 실행");
    lines.push(`- 신규 아티클: 0개 / 최대 ${MAX_DAILY_ARTICLES}개`);
    lines.push("- AI 분석: 비활성화");
    return lines.join("\n");
  }

  lines.push(`오늘의 기술 아티클: ${input.articles.length}개`);
  input.articles.forEach((article, index) => {
    const description = article.description
      ? truncate(normalizeWhitespace(article.description), 100)
      : "없음";
    lines.push(`${index + 1}. ${truncate(normalizeWhitespace(article.title), 120)}`);
    lines.push(`- 출처: ${article.source}`);
    lines.push(`- 설명: ${description}`);
    lines.push(`- 링크: ${article.url}`);
  });

  lines.push("");
  lines.push("상태");
  lines.push(`- 신규 아티클: ${input.articles.length}개 / 최대 ${MAX_DAILY_ARTICLES}개`);
  lines.push("- AI 분석: 비활성화");

  return lines.join("\n");
}

export function formatJobMessage(input: { jobs: JobPosting[] }): string {
  const lines: string[] = ["[Daily Job Radar]", `실행일: ${formatKstDate(new Date())}`, ""];

  if (input.jobs.length === 0) {
    lines.push("신규 채용공고가 없습니다.");
    lines.push("");
    lines.push("상태");
    lines.push("- GitHub Actions 정상 실행");
    lines.push(`- 신규 채용공고: 0개 / 최대 ${MAX_DAILY_JOBS}개`);
    lines.push("- AI 분석: 비활성화");
    return lines.join("\n");
  }

  lines.push(`오늘의 채용공고: ${input.jobs.length}개`);
  input.jobs.forEach((job, index) => {
    lines.push(`${index + 1}. ${truncate(normalizeWhitespace(job.title), 120)}`);
    lines.push(`- 회사: ${job.company ?? "없음"}`);
    lines.push(`- 출처: ${job.source}`);
    lines.push(`- 링크: ${job.url}`);
  });

  lines.push("");
  lines.push("상태");
  lines.push(`- 신규 채용공고: ${input.jobs.length}개 / 최대 ${MAX_DAILY_JOBS}개`);
  lines.push("- AI 분석: 비활성화");

  return lines.join("\n");
}
