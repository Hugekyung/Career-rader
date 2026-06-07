# Repository Guidelines

## Project Structure & Module Organization
- `src/index.ts` is the runtime entry point.
- `src/collectors/` handles DevDay, RSS, and job-source collection.
- `src/analyzers/` contains job-fit scoring logic.
- `src/formatter/` builds Slack payload text.
- `src/notifier/` sends Slack webhooks.
- `src/storage/` loads and saves `data/seen-items.json`.
- `src/config/` holds source lists, constants, and manual URL fallbacks.
- `.github/workflows/daily-career-radar.yml` is the scheduled GitHub Actions workflow.

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npm run typecheck` runs TypeScript validation with `tsc --noEmit`.
- `npm run start` runs the full collection and Slack delivery flow.
- `npm run run:mock` runs locally with `MOCK_SLACK=true` and `SKIP_STATE_SAVE=true` for safe smoke checks.

## Coding Style & Naming Conventions
- Use strict TypeScript and keep code compatible with `strict: true`.
- Prefer small, explicit functions and narrow types over broad utility helpers.
- Use `camelCase` for variables/functions, `PascalCase` for types/interfaces, and `kebab-case` for filenames.
- Keep modules close to their responsibility; for example, source-specific logic belongs in `src/collectors/` or `src/config/`, not `src/index.ts`.

## Testing & Verification
- The repo does not currently include a dedicated test runner.
- Validate code changes with `npm run typecheck`.
- Use `npm run run:mock` when you need to verify message formatting, state handling, or collector flow without sending Slack messages.
- For changes affecting GitHub Actions or persistence, confirm the workflow file and `data/seen-items.json` behavior together.

## Commit & Pull Request Guidelines
- Use concise Conventional Commit messages when possible, such as `fix(workflow): adjust cron schedule`.
- Keep one logical change per commit.
- PRs should summarize the behavior change, the commands run, and any impact to Slack output or `data/seen-items.json`.

## Security & Configuration Tips
- Required secrets: `ARTICLE_SLACK_WEBHOOK_URL` and `JOB_SLACK_WEBHOOK_URL`.
- Avoid committing generated state in `data/seen-items.json` unless that is intentional.
- Use `MOCK_SLACK=true` for local validation without sending messages.
