# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the TypeScript app.
- `src/index.ts` is the entry point.
- `src/collectors/` gathers articles and job postings.
- `src/analyzers/` scores job fit.
- `src/formatter/` builds Slack messages.
- `src/notifier/` sends Slack webhooks.
- `src/storage/` reads and writes `data/seen-items.json`.
- `src/config/` holds source lists, constants, and runtime settings.

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npm run typecheck` runs TypeScript checking with `tsc --noEmit`.
- `npm run start` runs the full workflow locally.
- `npm run run:mock` runs with `MOCK_SLACK=true` and `SKIP_STATE_SAVE=true` for safe local validation.

## Coding Style & Naming Conventions
- Use strict TypeScript and keep code compatible with `strict: true`.
- Prefer small, focused functions and explicit types.
- Use `camelCase` for variables and functions, `PascalCase` for types and interfaces, and `kebab-case` for filenames.
- Keep logic in the relevant module area, such as collectors in `src/collectors/` and message formatting in `src/formatter/`.

## Testing Guidelines
- The repository currently relies on `typecheck` and mock execution rather than a dedicated test runner.
- Verify changes with `npm run typecheck` and, when relevant, `npm run run:mock`.
- When adding tests later, name them after the behavior they cover and keep them close to the code they exercise.

## Commit & Pull Request Guidelines
- Use concise Conventional Commit messages when possible, such as `fix(workflow): adjust cron schedule`.
- Keep one logical change per commit.
- PRs should include a short summary, the commands run, and any behavior changes that affect Slack output or `data/seen-items.json`.

## Security & Configuration Tips
- Required secrets: `ARTICLE_SLACK_WEBHOOK_URL` and `JOB_SLACK_WEBHOOK_URL`.
- Avoid committing generated state in `data/seen-items.json` unless that is intentional.
- Use `MOCK_SLACK=true` for local validation without sending messages.
