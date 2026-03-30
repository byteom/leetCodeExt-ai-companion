# Contributing to LeetCode AI Companion

Thank you for contributing.

This guide explains how to set up the project, make high-quality changes, and submit pull requests that are easy to review.

## Ways to Contribute

- Report bugs
- Propose features
- Improve prompts and parsing reliability
- Improve UI/UX
- Improve docs
- Help with cross-browser compatibility

## Before You Start

1. Check existing issues and pull requests to avoid duplicate work.
2. Open an issue for large changes before implementation.
3. Keep changes focused. Small, scoped pull requests are easier to review and merge.

## Local Setup

### Prerequisites

- Node.js 18+
- npm
- Chrome/Chromium for testing MV3 output

### Install and run

```bash
npm install
npm run dev
```

### Build and type-check

```bash
npm run compile
npm run build
```

## Branch and Commit Guidance

- Create a dedicated branch per change.
- Prefer clear branch names such as:
  - `feat/add-interview-mode-toggle`
  - `fix/scraper-constraints-parsing`
  - `docs/readme-refresh`
- Write commit messages that clearly describe intent.

Examples:

- `feat: add lazy load retry for pattern feature`
- `fix: handle missing examples in scraper`
- `docs: expand setup and troubleshooting`

## Pull Request Checklist

Before opening a PR:

- [ ] Change is scoped and focused.
- [ ] `npm run compile` passes.
- [ ] `npm run build` succeeds.
- [ ] Manual test completed on a LeetCode problem page.
- [ ] README/CONTRIBUTING updated if behavior changed.
- [ ] Screenshots or short recordings included for UI changes.

In your PR description, include:

- What changed
- Why it changed
- How it was tested
- Any follow-up work

## Manual Testing Guide

Validate at least one scenario for each area you touched:

1. Popup settings
   - Save API key/model/temperature
   - Reopen popup and verify values persist
2. Content script injection
   - Widget appears on `leetcode.com/problems/*`
   - Panel opens/closes correctly
3. Problem sync
   - Title/slug/description/constraints/examples are detected
   - Editor code and language updates are reflected
4. AI tasks
   - At least one feature call succeeds
   - Error handling works when API key is missing
5. Notes/progress
   - Revision note saves and reloads
   - Progress data updates after feature usage

## Codebase Map for Contributors

- `entrypoints/`: Browser entrypoints wired by WXT
- `src/background/`: Runtime message handlers, OpenRouter integration, cache
- `src/content-script/`: React mount and style injection
- `src/components/`: Assistant UI and feature views
- `src/hooks/`: LeetCode page sync + store synchronization
- `src/services/`: Scraper, prompt factory, storage, progress logic
- `src/store/`: Shared assistant state
- `src/utils/`: Types and constants

## Adding a New AI Feature

Use this path to add a feature safely:

1. Define or extend types in `src/utils/types.ts` if new structured output is needed.
2. Add cache TTL and any constants in `src/utils/constants.ts`.
3. Add prompt builder + parser in `src/services/promptFactory.ts`.
4. Add UI tile and rendering logic in `src/components/AssistantPanel.tsx`.
5. Wire loading/error/cache interactions via `assistantStore` methods.
6. Track usage in progress service calls when relevant.
7. Update docs in `README.md`.

## Scraper and Sync Changes

When changing scraping logic:

- Keep selectors resilient to LeetCode DOM changes.
- Handle missing sections gracefully.
- Avoid breaking problem slug detection.
- Validate behavior on multiple problem pages.

When changing sync behavior:

- Avoid aggressive polling.
- Keep state transitions deterministic.
- Ensure slug changes reset problem-scoped view state.

## Prompt and Parsing Quality

For prompt or parser updates:

- Keep prompts explicit about output format.
- Keep parser strict enough to avoid invalid UI state.
- Provide safe fallback messaging when parsing fails.
- Prefer backwards-compatible changes to response schemas.

## Documentation Contributions

Documentation improvements are welcome and valuable.

If you update behavior, update docs in the same PR:

- `README.md` for user/developer-facing behavior
- `CONTRIBUTING.md` for process/workflow updates

## Review Expectations

Maintainers may ask for:

- Additional test evidence
- Reduced PR scope
- Better error handling
- Prompt/parser robustness improvements

Collaborative and respectful discussion is expected from all contributors.