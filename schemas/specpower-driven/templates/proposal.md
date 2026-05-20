## Why

<!-- 1-2 sentences on the problem or opportunity. What problem does this solve? Why now?
     IMPORTANT: Read `explore.md` first — it contains the mandatory investigation results,
     trade-off analysis, and recommendation that inform this proposal. -->

## What Changes

<!-- Bullet list of changes. Be specific — no vague "improve X" or "add support for Y".
     Mark breaking changes with **BREAKING**. -->

- <!-- concrete change 1 -->
- <!-- concrete change 2 -->

## Non-Goals

<!-- What is explicitly OUT of scope. Prevents scope creep. Be specific.
     NO PLACEHOLDERS: no "TBD", "decide later", "maybe in future". -->

## Decision

<!-- Why this approach over alternatives? Summarize the key trade-off from explore.md.
     If explore used brainstorming, state the recommendation and why other options were rejected.
     Example: "JWT + OAuth 2.0 — JWT for stateless API auth, OAuth for social login.
     Rejected: Session-only (stateful, doesn't scale) and OAuth-only (no email/password fallback)." -->

## Capabilities

<!-- Capabilities define WHAT the change touches at the spec level. Each capability
     maps to a spec file that defines its behavior contract. Be precise — capability
     names drive the spec directory structure. -->

### New Capabilities
<!-- Capabilities being introduced. Replace <name> with kebab-case identifier.
     Examples: user-auth, data-export, api-rate-limiting, dark-mode-theme.
     Each creates a new specs/<name>/spec.md. Describe WHAT the capability covers,
     not HOW it will be implemented. -->
- `<name>`: <!-- what this capability covers — behavior, scope, key scenarios -->

### Modified Capabilities
<!-- Existing capabilities whose REQUIREMENTS are changing (not just implementation
     changes — only list here if spec-level behavior changes). Each needs a delta
     spec file under specs/<name>/spec.md. Find existing capability names in
     openspec/specs/. Leave empty if no existing requirements are changing. -->
- `<existing-name>`: <!-- what requirement is changing and why -->

## Impact

<!-- Affected code, APIs, dependencies, systems. Be specific: name the modules/services. -->
