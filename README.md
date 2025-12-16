# Maestro

**Many agents. One concert.**

Maestro is a framework for running AI coding agents that work together like a software team.

## What is this?

Imagine you have a team of AI assistants, each with a specific job:

- **Product Manager** - figures out what to build
- **Architect** - designs how it should work
- **Developer** - writes the code
- **Reviewer** - checks the code for problems
- **Tester** - makes sure everything works
- **DevOps** - deploys it to servers

Maestro lets you set up these AI agents and have them work together automatically. You give them a task like "build a login page", and they pass work to each other - just like a real team would.

## Why does this exist?

AI coding assistants are powerful, but they work alone. You have to babysit them, copy outputs between tools, and manually decide what happens next.

Maestro solves this by:

1. **Letting agents talk to each other** - the developer can send code to the reviewer without you copying and pasting
2. **Following your rules** - you define the workflow, and agents stick to it
3. **Keeping humans in control** - agents pause and ask for approval at important steps
4. **Remembering everything** - all outputs are saved so you can see what each agent did

## How it works

You write a simple config file that says "first do this, then do that":

```yaml
steps:
  - agent: architect
    output: design.md

  - agent: developer
    input: design.md
    output: code

  - agent: reviewer
    input: code
    approval: required # stops here until you approve
```

Then you run it:

```bash
maestro run my-workflow --input "Build a user settings page"
```

Maestro handles the rest - running each agent, passing files between them, and pausing when it needs your approval.

## Key ideas

- **Workflows** - step-by-step recipes that agents follow
- **Agents** - AI assistants with specific roles (developer, reviewer, etc.)
- **Artifacts** - files that agents produce (code, docs, test results)
- **Approvals** - checkpoints where humans review and approve before continuing

## What Maestro is NOT

- Not a UI or dashboard (it's a backend - you can build your own UI on top)
- Not a cloud service yet (runs on your computer first)
- Not fully autonomous (humans stay in control at key points)

## Installation

### CLI (for end users)

```bash
npm install -g @chrismlittle123/maestro-cli
maestro --help
```

### SDK (for programmatic use)

```bash
npm install @chrismlittle123/maestro-sdk
```

```typescript
import { Maestro } from "@chrismlittle123/maestro-sdk";

const maestro = new Maestro({ projectRoot: "./my-project" });
const run = await maestro.runWorkflow("my-workflow", { input: "Build a feature" });
```

## Packages

| Package                                                                                        | Description                      |
| ---------------------------------------------------------------------------------------------- | -------------------------------- |
| [`@chrismlittle123/maestro-cli`](https://www.npmjs.com/package/@chrismlittle123/maestro-cli)   | CLI for running workflows        |
| [`@chrismlittle123/maestro-sdk`](https://www.npmjs.com/package/@chrismlittle123/maestro-sdk)   | SDK for programmatic integration |
| [`@chrismlittle123/maestro-core`](https://www.npmjs.com/package/@chrismlittle123/maestro-core) | Core engine (internal)           |

## Status

This is early-stage software (v0.1.0). We're building the foundation first, then adding more features.

## License

MIT

---

_Built for engineers who want AI agents that follow the rules._
