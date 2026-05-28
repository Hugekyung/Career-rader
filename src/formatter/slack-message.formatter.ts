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
  const lines: string[] = [
    "[Daily Tech Articles]",
    `실행일: ${formatKstDate(new Date())}`,
    "",
  ];

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
    lines.push(
      `:white_check_mark: *${index + 1}. ${truncate(normalizeWhitespace(article.title), 120)}*`,
    );
    lines.push(`- 출처: ${article.source}`);
    lines.push(`- 설명: ${description}`);
    lines.push(`- 링크: ${article.url}`);
    lines.push("");
  });

  lines.push("");
  lines.push("상태");
  lines.push(
    `- 신규 아티클: ${input.articles.length}개 / 최대 ${MAX_DAILY_ARTICLES}개`,
  );
  lines.push("- AI 분석: 비활성화");

  return lines.join("\n");
}

export function formatJobMessage(input: { jobs: JobPosting[] }): string {
  const lines: string[] = [
    "[채용공고 레이더]",
    `실행일: ${formatKstDate(new Date())}`,
    "",
  ];

  if (input.jobs.length === 0) {
    lines.push("신규 Node.js/NestJS 백엔드 채용공고가 없습니다.");
    lines.push("");
    lines.push("상태");
    lines.push("- GitHub Actions 정상 실행");
    lines.push(`- 신규 채용공고: 0개 / 최대 ${MAX_DAILY_JOBS}개`);
    lines.push("- AI 분석: 비활성화");
    lines.push("- 규칙 기반 적합도 점수화: 활성화");
    return lines.join("\n");
  }

  lines.push(`오늘의 Node.js/NestJS 백엔드 채용공고: ${input.jobs.length}개`);
  lines.push("");
  input.jobs.forEach((job, index) => {
    const title = truncate(normalizeWhitespace(job.title), 120);
    const company = job.company
      ? truncate(normalizeWhitespace(job.company), 60)
      : "회사명 없음";
    const platform = job.provider ?? job.source;
    const fit = job.fit;
    const positiveReasons = fit?.positiveReasons.slice(0, 4) ?? [];

    lines.push(`:white_check_mark: *${index + 1}. ${title}*`);
    lines.push(`- 회사: ${company}`);
    lines.push(`- 플랫폼: ${platform}`);
    lines.push(`- 적합도: ${fit?.score ?? 0}/100`);
    lines.push("");
    lines.push("- 매칭 포인트");

    if (positiveReasons.length > 0) {
      positiveReasons.forEach((reason) => {
        lines.push(`  - ${reason}`);
      });
    } else {
      lines.push("  - 주요 매칭 포인트 없음");
    }

    lines.push(`- 링크: ${job.url}`);
    lines.push("");
  });

  lines.push("");
  lines.push("상태");
  lines.push(
    `- 신규 채용공고: ${input.jobs.length}개 / 최대 ${MAX_DAILY_JOBS}개`,
  );
  lines.push("- AI 분석: 비활성화");
  lines.push("- 규칙 기반 적합도 점수화: 활성화");

  return lines.join("\n");
}
