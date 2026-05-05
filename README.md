# InPost QA Playwright Tasks

Playwright test tasks for the InPost QA recruitment process.

## Setup

```bash
npm install
npx playwright install chromium
```

Make sure the sandbox app is running locally on port 3000:

```bash
# In the qa-sandbox directory:
npm install
npm run dev
```

## Running tests

```bash
# Run all tasks
npx playwright test

# Run a specific task
npx playwright test tasks/01-login.spec.ts

# Update visual snapshots (task 05)
npx playwright test tasks/05-visual.spec.ts --update-snapshots

# Open HTML report after a run
npx playwright show-report
```

## Tasks

| File | Task | L1 | L2 | L3 |
|------|------|----|----|----|
| `01-login.spec.ts` | Login - warmup, write tests from scratch | ✅ | ✅ | ✅ |
| `02-god-test.spec.ts` | Refactor - split a god test, extract auth, add cleanup | ✅ | ✅ | ✅ |
| `03-bad-selectors.spec.ts` | Debug - find and fix 5 broken tests (+ 1 false green) | - | ✅ | ✅ |
| `04-async.spec.ts` | Async wait - write a stable, non-flaky test | - | ✅ | ✅ |
| `05-visual.spec.ts` | Visual regression - mock API, screenshot, compare | - | - | ✅ |
| `06-api.spec.ts` | API testing - full CRUD suite with edge cases | - | ✅ | ✅ |
