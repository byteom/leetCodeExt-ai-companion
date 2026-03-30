# LeetCode AI Companion

AI-powered browser extension for LeetCode problem pages. It injects a contextual assistant directly into [leetcode.com/problems/*](https://leetcode.com/problems/) and helps with hints, strategy, debugging, review, dry-runs, and interview practice.

Built with WXT + React + TypeScript.

## Table of Contents

- [What You Get](#what-you-get)
- [Feature Overview](#feature-overview)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Usage Flow](#usage-flow)
- [Available Scripts](#available-scripts)
- [Data, Storage, and Privacy](#data-storage-and-privacy)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## What You Get

- Context-aware assistant panel injected into LeetCode problem pages.
- Prompted AI workflows for common interview prep tasks.
- Support for Python, JavaScript, Java, and C++ flows.
- Per-problem notes and progress tracking.
- Caching + request deduplication to reduce repeated AI calls.

## Feature Overview

The extension includes the following tools:

- Problem Snapshot: Parsed title, description, constraints, examples, and editor code.
- Hint System: Progressive 3-level hint unlocking.
- Approach Explainer: Beginner and advanced strategies.
- Complexity Analysis: Optimal vs current approach discussion.
- Pseudocode Generator: Low, medium, and high detail levels.
- Debug Helper: Analyze your code for likely bug sources and fixes.
- Concept Linker: Identify patterns/concepts and explain each.
- Code Review: Correctness, performance, style, edge cases, and score.
- Reveal Solution: Full explanation and code pack.
- Multi Approaches: Brute force -> better -> optimal path.
- Test Case Generator: Edge and adversarial scenario generation.
- Dry Run: Step-by-step execution walkthrough.
- Pattern Finder: Similar problems and why they match.
- Revision Notes: Per-problem note storage.
- Progress Tracker: Solved count, feature usage, and weak areas.
- AI Chat: Context-aware Q&A for the current problem.
- Interview Mode: Behavior tuned to reduce over-revealing.

## How It Works

1. Content script runs only on `https://leetcode.com/problems/*`.
2. The extension injects a floating widget and assistant panel into a Shadow DOM host.
3. `useProblemSync` continuously extracts problem context (title, description, constraints, examples, editor code, language) and keeps store state fresh.
4. Feature actions generate prompts and call the background runtime API.
5. Background worker sends requests to OpenRouter, caches responses, and returns results.

## Project Structure

```text
entrypoints/
	background.ts        # WXT background entrypoint
	content.ts           # WXT content script entrypoint
	popup/               # WXT popup entrypoint shell

src/
	background/          # AI execution, caching, runtime handlers
	components/          # Assistant panel, root, floating widget UI
	content-script/      # React mount/bootstrap into page
	hooks/               # Problem sync and store hooks
	popup/               # Settings UI
	services/            # AI client, scraper, prompts, storage, progress
	store/               # Assistant store
	styles/              # Panel + popup styles
	utils/               # Shared constants/types/helpers
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Chrome/Chromium (for MV3 build testing)

### Install dependencies

```bash
npm install
```

### Start development build

```bash
npm run dev
```

### Build production output

```bash
npm run build
```

The built extension output is generated in `.output/` (for Chrome MV3, use the generated `chrome-mv3` folder).

### Load unpacked extension in Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the generated Chrome build folder from `.output/`.

## Configuration

Open the extension popup and configure:

- OpenRouter API key
- Base model (from default model list)
- Optional custom model override (`provider/model`)
- Temperature (`0.00` to `1.00`)
- Default language
- Dark mode
- Interview mode default

Effective model selection is:

- `customModel` if provided
- otherwise selected base `model`

## Usage Flow

1. Open any LeetCode problem page.
2. Use the floating widget to open the assistant panel.
3. Select a feature tile.
4. AI features load lazily when opened.
5. Save revision notes and track progress over time.

Notes:

- If API key is missing, the panel shows a warning and AI calls are blocked.
- Non-AI snapshot parsing works without API usage.

## Available Scripts

- `npm run dev`: Start WXT dev workflow.
- `npm run dev:firefox`: Start Firefox dev workflow.
- `npm run build`: Build Chrome output.
- `npm run build:firefox`: Build Firefox output.
- `npm run zip`: Create Chrome zip package.
- `npm run zip:firefox`: Create Firefox zip package.
- `npm run compile`: TypeScript compile check (`tsc --noEmit`).

## Data, Storage, and Privacy

Storage keys currently used:

- `lc_ai_settings_v1` in `browser.storage.sync`
- `lc_ai_progress_v1` in `browser.storage.local`
- `lc_ai_notes_v1` in `browser.storage.local`
- `lc_ai_cache_v1` in `browser.storage.local`

AI request behavior:

- Requests go through the background worker.
- OpenRouter calls are streamed with timeout handling.
- Responses are cached by feature-specific cache keys and TTLs.
- In-flight request deduplication prevents duplicate concurrent calls.

Host permissions:

- `https://leetcode.com/*`
- `https://openrouter.ai/*`

## Troubleshooting

### "Missing OpenRouter API key"

Set your API key in popup settings and save.

### Panel not appearing

- Verify the page URL matches `https://leetcode.com/problems/*`.
- Refresh the page after loading/updating the extension.
- Check if content scripts are enabled for the extension.

### Stale or unexpected AI outputs

- Retry the feature from the UI.
- Change model or temperature in popup settings.
- Reload extension and refresh the page to reset runtime state.

## Contributing

Contributions are welcome.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, development workflow, and pull request guidelines.
