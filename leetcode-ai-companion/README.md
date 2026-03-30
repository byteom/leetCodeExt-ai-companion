# LeetCode AI Companion

Production-grade Chrome extension (WXT + React) that injects an AI assistant on `leetcode.com/problems/*`.

## Run

```bash
npm install
npm run dev
```

Build for Chrome MV3:

```bash
npm run build
```

## Configure

1. Open extension popup.
2. Set your OpenRouter API key.
3. Pick a model (or enter custom model id).
4. Save settings.

## Architecture

- `src/content-script`: floating widget + panel injection + page sync
- `src/background`: OpenRouter proxy, caching, runtime handlers
- `src/popup`: settings UI
- `src/components`: assistant UI modules
- `src/services`: scraping, AI prompting, storage, progress tracking
- `src/store`: assistant state store
- `src/styles`: panel and popup styles
- `src/utils`: shared types/constants/helpers

## Features

- Auto page detection and auto extraction (title, description, constraints, examples, editor code)
- Hint System (3 levels)
- Approach Explainer (Beginner/Advanced)
- Complexity Analyzer (optimal + user code)
- Pseudocode Generator (Low/Medium/High)
- Debug Helper
- Concept Linker
- Code Review Engine
- Context-aware AI Chat
- Reveal Optimal Solution
- Multiple Approaches (Brute Force → Better → Optimal)
- Test Case Generator
- Dry Run Visualizer
- Pattern Recognition (similar problems)
- Revision Mode (notes per problem)
- Progress Tracker + weak areas
- Interview Mode
- Multi-language solution support (C++, Java, Python, JavaScript)