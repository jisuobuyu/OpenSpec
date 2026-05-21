## Exploration

Systematic investigation of three issues reported against the apply/archive workflow, with root-cause analysis and design decisions.

## Key Insights

**Problem 1 — Subagent not called:** The `Skill({skill: "subagent-driven-development"})` directive is purely instructional text for Claude. It is phrased as optional ("Layer 2 is enhancement") and the 40+ line degradation path signals to Claude that local execution is an acceptable alternative. The skill file exists at both project and user level — Claude simply chooses to skip the `Skill` tool call and execute TDD locally. Root cause: no hard gate enforcement in the instruction language.

**Problem 2 — Checkbox batched:** LLMs process instructions linearly and optimize for efficiency. When the outer loop describes Task 1 → Task 2 → Task 3 as a conceptual loop, Claude tends to execute all tasks first, then batch-update checkboxes afterward. Root cause: no explicit STOP/PAUSE instruction between tasks.

**Problem 3 — Commits at wrong time:** Currently per-task commits happen in apply Phase C2, but verify and archive happen later without creating commits. The user's preferred flow: apply does the work without committing, verify validates, archive creates one final commit. Removing per-task commits also requires reworking session recovery (currently uses `git diff --name-only` to detect in-progress work).

**Consistency insight:** These three issues are interrelated. Without subagent isolation, per-task commits lack independent review assurance. Without immediate checkbox marking, session recovery is unreliable. Moving commits to archive makes the checkpoint mechanism (checkbox + `.openspec.yaml`) the sole progress tracker during apply.

## Options

| Option | Pros | Cons |
|--------|------|------|
| A - Hard gate: subagent mandatory, immediate checkbox, archive commit | Simple mental model, each role is clear (apply=dispatch, archive=commit), sessions recoverable via checkboxes | Requires discipline that subagent skill always exists, no per-task rollback granularity in git |
| B - Keep per-task commits, fix only subagent and checkbox | Preserves fine-grained git history, easier bisect | Doesn't address commit timing concern, commits still created before verify passes |
| C - Configurable: discipline level controls commit timing | Flexible for different workflows | Adds complexity, three problems become a config matrix |

## Recommendation

**Option A** — Hard gate subagent dispatch, per-task immediate checkbox marking, single commit at archive time. This aligns with the user's explicit preferences and creates a clean separation:

- **Apply**: Dispatch tasks to isolated subagents, mark checkboxes immediately, NO commits
- **Verify**: Validate correctness independently of apply
- **Archive**: If verify passes, create one well-structured commit with full task summary, then move to archive

## Open Questions

- Should `enhanced` mode still allow local fallback when subagent skill genuinely doesn't exist, or should it also halt?
- For very large changes (20+ tasks), is one commit still preferred, or should there be a midpoint commit option?
- Session recovery via `.openspec.yaml` `last_checkpoint` + checkbox alone: sufficient for all recovery scenarios?
