# Improve Task: Node.js/NestJS 백엔드 채용공고 정밀 수집 및 적합도 점수화

## 0. 목표

현재 채용공고 수집은 JobKorea/Saramin의 일반 목록에서 최신 공고를 가져온다.

이번 개선의 목표는 아래와 같다.

- JobKorea/Saramin 검색 URL 기반으로 수집 범위를 Node.js/NestJS 백엔드 포지션으로 좁힌다.
- 각 채널에서 최신순으로 최대 15개씩 후보를 가져온다.
- 채용회사가 같으면 중복으로 보고 중복 데이터를 제거한다.
- Node.js/NestJS 백엔드 키워드 필터를 우선 적용한다.
- Node.js/NestJS 명시 공고가 30개 미만이면 백엔드/서버 개발 포지션으로 남은 개수를 보충한다.
- 상세 페이지 본문을 추출한다.
- OpenAI 없이 규칙 기반 적합도 점수를 계산한다.
- Slack 채용공고 메시지를 적합도 중심으로 개선한다.

## 1. 유지할 제약

- GitHub Actions workflow는 하나로 유지한다.
- Slack 채널 분리 구조는 유지한다.
- OpenAI API는 사용하지 않는다.
- DB는 사용하지 않는다.
- Playwright/Puppeteer는 이번 작업에 포함하지 않는다.
- 로그인 기반 접근은 하지 않는다.
- 상세 JD 본문은 Slack 메시지 생성에만 사용하고 별도 저장하지 않는다.
- `data/seen-items.json`에는 기존처럼 URL과 `seenAt`만 저장한다.

## 2. 채용공고 소스 변경

### 2.1 JobKorea

기존 일반 목록 URL을 제거하고 검색 URL을 사용한다.

```txt
https://www.jobkorea.co.kr/Search/?stext=node.js&tabType=recruit&ord=RegDtDesc
https://www.jobkorea.co.kr/Search/?stext=nestjs&tabType=recruit&ord=RegDtDesc
```

각 URL은 최신 등록순 기준으로 사용한다.

### 2.2 Saramin

Saramin도 검색 URL 기반으로 전환한다.

예상 URL은 실제 HTML 수집 가능 여부 확인 후 확정한다.

```txt
https://www.saramin.co.kr/zf_user/search/recruit?searchword=node.js&recruitPage=1&recruitSort=reg_dt
https://www.saramin.co.kr/zf_user/search/recruit?searchword=nestjs&recruitPage=1&recruitSort=reg_dt
```

Saramin의 정렬 파라미터가 다르면 실제 최신순 URL로 조정한다.

### 2.3 수집 개수

- JobKorea 계열 source 전체에서 최대 15개
- Saramin 계열 source 전체에서 최대 15개
- 전체 최대 30개
- Node.js/NestJS 필터 결과가 30개 미만이면 백엔드/서버 개발 포지션으로 보충한다.
- 보충 후에도 30개 미만이면 있는 것만 Slack으로 보낸다.

## 3. 타입 변경

### 3.1 `src/types/job-source.ts`

`JobSource`를 아래 필드까지 확장한다.

```ts
export interface JobSource {
  name: string;
  company?: string;
  provider?: "JobKorea" | "Saramin" | "Manual";
  url: string;
  includeUrlPatterns: string[];
  excludeUrlPatterns?: string[];
  requiredKeywords?: string[];
  excludeKeywords?: string[];
  maxItems?: number;
}
```

### 3.2 `src/types/job-posting.ts`

상세 본문과 분석 결과를 담을 수 있게 확장한다.

```ts
export interface JobPosting {
  id: string;
  source: string;
  provider?: "JobKorea" | "Saramin" | "Manual";
  title: string;
  company?: string;
  url: string;
  sourceUrl?: string;
  detailText?: string;
  fit?: JobFitAnalysis;
  collectedAt: string;
}
```

신규 타입:

```ts
export type JobRecommendation = "적극 지원" | "우선 검토" | "조건부 검토" | "스킵";

export interface JobFitAnalysis {
  score: number;
  recommendation: JobRecommendation;
  positiveReasons: string[];
  negativeReasons: string[];
}
```

별도 파일로 분리해도 된다.

```txt
src/types/job-fit.ts
```

## 4. 수집 로직 개선

### 4.1 `src/config/job-sources.ts`

기존 JobKorea/Saramin 일반 source를 검색 source로 교체한다.

예상 설정:

```ts
export const jobSources: JobSource[] = [
  {
    name: "JobKorea Node.js",
    provider: "JobKorea",
    url: "https://www.jobkorea.co.kr/Search/?stext=node.js&tabType=recruit&ord=RegDtDesc",
    includeUrlPatterns: ["/Recruit/GI_Read/"],
    excludeUrlPatterns: ["Login", "Co_Read", "Help"],
    requiredKeywords: ["node.js", "nodejs", "node", "nestjs", "nest.js", "백엔드", "backend", "서버"],
    excludeKeywords: ["프론트엔드", "frontend", "퍼블리셔", "디자이너", "마케팅", "영업", "보험", "물류"],
    maxItems: 15,
  },
  {
    name: "JobKorea NestJS",
    provider: "JobKorea",
    url: "https://www.jobkorea.co.kr/Search/?stext=nestjs&tabType=recruit&ord=RegDtDesc",
    includeUrlPatterns: ["/Recruit/GI_Read/"],
    excludeUrlPatterns: ["Login", "Co_Read", "Help"],
    requiredKeywords: ["node.js", "nodejs", "node", "nestjs", "nest.js", "백엔드", "backend", "서버"],
    excludeKeywords: ["프론트엔드", "frontend", "퍼블리셔", "디자이너", "마케팅", "영업", "보험", "물류"],
    maxItems: 15,
  },
  {
    name: "Saramin Node.js",
    provider: "Saramin",
    url: "https://www.saramin.co.kr/zf_user/search/recruit?searchword=node.js&recruitPage=1&recruitSort=reg_dt",
    includeUrlPatterns: ["/zf_user/jobs/relay/view", "/zf_user/jobs/view"],
    excludeUrlPatterns: ["login", "company-info", "scrap"],
    requiredKeywords: ["node.js", "nodejs", "node", "nestjs", "nest.js", "백엔드", "backend", "서버"],
    excludeKeywords: ["프론트엔드", "frontend", "퍼블리셔", "디자이너", "마케팅", "영업", "보험", "물류"],
    maxItems: 15,
  },
  {
    name: "Saramin NestJS",
    provider: "Saramin",
    url: "https://www.saramin.co.kr/zf_user/search/recruit?searchword=nestjs&recruitPage=1&recruitSort=reg_dt",
    includeUrlPatterns: ["/zf_user/jobs/relay/view", "/zf_user/jobs/view"],
    excludeUrlPatterns: ["login", "company-info", "scrap"],
    requiredKeywords: ["node.js", "nodejs", "node", "nestjs", "nest.js", "백엔드", "backend", "서버"],
    excludeKeywords: ["프론트엔드", "frontend", "퍼블리셔", "디자이너", "마케팅", "영업", "보험", "물류"],
    maxItems: 15,
  },
];
```

### 4.2 키워드 필터

`job-source.collector.ts`에 아래 유틸을 추가한다.

```ts
function normalizeForKeyword(input: string): string;
function includesAnyKeyword(text: string, keywords?: string[]): boolean;
function includesNoExcludedKeyword(text: string, keywords?: string[]): boolean;
```

초기 후보 필터는 목록에서 얻은 제목 텍스트 기준으로 적용한다.

조건:

- `requiredKeywords` 중 하나 이상 포함
- `excludeKeywords` 중 하나도 포함하지 않음

단, 상세 페이지 추출 후에는 `title + detailText` 기준으로 한 번 더 필터링한다.

### 4.3 회사명 기반 중복 제거

채용회사가 같으면 중복으로 본다.

구현 위치:

- `src/index.ts` 내부 helper
- 또는 `src/utils/jobs.ts`

예상 함수:

```ts
function uniqueJobsByCompany(items: JobPosting[]): JobPosting[] {
  const seen = new Set<string>();
  const result: JobPosting[] = [];

  for (const item of items) {
    const key = normalizeCompanyName(item.company);

    if (!key) {
      result.push(item);
      continue;
    }

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}
```

회사명이 없는 경우 URL 기준 중복만 적용한다.

회사명 추출이 목록에서 어렵다면 상세 페이지에서 추출한다.

## 5. 상세 페이지 본문 추출

### 5.1 신규 collector 추가

파일:

```txt
src/collectors/job-detail.collector.ts
```

역할:

```txt
1. 신규 채용공고 후보 URL에 axios 요청
2. cheerio로 HTML 파싱
3. script/style/nav/footer 등 제거
4. 본문 후보 selector 우선 추출
5. selector 실패 시 body text fallback
6. 공백 normalize
7. 너무 긴 텍스트는 8,000~12,000자 정도로 truncate
8. 실패 시 detailText 없이 계속 진행
```

### 5.2 provider별 selector 후보

JobKorea:

```txt
.artReadJobSum
.tbList
.artReadDetail
.devTplLyClick
.job-detail
body
```

Saramin:

```txt
.jv_cont
.jv_summary
.job_view_content
.cont_recruit
body
```

정확한 selector는 실제 HTML 확인 후 조정한다.

### 5.3 상세 추출 적용 위치

`src/index.ts`에서 신규 후보에 대해서만 수행한다.

순서:

```txt
목록 수집
→ URL 중복 제거
→ seen 제거
→ 목록 제목 기준 1차 필터
→ 상세 페이지 본문 추출
→ title + detailText 기준 Node.js/NestJS 1순위 후보 분리
→ 30개 미만이면 백엔드/서버 포지션으로 보충
→ 회사명 중복 제거
→ 적합도 분석
→ 점수 높은 순 정렬
→ 최대 30개
```

주의:

- 상세 페이지 요청은 최대 후보 수를 제한한 뒤 수행한다.
- 예: source별 최대 15개, 전체 상세 fetch 최대 40개.
- 너무 많은 상세 페이지 요청으로 Actions 시간이 늘어나지 않게 한다.

## 6. 규칙 기반 적합도 점수화

### 6.1 신규 analyzer 추가

파일:

```txt
src/analyzers/job-fit.analyzer.ts
```

입력:

```ts
analyzeJobFit(job: JobPosting): JobFitAnalysis
```

분석 텍스트:

```ts
const jdText = `${job.title} ${job.company ?? ""} ${job.detailText ?? ""}`;
```

normalize:

```txt
lowercase
공백 normalize
특수문자 일부 정규화
node js → node.js
nest js → nest.js
```

### 6.2 점수 구조

- 최대 점수: 100점
- 0~100 clamp
- keyword 기반 rule scoring
- 동일 category 중복 점수 허용하지 않음

카테고리:

1. 기술스택 매칭: 최대 40점
2. 도메인/업무 매칭: 최대 30점
3. 커리어 방향성 매칭: 최대 15점
4. 조직/근무 리스크 감점: 최대 -15점

### 6.3 기술스택 점수

```txt
Node.js                +20
NestJS                 +20
TypeScript             +15
MySQL/PostgreSQL       +10
Redis                  +10
AWS                    +10
Docker                 +8
RabbitMQ/Kafka         +8
REST API               +8
```

추가 가산점:

```txt
MSA/Event Driven       +10
대용량 트래픽           +10
성능 개선               +10
데이터 정합성           +10
운영 자동화             +10
외부 API 연동           +8
```

감점:

```txt
Java/Spring ONLY       -20
PHP/Laravel ONLY       -15
.NET ONLY              -15
Frontend Main          -20
React/Vue 중심         -15
iOS/Android 중심       -20
```

주의:

- Node.js + Spring 혼합이면 감점하지 않는다.
- ONLY 느낌일 때만 감점한다.

### 6.4 도메인/업무 점수

```txt
커머스                +15
결제/정산              +15
플랫폼 서비스          +12
구독 서비스            +10
CRM/마케팅 자동화      +10
운영 자동화            +12
백오피스 시스템        +10
B2B SaaS               +10
```

추가 가산점:

```txt
API 최적화             +8
배치/스케줄러          +8
비동기 처리            +8
메시지 큐              +8
모니터링/운영          +8
장애 대응              +8
```

감점:

```txt
SI/상주                -15
파견                   -15
유지보수 위주          -10
퍼블리싱 위주          -15
단순 홈페이지 제작      -20
```

### 6.5 커리어 방향성 점수

```txt
AI 활용 서비스          +10
AI 자동화               +10
플랫폼 확장성           +8
데이터 기반 의사결정    +8
DevOps 문화             +8
기술 투자 문화          +8
```

감점:

```txt
레거시 유지보수 ONLY    -15
기술 변화 거의 없음     -10
구형 PHP/온프레 ONLY    -10
```

### 6.6 조직/근무 리스크 감점

```txt
상주                   -15
야근 잦음 암시          -10
군대식 문화 암시        -10
연봉 불명확             -5
복지 거의 없음          -5
기술스택 불명확         -5
```

### 6.7 판정 기준

```txt
85~100  → 적극 지원
70~84   → 우선 검토
55~69   → 조건부 검토
0~54    → 스킵
```

### 6.8 응답 데이터

```ts
{
  score: number;
  recommendation: "적극 지원" | "우선 검토" | "조건부 검토" | "스킵";
  positiveReasons: string[];
  negativeReasons: string[];
}
```

## 7. Slack 메시지 개선

### 7.1 포맷 변경

`formatJobMessage`를 아래 형태로 바꾼다.

```txt
[채용공고 레이더]
실행일: YYYY-MM-DD HH:mm KST

오늘의 Node.js/NestJS 백엔드 채용공고: N개

1. Backend Engineer - Example Corp

적합도: 88/100
판정: 적극 지원

매칭 포인트
- Node.js/NestJS 기반
- 커머스/결제 도메인
- Redis/AWS 사용
- 이벤트 기반 처리 구조

주의 포인트
- Kubernetes 경험 우대
- 영어 문서 커뮤니케이션 가능성 있음

링크:
https://...
```

### 7.2 출력 제한

Slack 메시지가 길어지지 않게 아래 제한을 둔다.

- 제목: 120자
- 매칭 포인트: 최대 4개
- 주의 포인트: 최대 3개
- 공고 개수: 최대 30개
- 상세 JD 원문은 Slack에 포함하지 않음

### 7.3 정렬

최종 Slack 메시지는 아래 순서로 정렬한다.

1. 적합도 점수 내림차순
2. 점수가 같으면 수집 순서 유지

단, 사용자가 최신순을 더 중요하게 볼 경우 아래 정책으로 전환 가능하다.

```txt
1. 최신순 유지
2. 각 항목에 점수 표시
```

이번 작업에서는 점수 높은 순을 기본으로 한다.

## 8. 구현 순서

1. `src/types/job-fit.ts` 추가
2. `src/types/job-posting.ts` 확장
3. `src/types/job-source.ts` 확장
4. `src/config/job-sources.ts`를 JobKorea/Saramin 검색 URL 기반으로 변경
5. `job-source.collector.ts`에 provider, keyword filter, source별 limit 적용
6. 회사명 normalize 및 회사명 기준 중복 제거 유틸 추가
7. `src/collectors/job-detail.collector.ts` 추가
8. `src/analyzers/job-fit.analyzer.ts` 추가
9. `src/index.ts` 채용공고 flow 변경
10. `formatJobMessage` Slack 포맷 변경
11. README/TASK에 변경사항 반영
12. `npm run typecheck` 실행
13. `npm run run:mock` 실행

## 9. 최종 채용공고 flow

```txt
JobKorea/Saramin 검색 URL 수집
  ↓
URL 기준 중복 제거
  ↓
seenJobs 기준 기존 발송 제거
  ↓
제목 기반 Node.js/NestJS 백엔드 키워드 필터
  ↓
상세 페이지 본문 추출
  ↓
제목 + 상세 본문 기반 2차 키워드 필터
  ↓
채용회사 기준 중복 제거
  ↓
규칙 기반 적합도 점수 계산
  ↓
점수 높은 순 정렬
  ↓
최대 30개 Slack 발송
  ↓
성공 시 seenJobs 업데이트
```

## 10. 완료 기준

- JobKorea/Saramin 일반 목록 공고가 더 이상 섞이지 않는다.
- Slack 채용공고 메시지는 Node.js/NestJS 백엔드 후보만 포함한다.
- 각 source provider에서 최대 15개씩 후보를 수집한다.
- 회사명이 같은 공고는 하나만 남는다.
- 상세 페이지 본문 추출 실패 시에도 전체 실행은 계속된다.
- 각 공고에 적합도 점수와 판정이 표시된다.
- 매칭 포인트와 주의 포인트가 표시된다.
- 신규 공고가 30개 미만이면 있는 것만 발송한다.
- `npm run typecheck`가 성공한다.
- `npm run run:mock`에서 채용공고 메시지 포맷을 확인할 수 있다.

## 11. 직행/Zighang 동적 렌더링 대응은 별도 Task

직행 같은 사이트는 초기 HTML에 공고 목록이 없고 브라우저 JavaScript 실행 후 목록이 렌더링될 수 있다.

현재 `axios + cheerio` 방식은 JavaScript를 실행하지 않기 때문에 이런 사이트를 안정적으로 수집하기 어렵다.

가능한 접근:

1. 공개 API endpoint 탐색
   - 브라우저 개발자도구 Network 탭에서 공고 목록 API를 확인한다.
   - 인증 없이 호출 가능하면 별도 axios adapter로 구현한다.
   - 가장 안정적이고 가벼운 방식이다.

2. Playwright/Puppeteer 도입
   - 실제 Chromium을 띄워 JS 렌더링 후 DOM을 읽는다.
   - GitHub Actions에서 가능하지만 유지보수 비용이 증가한다.
   - 실행 시간이 늘고, selector 변경과 봇 차단에 취약하다.
   - 캡차, 로그인, 무한 스크롤, 차단 정책 대응이 필요할 수 있다.

이번 개선에서는 JobKorea/Saramin 검색 URL 기반 수집을 먼저 안정화하고, Zighang은 별도 조사 및 adapter Task로 분리한다.
