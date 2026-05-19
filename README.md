# OpenSpec × Superpowers

> AI-native spec-driven development with **mandatory TDD** and **subagent-driven** workflows.

## See it in action

```text
You: /opsx:propose add-dark-mode
AI:  Created openspec/changes/add-dark-mode/
     ✓ proposal.md — why we're doing this, what's changing
     ✓ specs/       — requirements and scenarios
     ✓ design.md    — technical approach
     ✓ tasks.md     — implementation checklist
     Ready for implementation!

You: /opsx:apply
AI:  Implementing tasks...
     ✓ 1.1 Add theme context provider
     ✓ 1.2 Create toggle component
     ✓ 2.1 Add CSS variables
     ✓ 2.2 Wire up localStorage
     All tasks complete!

You: /opsx:archive
AI:  Archived to openspec/changes/archive/2025-01-23-add-dark-mode/
     Specs updated. Ready for the next feature.
```

<details>
<summary><strong>OpenSpec Dashboard</strong></summary>

<p align="center">
  <img src="assets/openspec_dashboard.png" alt="OpenSpec dashboard preview" width="90%">
</p>

</details>

## Quick Start

**Requires Node.js 20.19.0 or higher.**

```bash
git clone https://github.com/jisuobuyu/OpenSpec.git
cd OpenSpec && git checkout dev
npm install && npm run build && npm install -g .
```

Then navigate to your project directory and initialize:

```bash
cd your-project
openspec init
```

Now tell your AI: `/opsx:propose <what-you-want-to-build>`

### TDD is Mandatory

OpenSpec enforces test-driven development by default. Every task in `tasks.md` must include `[TDD]` — the full RED→GREEN→REFACTOR cycle. No exceptions.

```bash
openspec init
```

This enables 14 workflows by default:

- **TDD-driven apply** — mandatory `Skill("test-driven-development")` call per task
- **Two-layer verify** — test execution (L1) + 6-dimension consistency audit (L2)
- **Adaptive review** — complexity-based depth (self-audit / AI review / two-phase review)
- **Simplify integration** — post-task code refinement with dedicated commits
- **Lifecycle management** — non-destructive abort, task-level rewind, unarchive with spec rollback
- **Programmatic audit** — `openspec verify --change`, `openspec check --change`, `openspec metrics` for CI/CD reproducibility

Configure discipline level in `openspec/config.yaml`:

```yaml
schema: specpower-driven
discipline:
  level: strict  # core | enhanced | strict
  subagent:
    mode: per-task
```

> [!NOTE]
> Not sure if your tool is supported? [View the full list](docs/supported-tools.md) – we support 25+ tools and growing.
>
> Also works with pnpm, yarn, bun, and nix. [See installation options](docs/installation.md).

## Docs

→ **[Getting Started](docs/getting-started.md)**: first steps<br>
→ **[SpecPower Usage Guide](docs/openspec-superpowers-usage-guide.md)**: 14 workflows, mandatory TDD, installation & full command reference<br>
→ **[Workflows](docs/workflows.md)**: combos and patterns<br>
→ **[Commands](docs/commands.md)**: slash commands & skills<br>
→ **[CLI](docs/cli.md)**: terminal reference<br>
→ **[Supported Tools](docs/supported-tools.md)**: tool integrations & install paths<br>
→ **[Concepts](docs/concepts.md)**: how it all fits<br>
→ **[Multi-Language](docs/multi-language.md)**: multi-language support<br>
→ **[Customization](docs/customization.md)**: make it yours


## Community schemas

Third-party schema bundles distributed via standalone repositories — these provide opinionated workflows that integrate OpenSpec with other tools, similar to how [github/spec-kit's community extension catalog](https://github.com/github/spec-kit/tree/main/extensions) handles tool integrations.

→ **[Browse the catalog](docs/customization.md#community-schemas)** in the customization docs.


## Why OpenSpec?

AI coding assistants are powerful but unpredictable when requirements live only in chat history. OpenSpec adds a lightweight spec layer so you agree on what to build before any code is written.

- **Agree before you build** — human and AI align on specs before code gets written
- **Stay organized** — each change gets its own folder with proposal, specs, design, and tasks
- **Work fluidly** — update any artifact anytime, no rigid phase gates
- **Use your tools** — works with 20+ AI assistants via slash commands

### How we compare

**vs. [Spec Kit](https://github.com/github/spec-kit)** (GitHub) — Thorough but heavyweight. Rigid phase gates, lots of Markdown, Python setup. OpenSpec is lighter and lets you iterate freely.

**vs. [Kiro](https://kiro.dev)** (AWS) — Powerful but you're locked into their IDE and limited to Claude models. OpenSpec works with the tools you already use.

**vs. nothing** — AI coding without specs means vague prompts and unpredictable results. OpenSpec brings predictability without the ceremony.

## Updating OpenSpec

**Upgrade the package**

```bash
cd OpenSpec && git pull origin dev && npm install && npm run build && npm install -g .
```

**Refresh agent instructions**

Run this inside each project to regenerate AI guidance and ensure the latest slash commands are active:

```bash
openspec update
```

## Development

- Install dependencies: `npm install`
- Build: `npm run build`
- Test: `npm test`
- Global install: `npm install -g .`

## License

MIT
