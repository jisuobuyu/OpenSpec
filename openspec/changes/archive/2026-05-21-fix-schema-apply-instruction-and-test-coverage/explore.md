## Exploration

Systematic audit of `schemas/specpower-driven/schema.yaml` against the current template implementation and test landscape. The audit revealed a critical instruction staleness bug, a secondary parse bug, and 16 source modules with zero dedicated test coverage.

## Key Insights

1. **`apply.instruction` is actively consumed and stale.** `src/commands/workflow/instructions.ts:263` reads `schema.apply.instruction` and returns it directly to LLMs when they call `openspec instructions apply --change <name>`. The current text references `[TDD]`/`[TDD: Lite]`/`[TDD: Skip]` annotations and `Skill({skill: "test-driven-development"})` — all of which were replaced by the embedded 6-step TDD sub-step model and `Skill({skill: "subagent-driven-development"})`.

2. **parseTasksFile has the same regex bug we already fixed in task-progress.ts.** The regex `/^[-*]\s*\[([ xX])\]\s*(.+)\s*$/` in `instructions.ts:225` matches all checkboxes — including TDD sub-steps like `RED:`, `GREEN:`, `REFACTOR:`, `SIMPLIFY:`. This inflates task counts in `openspec instructions apply` output.

3. **`verify.instruction` and `archive.instruction` are NOT consumed by any code.** They are documentation-only reference in schema.yaml. Both are consistent with their corresponding template implementations (verify-change.ts, archive-change.ts). No fix needed.

4. **16 source modules have zero dedicated test coverage.** Most critically: `instructions.ts` (gateway for LLM instructions), `metrics.ts` (CLI command), `config.ts` (core config used by everything).

5. **`REQUIRED_SUB_STEPS` is hardcoded in compliance-check.ts.** Considered adding declarative `sub_steps` to schema, but YAGNI — only one schema exists, and the 6 sub-steps are well-documented in tasks.md template.

## Options

| Option | Pros | Cons |
|--------|------|------|
| **A: Schema-only fix** | Minimal change, low risk | No regression guard; parseTasksFile bug stays; test coverage gaps remain |
| **B: Schema fix + bug fix + test coverage** (chosen) | Fixes root cause, guards against regression, fills real test blind spots | Larger change (~16 new/expanded test files) |
| **C: Split into 2 changes** | Smaller individual PRs | Schema fix without tests has no regression guard; parseTasksFile fix naturally lives with instruction tests |

## Recommendation

**Option B** — single comprehensive change. Rationale:
1. Schema fix without tests = no regression protection
2. The parseTasksFile bug is in the same module that serves instructions — natural to fix with instruction content
3. The instruction path tests ARE the regression tests for the schema fix — splitting them would leave the critical fix untested in the first change
4. Test files are additive, low risk to existing functionality

## Open Questions

- All resolved. See exploration session for detailed analysis of sub_steps in schema (YAGNI), verify.instruction staleness (not stale), archive staleness (not stale), workflow/index.ts testing (barrel, skip), cli/index.ts testing (covered by e2e + help output).
