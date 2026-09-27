# Copilot instructions

## Build, test, and lint

- `npm run dev` starts the Next.js development server on port 3100.
- `npm run build` builds the production app; `npm start` serves it on port 3100.
- `npm run lint` runs the configured Next.js ESLint checks.
- `npx vitest run` runs all tests. To run one test file, use `npx vitest run src/components/timer.test.tsx` or `npx vitest run src/components/workerTimer.test.ts`.
- Vitest uses jsdom and discovers `src/**/*.test.ts` and `src/**/*.test.tsx`; there is no separate test script in `package.json`.

## Architecture

- This is a Next.js 15 App Router app. `src/app/layout.tsx` provides the root document, fonts, global CSS, and metadata; `src/app/page.tsx` renders the timer as the home page.
- `src/components/timer.tsx` is the client-side Pomodoro state machine. It owns countdown display and focus/short-break/long-break transitions, with configurable durations and focus-session count.
- The timer creates `src/components/workerTimer.js` as a Web Worker. The worker emits periodic `tick` messages; the React component decrements its displayed time only while running. Keep timer/session state and UI transitions in the component, and the worker limited to interval scheduling.
- Timer completion sounds are played through `react-sounds`. The component tests mock this integration and the Worker; worker scheduling behavior is tested separately in `workerTimer.test.ts`.
- Tailwind CSS v4 is loaded through `src/app/globals.css` and `@tailwindcss/postcss`.

## Repository conventions

- TypeScript is strict, with the `@/*` import alias mapped to `src/*`. Use typed React/Next.js modules; the timer's public configuration is expressed as optional `TimerProps`.
- The timer module exports `SessionState` for use in tests; its internal running/paused/stopped state remains private to the component.
- Keep tests beside the component or worker they cover, using Vitest and Testing Library for UI behavior. Worker tests exercise the worker script in a simulated worker scope.
- ESLint is configured with `next/core-web-vitals` and `next/typescript`. The current lint run reports a missing-dependencies warning in the timer effect and an unused disable directive in the worker test; do not treat these warnings as intentional project conventions.
