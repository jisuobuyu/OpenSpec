/**
 * Consistency Auditor
 *
 * Layer 2 verification logic for the superpowers verify workflow.
 * Audits implementation against change artifacts across 6 dimensions.
 * Incremental scan — only examines files changed by the current change.
 */

// ── Types ──────────────────────────────────────────────────────────

export type ConsistencySeverity = 'Pass' | 'Warning' | 'Critical';

export interface DimensionResult {
  dimension: string;
  severity: ConsistencySeverity;
  detail: string;
  recommendations: string[];
}

export interface ConsistencyAuditReport {
  changeName: string;
  dimensions: DimensionResult[];
  overall: ConsistencySeverity;
  summary: string;
}

// ── Audit Input ────────────────────────────────────────────────────

export interface AuditInput {
  changeName: string;
  /** Parsed tasks from tasks.md: task ID -> { description, completed } */
  tasks: { id: string; description: string; completed: boolean }[];
  /** Requirement IDs found in delta specs */
  specRequirements: { id: string; name: string; scenarioCount: number }[];
  /** Key decisions extracted from design.md */
  designDecisions: string[];
  /** Files changed in this change (from git diff --name-only) */
  changedFiles: string[];
  /** Changed file contents for deeper analysis (path -> content) */
  changedFileContents?: Record<string, string>;
  /** Whether design.md exists for this change */
  hasDesign: boolean;
  /** Whether delta specs exist for this change */
  hasSpecs: boolean;
}

// ── 1. Spec Coverage ───────────────────────────────────────────────

function auditSpecCoverage(input: AuditInput): DimensionResult {
  if (!input.hasSpecs || input.specRequirements.length === 0) {
    return {
      dimension: 'Spec Coverage',
      severity: 'Pass',
      detail: 'No spec requirements to audit (no delta specs).',
      recommendations: [],
    };
  }

  const uncovered: string[] = [];
  const fileSet = new Set(input.changedFiles.map((f) => f.toLowerCase()));

  for (const req of input.specRequirements) {
    // Extract keywords from requirement name for fuzzy matching
    const keywords = req.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3);

    // Check if any changed file name matches kebab-case requirement name
    const nameHit = input.changedFiles.some((f) =>
      f.toLowerCase().includes(req.name.toLowerCase().replace(/\s+/g, '-'))
    );

    // Check if any changed file content contains requirement keywords
    const contentHit =
      input.changedFileContents &&
      keywords.length > 0 &&
      Object.values(input.changedFileContents).some((c) =>
        keywords.some((kw) => c.toLowerCase().includes(kw))
      );

    if (!nameHit && !contentHit) {
      uncovered.push(req.id);
    }
  }

  if (uncovered.length === 0) {
    return {
      dimension: 'Spec Coverage',
      severity: 'Pass',
      detail: `All ${input.specRequirements.length} requirement(s) traced to changed files.`,
      recommendations: [],
    };
  }

  const coverage = input.specRequirements.length - uncovered.length;
  const pct = Math.round((coverage / input.specRequirements.length) * 100);

  if (pct >= 50) {
    return {
      dimension: 'Spec Coverage',
      severity: 'Warning',
      detail: `${coverage}/${input.specRequirements.length} requirements covered (${pct}%). Missing: ${uncovered.join(', ')}`,
      recommendations: uncovered.map((id) => `Verify requirement ${id} has corresponding implementation`),
    };
  }

  return {
    dimension: 'Spec Coverage',
    severity: 'Critical',
    detail: `Only ${coverage}/${input.specRequirements.length} requirements covered (${pct}%). Missing: ${uncovered.join(', ')}`,
    recommendations: uncovered.map((id) => `Implement requirement ${id} before archiving`),
  };
}

// ── 2. Scenario Completeness ───────────────────────────────────────

function auditScenarioCompleteness(input: AuditInput): DimensionResult {
  if (!input.hasSpecs) {
    return {
      dimension: 'Scenario Completeness',
      severity: 'Pass',
      detail: 'No delta specs to audit scenarios against.',
      recommendations: [],
    };
  }

  const totalScenarios = input.specRequirements.reduce((sum, r) => sum + r.scenarioCount, 0);
  if (totalScenarios === 0) {
    return {
      dimension: 'Scenario Completeness',
      severity: 'Warning',
      detail: 'No scenarios defined in delta specs. Every requirement should have at least one scenario.',
      recommendations: ['Add scenarios (Given/When/Then) to each requirement in the delta spec'],
    };
  }

  // Estimate scenario coverage by checking if scenario-related patterns exist in changed files
  const testFiles = input.changedFiles.filter(
    (f) => f.includes('.test.') || f.includes('.spec.') || f.includes('__tests__')
  );

  if (testFiles.length === 0 && input.changedFiles.length > 0) {
    return {
      dimension: 'Scenario Completeness',
      severity: 'Warning',
      detail: `${totalScenarios} scenario(s) defined in specs, but no test files found in changed files.`,
      recommendations: ['Add test files covering the spec scenarios', 'Verify each scenario has a corresponding test case'],
    };
  }

  return {
    dimension: 'Scenario Completeness',
    severity: 'Pass',
    detail: `${totalScenarios} scenario(s) defined, ${testFiles.length} test file(s) found.`,
    recommendations: [],
  };
}

// ── 3. Task Alignment ──────────────────────────────────────────────

function auditTaskAlignment(input: AuditInput): DimensionResult {
  const incomplete = input.tasks.filter((t) => !t.completed);

  if (incomplete.length === 0 && input.tasks.length > 0) {
    return {
      dimension: 'Task Alignment',
      severity: 'Pass',
      detail: `All ${input.tasks.length} task(s) marked complete.`,
      recommendations: [],
    };
  }

  if (input.tasks.length === 0) {
    return {
      dimension: 'Task Alignment',
      severity: 'Pass',
      detail: 'No tasks to audit.',
      recommendations: [],
    };
  }

  // Check for completed tasks with no corresponding code changes
  const completedButNoCode: string[] = [];
  for (const task of input.tasks) {
    if (task.completed && input.changedFiles.length === 0) {
      completedButNoCode.push(task.id);
    }
  }

  if (completedButNoCode.length > 0) {
    return {
      dimension: 'Task Alignment',
      severity: 'Warning',
      detail: `${completedButNoCode.length} task(s) marked complete but no changed files detected: ${completedButNoCode.join(', ')}`,
      recommendations: ['Verify the completed tasks actually modified code', 'If tasks were done out-of-band, note this in the change'],
    };
  }

  return {
    dimension: 'Task Alignment',
    severity: 'Warning',
    detail: `${incomplete.length}/${input.tasks.length} task(s) still incomplete.`,
    recommendations: incomplete.map((t) => `Complete task ${t.id}: ${t.description}`),
  };
}

// ── 4. Design Consistency ─────────────────────────────────────────

function auditDesignConsistency(input: AuditInput): DimensionResult {
  if (!input.hasDesign || input.designDecisions.length === 0) {
    return {
      dimension: 'Design Consistency',
      severity: 'Pass',
      detail: 'No design.md or no explicit decisions to audit.',
      recommendations: [],
    };
  }

  const violations: string[] = [];
  const fileContents = input.changedFileContents ?? {};
  const allContent = Object.values(fileContents).join('\n');
  const allFiles = Object.keys(fileContents);

  for (const decision of input.designDecisions) {
    // Extract keywords from the decision for checking
    const keywords = decision
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    const found = keywords.some((kw) => allContent.toLowerCase().includes(kw));
    if (!found && allFiles.length > 0) {
      violations.push(decision);
    }
  }

  if (violations.length === 0) {
    return {
      dimension: 'Design Consistency',
      severity: 'Pass',
      detail: `All ${input.designDecisions.length} design decision(s) appear consistent with implementation.`,
      recommendations: [],
    };
  }

  if (violations.length < input.designDecisions.length) {
    return {
      dimension: 'Design Consistency',
      severity: 'Warning',
      detail: `${violations.length}/${input.designDecisions.length} design decision(s) potentially not followed: ${violations.join('; ')}`,
      recommendations: violations.map((d) => `Verify implementation follows design decision: "${d}"`),
    };
  }

  return {
    dimension: 'Design Consistency',
    severity: 'Critical',
    detail: `None of the ${input.designDecisions.length} design decisions could be verified in the implementation.`,
    recommendations: ['Review the implementation against design.md', 'Update design.md if the approach changed during implementation'],
  };
}

// ── 5. Scope Boundary ──────────────────────────────────────────────

function auditScopeBoundary(input: AuditInput): DimensionResult {
  // Check if changed files include unexpected paths (outside normal project structure)
  const unexpectedPaths = input.changedFiles.filter((f) => {
    const lower = f.toLowerCase();
    return (
      lower.includes('node_modules') ||
      lower.includes('.env') ||
      lower.includes('.secret') ||
      lower.startsWith('../') ||
      lower.includes('package-lock.json') ||
      lower.includes('.git/')
    );
  });

  // Check for files that seem unrelated to documented capabilities
  if (unexpectedPaths.length > 0) {
    return {
      dimension: 'Scope Boundary',
      severity: 'Warning',
      detail: `${unexpectedPaths.length} changed file(s) outside expected scope: ${unexpectedPaths.join(', ')}`,
      recommendations: ['Verify these files are intentionally part of this change', 'Remove unintended changes before archiving'],
    };
  }

  // Check for unusually large change scope
  if (input.changedFiles.length > 30) {
    return {
      dimension: 'Scope Boundary',
      severity: 'Warning',
      detail: `Large change scope: ${input.changedFiles.length} files changed. Consider splitting into smaller changes.`,
      recommendations: ['Review if this change can be split into multiple smaller changes'],
    };
  }

  return {
    dimension: 'Scope Boundary',
    severity: 'Pass',
    detail: `Scope looks appropriate (${input.changedFiles.length} file(s) changed).`,
    recommendations: [],
  };
}

// ── 6. Implicit Change ─────────────────────────────────────────────

function auditImplicitChange(input: AuditInput): DimensionResult {
  if (!input.hasSpecs || input.specRequirements.length === 0) {
    return {
      dimension: 'Implicit Change',
      severity: 'Pass',
      detail: 'No delta specs to compare against for implicit changes.',
      recommendations: [],
    };
  }

  // Extract changed function/class names from changed files
  const changedSymbols: string[] = [];
  if (input.changedFileContents) {
    for (const content of Object.values(input.changedFileContents)) {
      const matches = content.match(/(?:export\s+(?:function|class|const|interface|type|enum)\s+|function\s+|class\s+)(\w+)/g);
      if (matches) {
        for (const m of matches) {
          const name = m.replace(/export\s+|function\s+|class\s+|const\s+|interface\s+|type\s+|enum\s+/, '');
          changedSymbols.push(name);
        }
      }
    }
  }

  // Check if any changed symbols match requirement keywords
  const requirementKeywords = input.specRequirements.flatMap((r) =>
    r.name.toLowerCase().split(/\s+/).filter((w) => w.length > 4)
  );

  const implicitChanges: string[] = [];
  for (const symbol of changedSymbols) {
    const isKnown = requirementKeywords.some((kw) => symbol.toLowerCase().includes(kw));
    if (!isKnown && symbol.length > 2) {
      implicitChanges.push(symbol);
    }
  }

  if (implicitChanges.length > 5) {
    return {
      dimension: 'Implicit Change',
      severity: 'Warning',
      detail: `${implicitChanges.length} modified symbols may not be declared in delta specs — potential implicit changes: ${implicitChanges.slice(0, 10).join(', ')}${implicitChanges.length > 10 ? '...' : ''}`,
      recommendations: ['Verify these changes are within spec scope', 'Update delta specs if new behavior was introduced'],
    };
  }

  return {
    dimension: 'Implicit Change',
    severity: 'Pass',
    detail: changedSymbols.length > 0
      ? `${changedSymbols.length} modified symbol(s), all appear within spec scope.`
      : 'No implicit changes detected.',
    recommendations: [],
  };
}

// ── Public API ─────────────────────────────────────────────────────

const auditors = [
  auditSpecCoverage,
  auditScenarioCompleteness,
  auditTaskAlignment,
  auditDesignConsistency,
  auditScopeBoundary,
  auditImplicitChange,
];

/**
 * Run the full 6-dimension consistency audit on a change.
 *
 * Each dimension returns Pass, Warning, or Critical severity.
 * The overall assessment is the worst severity across all dimensions.
 */
export function consistencyAudit(input: AuditInput): ConsistencyAuditReport {
  const dimensions = auditors.map((auditFn) => auditFn(input));

  const overall: ConsistencySeverity =
    dimensions.some((d) => d.severity === 'Critical')
      ? 'Critical'
      : dimensions.some((d) => d.severity === 'Warning')
        ? 'Warning'
        : 'Pass';

  const criticalCount = dimensions.filter((d) => d.severity === 'Critical').length;
  const warningCount = dimensions.filter((d) => d.severity === 'Warning').length;
  const passCount = dimensions.filter((d) => d.severity === 'Pass').length;

  let summary: string;
  if (overall === 'Pass') {
    summary = `All ${dimensions.length} dimensions pass. Ready for archive.`;
  } else if (overall === 'Critical') {
    summary = `${criticalCount} critical, ${warningCount} warning, ${passCount} pass. Fix critical issues before archiving.`;
  } else {
    summary = `${warningCount} warning(s), ${passCount} pass. Review warnings before archiving.`;
  }

  return {
    changeName: input.changeName,
    dimensions,
    overall,
    summary,
  };
}

/**
 * Parse tasks.md content into structured task objects.
 */
export function parseTasks(content: string): { id: string; description: string; completed: boolean }[] {
  const tasks: { id: string; description: string; completed: boolean }[] = [];
  const regex = /^- \[([ x])\] (\d+\.\d+)\s*(.*)$/gm;

  let match;
  while ((match = regex.exec(content)) !== null) {
    tasks.push({
      id: match[2],
      description: match[3].trim(),
      completed: match[1] === 'x',
    });
  }

  return tasks;
}

/**
 * Extract requirement info from spec content.
 */
export function parseRequirements(content: string): { id: string; name: string; scenarioCount: number }[] {
  const requirements: { id: string; name: string; scenarioCount: number }[] = [];
  const reqRegex = /^###\s+Requirement:\s*(.+)$/gm;
  const scenarioRegex = /^####\s+Scenario:/gm;

  // Split content by requirement headers
  const sections = content.split(/^###\s+Requirement:/m);

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const nameLine = section.split('\n')[0].trim();
    const scenarios = (section.match(scenarioRegex) || []).length;
    requirements.push({
      id: `REQ-${nameLine.replace(/\s+/g, '-').toLowerCase().slice(0, 30)}`,
      name: nameLine,
      scenarioCount: scenarios,
    });
  }

  return requirements;
}

/**
 * Extract key design decisions from design.md content.
 */
export function parseDesignDecisions(content: string): string[] {
  const decisions: string[] = [];

  // Look for decisions in the "Decisions" section
  const decisionsSection = content.match(/##\s+Decisions\s*\n([\s\S]*?)(?=\n##\s|$)/i);
  if (decisionsSection?.[1]) {
    // Extract decision lines (bulleted items or table rows)
    const lines = decisionsSection[1].split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        decisions.push(trimmed.replace(/^[-*]\s+/, ''));
      }
    }
  }

  // Also check for decisions under Goals or Context
  if (decisions.length === 0) {
    const goalMatch = content.match(/##\s+Goals\s*\/\s*Non-Goals\s*\n([\s\S]*?)(?=\n##\s|$)/i);
    if (goalMatch?.[1]) {
      const lines = goalMatch[1].split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if ((trimmed.startsWith('- ') || trimmed.startsWith('* ')) && !trimmed.includes('Non-Goals')) {
          decisions.push(trimmed.replace(/^[-*]\s+/, ''));
        }
      }
    }
  }

  return decisions;
}
