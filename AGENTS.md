# Agent Guidelines

## Planning Documents

- **`PLANNING.md`** — Project-level requirements, design decisions, tech stack, and task breakdown. This is the source of truth for what to build and how.
- **`SPEC.md`** — Module or feature-level specifications, located alongside the code they describe. These are the source of truth for implementation details within that scope.
- **`docs/avalon-rules.md`** — Avalon game rules reference for development and for players. Consult when implementing role logic, win conditions, or player counts.
- **`.context.md`** — Conversation history and technical rationale (git-ignored, local only).
- **`CONTRIBUTING.md`** — Workflow and branching conventions.

Always consult the relevant documents before implementing. Do not implement features or make changes that contradict them.

## Decision Making

- Make minimal assumptions. When a design or technical decision is not already documented, present options and let the user decide.
- Do not introduce new dependencies, patterns, or architectural changes without discussing first.
- If unsure about scope or intent, ask rather than guess.

## Code Style

- **Explicit over implicit**: Name things clearly. Avoid magic values, clever tricks, or hidden behavior.
- **Readable by humans and machines**: Code should be easy to understand for both the developer and AI assistants. Prefer verbose clarity over terse cleverness.
- **Simple over optimized**: Favor straightforward implementations. It is OK to sacrifice performance for simplicity.
- **No premature optimization**: Write clear code first. Optimize only when a measured problem exists.
- **Maintainable**: Small functions, clear responsibilities, minimal coupling.
- Follow the project's ESLint + Prettier configuration.
- Use TypeScript's type system to document intent — prefer explicit types over `any`.
- Comment the "why", not the "what". Do not add obvious or redundant comments.

## Vue Conventions

- Use Vue 3 Composition API with `<script setup lang="ts">`.
- Use VueFire for all Firestore and Auth bindings — do not use raw Firebase SDK listeners in components.
- Keep components small and focused. Extract logic into composables (`src/composables/`) when reused.
- Use Vue Router for navigation. Auth guards protect authenticated routes.
- Use Tailwind CSS utility classes and DaisyUI component classes for styling. Avoid custom CSS unless necessary.

## Workflow

- All changes go through pull requests — never push directly to `main`.
- Follow branch naming conventions in `CONTRIBUTING.md`.
- Keep commits focused — one logical change per commit.
