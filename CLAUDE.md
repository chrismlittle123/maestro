# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Maestro is a framework for orchestrating AI coding agents that work together like a software team. It uses a layered/clean architecture with three packages.

## Architecture

```
        ┌─────────────────────────────────────┐
        │           Presentation              │  ← CLI (mstr command)
        │         (maestro-agents)            │
        └─────────────────┬───────────────────┘
                          │
        ┌─────────────────▼───────────────────┐
        │           Application               │  ← Public SDK API
        │       (maestro-agents-sdk)          │
        └─────────────────┬───────────────────┘
                          │
        ┌─────────────────▼───────────────────┐
        │             Domain                  │  ← Business logic, types
        │       (@maestro-agents/core)        │  (internal, bundled into SDK)
        └─────────────────────────────────────┘
```

### Package Responsibilities

| Package                | Layer        | npm Published | Purpose                                             |
| ---------------------- | ------------ | ------------- | --------------------------------------------------- |
| `maestro-agents`       | Presentation | Yes           | CLI (`mstr` command) for end users                  |
| `maestro-agents-sdk`   | Application  | Yes           | Public API: Maestro class, events, workflow control |
| `@maestro-agents/core` | Domain       | No (private)  | Internal engine bundled into SDK                    |

### Key Classes

- **WorkflowEngine** (`packages/core/src/workflow-engine.ts`): Executes workflows step-by-step, manages run state, saves artifacts
- **Maestro** (`packages/sdk/src/maestro.ts`): Main SDK entry point, loads workflows/agents, provides event subscriptions
- **Conductor** (`packages/core/src/conductor.ts`): Central orchestrator for routing and workflow rules
- **EventBus** (`packages/core/src/events/event-bus.ts`): Pub/sub for workflow events (started, completed, failed)

### Data Flow

1. User calls `mstr run <workflow> --input "..."` or SDK's `maestro.runWorkflow()`
2. SDK loads workflow YAML and agent markdown files
3. WorkflowEngine executes each step via AgentExecutor
4. Artifacts saved to `~/.maestro/artifacts/<run-id>/`
5. Events emitted through EventBus for subscribers

## Clean Architecture Rules

**These rules are critical. Do not violate them.**

### Dependency Rule

Dependencies MUST point inward only:

- `cli` → `sdk` → `core` ✅
- `core` → `sdk` or `core` → `cli` ❌ NEVER

```typescript
// ✅ SDK imports from Core
import type { MaestroEvent } from "@maestro-agents/core";

// ❌ Core must NEVER import from SDK or CLI
import { Maestro } from "maestro-agents-sdk"; // FORBIDDEN in core
```

### Core is Framework-Agnostic

Core must NOT know about CLI frameworks, specific LLM providers, storage backends, or HTTP frameworks.

## Commands

```bash
# Install and build
npm install
npm run build

# Run all tests (unit only)
npm test

# Run e2e tests
npm run test:e2e

# Run a single test file
npx vitest run tests/unit/core/workflow-parser.test.ts

# Run tests matching a pattern
npx vitest run -t "parseWorkflow"

# Watch mode
npm run test:watch

# Lint and format
npm run lint
npm run format

# Type check
npm run typecheck
```

## Release Process

Uses changesets with OIDC Trusted Publishing (no NPM_TOKEN needed):

```bash
# Create a changeset
npx changeset

# Changesets are automatically processed on push to main:
# 1. Version bump + CHANGELOG update
# 2. Publish to npm via OIDC
# 3. Git tag + GitHub Release created
```

## File Locations

- **Workflow definitions**: `workflows/*.yaml`
- **Agent personas**: `agents/*.md`
- **Core types**: `packages/core/src/types/`
- **SDK public API**: `packages/sdk/src/maestro.ts`
- **CLI commands**: `packages/cli/src/commands/`
- **E2E test fixtures**: `tests/e2e/projects/`
