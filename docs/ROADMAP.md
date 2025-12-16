## Roadmap

### v0.1.0 - Foundation (MVP)

**Goal:** Run a single workflow with one agent, end-to-end.

**Core:**

- [ ] Project scaffolding (npm workspaces)
- [ ] Basic `@maestro/core` structure
- [ ] Workflow YAML parser with Zod validation
- [ ] Agent markdown parser (gray-matter)
- [ ] In-memory event bus (no Redis yet)
- [ ] File system artifact storage (`~/.maestro/`)
- [ ] Basic manifest.json generation

**Agent Execution:**

- [ ] `AgentExecutor` interface
- [ ] Claude Code SDK adapter (single implementation)
- [ ] Execute one agent, capture output as artifact

**CLI:**

- [ ] `maestro init` - scaffold a project
- [ ] `maestro run <workflow>` - run a workflow
- [ ] `maestro status` - show current workflow state
- [ ] Basic terminal output (chalk + ora)

**Constraints:**

- Single agent per workflow (no multi-step yet)
- No approvals (full automation only)
- No error recovery
- Local only

---

### v0.2.0 - Multi-Step Workflows

**Goal:** Chain multiple agents together in a workflow.

**Core:**

- [ ] Sequential step execution
- [ ] Pass artifacts between steps (inputs/outputs)
- [ ] Step state tracking (pending, running, completed, failed)
- [ ] Basic workflow state persistence (resume after restart)

**CLI:**

- [ ] `maestro logs <workflow-id>` - view logs
- [ ] `maestro artifacts <workflow-id>` - list/view artifacts
- [ ] Show step progress in terminal

**Example Agents:**

- [ ] `developer` agent persona
- [ ] `reviewer` agent persona

---

### v0.3.0 - Human-in-the-Loop

**Goal:** Pause workflows for human approval.

**Core:**

- [ ] `automation: partial` support in workflow steps
- [ ] Workflow pauses at approval points
- [ ] Approval state persistence

**CLI:**

- [ ] `maestro approve <step-id>` - approve and continue
- [ ] `maestro reject <step-id> --reason "..."` - reject with feedback
- [ ] `maestro pending` - list steps waiting for approval
- [ ] Terminal notifications when approval needed

---

### v0.4.0 - Error Handling & Recovery

**Goal:** Graceful failure handling.

**Core:**

- [ ] Timeout configuration per step
- [ ] `on_error` handling (retry, pause, abort)
- [ ] `max_retries` support
- [ ] Error logging with full context
- [ ] Resume from last completed step after crash

**CLI:**

- [ ] `maestro retry <step-id>` - retry a failed step
- [ ] `maestro abort <workflow-id>` - cancel a workflow
- [ ] `maestro skip <step-id>` - skip and continue
- [ ] Show error details in status

---

### v0.5.0 - Conditional Branching

**Goal:** Workflows that adapt based on outcomes.

**Core:**

- [ ] `on_pass` / `on_fail` branching
- [ ] `on_reject` feedback loops (back to previous step)
- [ ] `condition` guards with template expressions
- [ ] Loop detection (prevent infinite cycles)

**Example Workflow:**

- [ ] `feature-development.yaml` with full review loop

---

### v1.0.0 - Production Ready (Local)

**Goal:** Stable, feature-complete local orchestration.

**Core:**

- [ ] BullMQ integration (Redis-backed queue)
- [ ] Webhook notifications (events → HTTP POST)
- [ ] Cost/token tracking per workflow
- [ ] Budget limits with `on_exceed` actions
- [ ] Dry run mode (`--dry-run`)
- [ ] Forbidden actions enforcement (hard blocking)

**SDK:**

- [ ] `@maestro/sdk` package (public API)
- [ ] Event subscription (`maestro.on('event', handler)`)
- [ ] Programmatic workflow control
- [ ] Full TypeScript types

**CLI:**

- [ ] `maestro workflows` - list available workflows
- [ ] `maestro agents` - list available agents
- [ ] `maestro run --dry-run` - preview without executing
- [ ] `maestro config` - show/edit configuration

**Docs:**

- [ ] Getting started guide
- [ ] Workflow authoring guide
- [ ] Agent persona guide
- [ ] SDK reference

**Quality:**

- [ ] 80%+ test coverage on core
- [ ] E2E tests with real workflows
- [ ] CI/CD pipeline

---

### v1.1.0 - Composable Workflows

**Goal:** Reusable workflow patterns.

- [ ] Nested workflows (`workflow:` step type)
- [ ] Workflow inputs/outputs
- [ ] Shared artifact references across sub-workflows

---

### v1.2.0 - Enhanced Observability

**Goal:** Deep visibility into agent behavior.

- [ ] Structured logging with correlation IDs
- [ ] Token usage breakdown per step
- [ ] Artifact diff viewer (before/after)
- [ ] Workflow timeline visualization (data for UIs)

---

### v1.3.0 - Retention & Cleanup

**Goal:** Manage storage over time.

- [ ] Configurable artifact retention (`retention.artifacts`)
- [ ] Configurable log retention (`retention.logs`)
- [ ] `maestro cleanup` command
- [ ] Auto-cleanup daemon (optional)
- [ ] Archive vs delete options

---

### v2.0.0 - Cloud Deployment

**Goal:** Run agents in the cloud.

- [ ] S3 artifact storage adapter
- [ ] Redis/cloud message broker
- [ ] Agent execution in cloud containers
- [ ] Remote workflow triggers (HTTP API)
- [ ] Multi-tenant support
- [ ] Authentication & authorization

---

### v2.1.0 - Parallel Execution

**Goal:** Multiple agents working simultaneously.

- [ ] Parallel step groups in workflows
- [ ] Dependency graph execution
- [ ] Concurrent artifact handling
- [ ] Resource limits (max concurrent agents)

---

### v2.2.0 - Agent Memory

**Goal:** Agents that learn across runs.

- [ ] Cross-run artifact references
- [ ] Agent "memory" storage
- [ ] Codebase context persistence
- [ ] Learning from past reviews/feedback

---

### v3.0.0 - Multi-Backend Support

**Goal:** Use any LLM provider.

- [ ] OpenAI adapter
- [ ] Local model adapter (Ollama, llama.cpp)
- [ ] Model selection per agent
- [ ] Fallback chains (try Claude, fall back to GPT)

---

### Future Ideas (Unscheduled)

- **Secrets management** - secure credential injection
- **Web dashboard** - visual workflow builder
- **Audit logs** - compliance-grade logging
- **Role-based access** - who can approve what
- **Agent sandboxing** - containerized execution
