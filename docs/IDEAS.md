# IDEAS

### Problem

We do not have a reliable way to deploy AI coding agents to the cloud.

What we need:

AI Agents to run in the cloud when we are asleep (future feature)

AI Agents to communicate between each other

Long-running tasks with smart memory management

Uses Claude Code under the hood for coding tasks (use Claude Code SDK)

Configurations cannot be changed by coding agents but are read-only

Strict guidelines and "workflows" that agents must follow, defined in config files

Specific Roles for each agent, should cover:

Product Manager (partial automation)
Software Architect (partial automation)
Software Developer (full automation)
Sofware Reviewer (partial automation)
Software Tester QA (partial automation)
Devops Engineer (full automation)

But this should be customisable, according to the engineer's preferred workflow. We need Culture as Code mechanism here. We have code quality and process enforcement tooks (check-my-code) and (check-my-process) which solves part of the problem, but we might need more than just that to help keep as much control as possible of these agents.

Build the BACKEND only

Each engineer can build their own dedicated frontend on top of this backend.

My idea:

Build a great orchestration framework which runs locally FIRST, then start deploying these agents into the cloud after the teething issues have been figured out. Perhaps even have an option for local vs cloud deployment of agents.

---

## Architecture Decisions

### 1. Agent Communication: Message Queue

Agents communicate via a central message broker (Redis pub/sub for cloud, in-memory for local dev).

Why:

- Decoupled - agents don't need to know about each other directly
- Works locally AND in cloud (same abstraction)
- Natural fit for "partial automation" - humans can inject messages too
- Easy to log/replay/debug everything
- Handles async work naturally

```
┌─────────────────────────────────────────┐
│            Message Broker               │
│  (Redis, or in-memory for local dev)    │
└─────────────────────────────────────────┘
     ▲           ▲           ▲
     │           │           │
  Agents      Conductor    Human UI
                           (CLI/Web/Slack)
```

The **Conductor** watches the queue and:

- Routes messages to the right agent
- Enforces workflow rules
- Detects timeouts/failures
- Sends notifications for human review

### 2. Workflow Definition: YAML State Machine

Workflows defined in YAML with clear steps, inputs/outputs, and feedback loops.

```yaml
# Example: workflows/feature-development.yaml
name: feature-development
steps:
  - id: requirements
    agent: product-manager
    automation: partial # requires human approval to proceed
    outputs: [requirements.md]
    next: design

  - id: design
    agent: architect
    automation: partial
    inputs: [requirements.md]
    outputs: [design.md]
    next: implement

  - id: implement
    agent: developer
    automation: full
    inputs: [design.md]
    outputs: [code]
    next: review

  - id: review
    agent: reviewer
    automation: partial
    inputs: [code]
    on_reject: implement # feedback loop
    next: test

  - id: test
    agent: qa
    automation: partial
    on_fail: implement
    next: deploy

  - id: deploy
    agent: devops
    automation: full
```

### 3. Memory & Context: Artifact Storage (S3)

Agents produce artifacts (requirements.md, design.md, etc.) stored in S3 (or local filesystem for local dev).

Why artifacts, not full conversation logs:

- Auditing & compliance: trace back what each agent decided
- Signal over noise: the artifact is the distilled decision, not thousands of tokens of back-and-forth
- Cheap, searchable, browsable
- Can feed artifacts into future runs for consistency

```
s3://maestro-artifacts/
  └── runs/
      └── 2024-12-11-feature-auth/
          ├── manifest.json        # metadata about the run
          ├── 01-requirements.md   # PM output
          ├── 02-design.md         # Architect output
          ├── 03-implementation/   # Developer output (diff or branch ref)
          ├── 04-review.md         # Reviewer feedback
          ├── 05-test-results.json # QA output
          └── 06-deploy-log.txt    # DevOps output
```

The `manifest.json` tracks:

- Which workflow was used
- Timestamps for each step
- Which agent versions ran
- Human approvals (who, when)
- Any failures/retries

### 4. Failure & Timeout Handling

```yaml
# In config
timeouts:
  default: 30m
  implement: 2h
  deploy: 15m

on_timeout:
  notify: [slack, cli]
  action: pause # or: retry, escalate, abort

on_error:
  max_retries: 2
  notify: [slack, cli]
  action: pause_and_surface
```

When something fails:

1. Log the full context
2. Notify user immediately (CLI notification, Slack, etc.)
3. Pause the workflow at that step
4. Let user investigate and either: retry, skip, or abort

### 5. LLM Backend Abstraction

Claude Code SDK is the only supported backend for v1, but the architecture is decoupled via an `AgentExecutor` interface.

```
┌─────────────────────────────────────┐
│         Orchestrator                │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│      AgentExecutor Interface        │
│  (execute, cancel, get_status)      │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│     Claude Code SDK Adapter         │
│     (v1 - only implementation)      │
└─────────────────────────────────────┘
```

Why:

- Decoupled design allows future backends (OpenAI, local models, etc.)
- Claude Code SDK is battle-tested for coding tasks
- Single implementation keeps v1 simple

### 6. Human-in-the-Loop: Step Boundaries Only

Human approval happens only at workflow step boundaries, not mid-task.

Flow:

```
Agent runs → Produces output artifact → Workflow pauses → Human approves → Next step
```

Why:

- Clean mental model
- No mid-task interruption handling
- No pause/resume state complexity
- If an agent needs to present options, it outputs a "decision-request" artifact and the workflow pauses there

### 7. Agent Execution: One Agent Per Step (Sequential)

For v1, workflows execute sequentially with one agent per step. No parallel agent execution.

Why:

- Predictable, easy to debug
- Simple state management
- Parallelism can be added later as an advanced feature

### 8. State Recovery: Resume from Last Completed Step

If the system crashes mid-workflow, it resumes from the last successfully completed step.

Why:

- Simple to implement
- No complex checkpointing or partial state to untangle
- Trade-off: may lose work if an agent was 90% done (acceptable for v1)
- Steps should be designed to be reasonably atomic

### 9. Agent Memory: Stateless Per Run

Agents are stateless - each workflow run starts fresh. Agents only see the current run's artifacts.

Why:

- No identity management or memory persistence layer
- Simpler implementation
- Artifacts provide the "memory" for the current workflow
- Cross-run learning can be added later if needed

### 10. Enforcement: Hard Blocking

When an agent violates workflow rules, the system **hard-blocks** the action rather than just flagging.

Fail closed, not open. Safety over convenience.

### 11. Forbidden Actions

Agents are explicitly forbidden from:

- Deploying to production without manual approval
- Modifying workflow configs or agent prompts
- Accessing secrets directly (must use secrets manager abstraction)
- Running arbitrary shell commands outside a sandbox

These are defined in a `dangerous_actions` config list and enforced by the Conductor.

### 12. Cost & Token Management

Built-in cost tracking with configurable budgets per workflow.

```yaml
# In workflow config
budget:
  max_tokens: 1_000_000
  max_cost_usd: 50.00
  on_exceed: pause # or: abort, notify_and_continue
```

When budget is exceeded:

1. Log the usage
2. Notify via webhook
3. Take configured action (pause/abort)

Prevents runaway agents from burning through API credits.

### 13. Local-First Development

v1 is **local-only**. No cloud deployment.

Why:

- Iron out the kinks before adding cloud complexity
- Faster iteration
- No infrastructure costs during development
- Cloud deployment is a future feature once local is stable

### 14. Notifications: Headless with Webhooks

The backend is headless - it emits events via webhooks. No built-in UI.

```
Backend emits events → POST to webhook URL → Your UI handles display
```

Why:

- Completely decoupled (engineers build their own UI)
- Any UI can subscribe (CLI, Slack bot, web dashboard, VS Code extension)
- Simple to implement
- Backend doesn't need to know about Slack/email/etc

Event types:

- `workflow.started`
- `step.started`, `step.completed`, `step.failed`
- `approval.required`
- `budget.warning`, `budget.exceeded`
- `workflow.completed`, `workflow.failed`

### 15. Artifact & Log Retention: Configurable

Retention periods are configurable per project. Artifacts and logs are diagnostic tools for understanding agent behavior.

```yaml
# In project config
retention:
  artifacts: 90d # or: forever, 30d, etc.
  logs: 30d
  on_expire: archive # or: delete
```

### 16. Conditional Branching in Workflows

Workflows support conditional branching based on step outcomes.

```yaml
steps:
  - id: test
    agent: qa
    on_pass: deploy
    on_fail: implement # loop back

  - id: deploy
    agent: devops
    condition: "{{ test.coverage > 80 }}" # optional guards
```

### 17. Composable Workflows

Workflows can call other workflows (nested composition).

```yaml
steps:
  - id: implement
    agent: developer

  - id: quality-check
    workflow: ./workflows/test-and-lint.yaml # reusable sub-workflow
    inputs: [code]

  - id: deploy
    agent: devops
```

Why:

- Reusable patterns (test suites, deployment pipelines)
- DRY - don't repeat common step sequences
- Easier to maintain

### 18. Dry Run Mode

A `--dry-run` flag that shows what agents would do without executing.

```bash
maestro run feature-development --dry-run
```

Output:

```
DRY RUN - No agents will execute

Step 1: product-manager
  Input: user request
  Output: requirements.md
  Approval: required

Step 2: architect
  Input: requirements.md
  Output: design.md
  Approval: required

...
```

Why:

- Debug workflows before letting agents loose
- Validate workflow config
- Training and documentation

### 19. Agent Persona Definition: Markdown with YAML Frontmatter

Agent prompts and personas are defined in markdown files with YAML frontmatter.

```markdown
# agents/developer.md

---

name: developer
role: Software Developer
automation: full
allowed_actions: [read_files, write_files, run_tests]
forbidden_actions: [deploy, modify_config]

---

## Identity

You are a senior software developer working on {{project_name}}.

## Guidelines

- Follow the design document exactly
- Write tests for all new code
- Use existing patterns in the codebase
- Ask for clarification via artifact output if requirements are ambiguous

## Output Format

Produce a git branch or patch file as your artifact.
```

Why markdown:

- Human-readable and editable
- Version controllable (diff-friendly)
- Frontmatter for structured config (parsed as YAML)
- Body for the actual prompt (supports templates)
- Engineers already know markdown
- Easy to document inline

### 20. Package Architecture: SDK + CLI

Maestro is a **framework**, not just a tool. The architecture has three layers:

```
┌─────────────────────────────────────────────────┐
│  Consumers (what engineers build)               │
│  - Their own CLI tools                          │
│  - REST API servers                             │
│  - Slack bots                                   │
│  - VS Code extensions                           │
│  - Custom dashboards                            │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  @maestro/sdk                                   │
│  - Programmatic interface for builders          │
│  - const maestro = new Maestro(config)          │
│  - maestro.runWorkflow('feature-dev', inputs)   │
│  - maestro.approve(stepId)                      │
│  - maestro.on('step.completed', handler)        │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  @maestro/core                                  │
│  - Workflow engine                              │
│  - Conductor                                    │
│  - Agent executors                              │
│  - Artifact storage                             │
│  - Event bus                                    │
└─────────────────────────────────────────────────┘
```

**What ships in v1:**

| Package         | Description                   | Public?  |
| --------------- | ----------------------------- | -------- |
| `@maestro/core` | The orchestration engine      | Internal |
| `@maestro/sdk`  | Programmatic API for builders | Yes      |
| `maestro` (CLI) | Reference CLI built on SDK    | Yes      |

**Why SDK + CLI:**

- **SDK** lets engineers build custom integrations (Slack bots, dashboards, etc.)
- **CLI** provides quick start, debugging, and dogfoods the SDK
- No HTTP API in v1 - engineers who need one can wrap the SDK themselves

**SDK Example:**

```typescript
import { Maestro } from "@maestro/sdk";

const maestro = new Maestro({
  workflowsDir: "./workflows",
  agentsDir: "./agents",
  artifactsDir: "./artifacts",
});

// Run a workflow
const run = await maestro.runWorkflow("feature-development", {
  input: "Add user authentication",
});

// Listen to events (for building UIs)
maestro.on("step.completed", (event) => {
  console.log(`Step ${event.stepId} completed`);
});

maestro.on("approval.required", (event) => {
  // Show in your UI, send Slack message, etc.
});

// Approve programmatically
await maestro.approve(run.id, "step-123");
```

**CLI Example:**

```bash
# Initialize a project
maestro init

# Run a workflow
maestro run feature-development --input "Add user authentication"

# Check status
maestro status
maestro status <workflow-id>

# Approve a step (human-in-the-loop)
maestro approve <step-id>
maestro reject <step-id> --reason "Needs more tests"

# View logs/artifacts
maestro logs <workflow-id>
maestro artifacts <workflow-id>

# Dry run
maestro run feature-development --dry-run

# List available workflows
maestro workflows
```

### 21. Tech Stack

**Language & Runtime:**

| Aspect          | Choice      | Why                                 |
| --------------- | ----------- | ----------------------------------- |
| Language        | TypeScript  | Type safety, Claude Code SDK native |
| Runtime         | Node.js 22+ | Stable LTS, good performance        |
| Package manager | npm         | Standard, everyone knows it         |

**Project Structure:**

```
maestro/
├── packages/
│   ├── core/        # Orchestration engine (internal)
│   ├── sdk/         # Public SDK
│   └── cli/         # Reference CLI
├── workflows/       # Example workflow definitions
├── agents/          # Example agent personas
└── package.json     # npm workspaces config
```

| Aspect   | Choice         | Why                                |
| -------- | -------------- | ---------------------------------- |
| Monorepo | npm workspaces | Simple, built-in, no extra tooling |

**Config & Validation:**

| Aspect              | Choice      | Why                             |
| ------------------- | ----------- | ------------------------------- |
| Config parsing      | yaml        | Already chosen for workflows    |
| Schema validation   | Zod         | TypeScript-native, great errors |
| Frontmatter parsing | gray-matter | Standard for markdown + YAML    |

**Message Queue:**

| Aspect        | Choice                      | Why                                              |
| ------------- | --------------------------- | ------------------------------------------------ |
| Queue library | BullMQ                      | TypeScript-native, Redis-backed, job persistence |
| Local dev     | In-memory or embedded Redis | Zero setup for getting started                   |

BullMQ over RabbitMQ because:

- Native TypeScript - feels natural in the codebase
- Redis is simple (single binary, Docker one-liner)
- Built-in retries, delays, priorities
- Lighter operational overhead

**Storage:**

| Aspect         | Choice                      | Why                         |
| -------------- | --------------------------- | --------------------------- |
| Local          | File system (`~/.maestro/`) | Simple, no dependencies     |
| Cloud (future) | S3-compatible               | Works with AWS, MinIO, R2   |
| Abstraction    | `ArtifactStore` interface   | Swap implementations easily |

**CLI Tooling:**

| Aspect            | Choice       | Why                              |
| ----------------- | ------------ | -------------------------------- |
| Framework         | Commander.js | Simple, lightweight, widely used |
| Output formatting | chalk        | Colored terminal output          |
| Spinners          | ora          | Progress indicators              |
| Tables            | cli-table3   | Workflow status display          |

**Logging:**

| Aspect     | Choice      | Why                        |
| ---------- | ----------- | -------------------------- |
| Library    | pino        | Fast, structured JSON logs |
| Dev viewer | pino-pretty | Human-readable in terminal |

**Testing:**

| Aspect      | Choice                  | Why                     |
| ----------- | ----------------------- | ----------------------- |
| Test runner | Vitest                  | Fast, native TypeScript |
| E2E         | Vitest + real workflows | Test actual execution   |

**Build & Dev:**

| Aspect     | Choice                      | Why                       |
| ---------- | --------------------------- | ------------------------- |
| Bundler    | tsup                        | Fast, simple, ESM + CJS   |
| Dev mode   | tsx                         | Fast TypeScript execution |
| Linting    | ESLint + @typescript-eslint | Standard                  |
| Formatting | Prettier                    | Standard                  |

---
