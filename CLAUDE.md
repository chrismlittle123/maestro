# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/claude-code) when working with code in this repository.

## Project Overview

Maestro is a framework for orchestrating AI coding agents that work together like a software team. It uses a layered/clean architecture with three packages.

## Architecture

```
        ┌─────────────────────────────────────┐
        │           Presentation              │  ← CLI (mstr), Slack bot, Web UI
        │         (maestro-agents)            │
        └─────────────────┬───────────────────┘
                          │
        ┌─────────────────▼───────────────────┐
        │           Application               │  ← Use cases, public API
        │       (maestro-agents-sdk)          │
        └─────────────────┬───────────────────┘
                          │
        ┌─────────────────▼───────────────────┘
        │             Domain                  │  ← Business logic, types
        │       (@maestro-agents/core)        │  (internal, not published)
        └─────────────────────────────────────┘
```

### Package Responsibilities

| Package                | Layer        | Purpose                                                          |
| ---------------------- | ------------ | ---------------------------------------------------------------- |
| `@maestro-agents/core` | Domain       | Internal engine: types, Conductor, WorkflowEngine, interfaces    |
| `maestro-agents-sdk`   | Application  | Public API: Maestro class, event subscriptions, workflow control |
| `maestro-agents`       | Presentation | Reference CLI (`mstr`): terminal commands for end users          |

Note: `@maestro-agents/core` is an internal package (not published to npm). It is bundled into `maestro-agents-sdk`.

## Clean Architecture Rules

**These rules are critical. Do not violate them.**

### 1. Dependency Rule

Dependencies MUST point inward only:

- `cli` → `sdk` → `core` (allowed)
- `core` → `sdk` or `core` → `cli` (NEVER)

```typescript
// ✅ Correct: SDK imports from Core
import type { MaestroEvent } from "@maestro-agents/core";

// ❌ Wrong: Core should NEVER import from SDK or CLI
import { Maestro } from "maestro-agents-sdk"; // FORBIDDEN in core
```

### 2. Core Defines Interfaces, Outer Layers Implement

Core defines abstractions. SDK/infrastructure provides concrete implementations.

```typescript
// In @maestro-agents/core - define the interface
export interface AgentExecutor {
  execute(input: AgentExecutionInput): Promise<AgentExecutionOutput>;
}

export interface ArtifactStore {
  save(artifact: Artifact, content: Buffer | string): Promise<void>;
  load(artifactId: string): Promise<Buffer>;
}

// In maestro-agents-sdk or infrastructure - implement it
class ClaudeCodeExecutor implements AgentExecutor { ... }
class FileSystemStore implements ArtifactStore { ... }
class S3Store implements ArtifactStore { ... }
```

### 3. Domain is Framework-Agnostic

Core must NOT know about:

- CLI frameworks (Commander, etc.)
- Specific LLM providers (Claude, GPT)
- Storage backends (filesystem, S3)
- HTTP frameworks
- UI concerns

### 4. No Leaking Implementation Details

SDK exposes a stable public API. Internal core changes should not break SDK consumers.

```typescript
// ✅ SDK re-exports stable types
export type { WorkflowConfig, MaestroEvent } from "@maestro-agents/core";

// SDK provides stable Maestro class that wraps internal complexity
export class Maestro {
  async runWorkflow(name: string, options: { input: string }) { ... }
}
```

## Common Commands

```bash
# Install dependencies
npm install

# Build all packages (order matters: core → sdk → cli)
npm run build

# Run tests
npm test

# Lint
npm run lint

# Format
npm run format
```

## File Locations

- Workflow definitions: `workflows/*.yaml`
- Agent personas: `agents/*.md`
- Core types: `packages/core/src/types/`
- SDK public API: `packages/sdk/src/maestro.ts`
- CLI commands: `packages/cli/src/cli.ts`
