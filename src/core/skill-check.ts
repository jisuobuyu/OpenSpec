/**
 * Skill Availability Checker
 *
 * Programmatic prerequisite check: verifies that required Superpowers skills
 * are installed before the enhanced/strict workflow can function correctly.
 *
 * The design spec Section 8.6 defines a degradation matrix — this module
 * provides the runtime implementation.
 */

import { homedir } from 'os';
import { existsSync } from 'fs';
import path from 'path';
import { AI_TOOLS } from './config.js';

// ── Types ──────────────────────────────────────────────────────────

export interface SkillStatus {
  name: string;
  required: boolean;
  installed: boolean;
  /** Paths checked */
  checkedPaths: string[];
  /** Path where it was found, if any */
  foundAt?: string;
}

export interface SkillCheckReport {
  profile: string;
  disciplineLevel: string;
  allInstalled: boolean;
  skills: SkillStatus[];
  summary: {
    total: number;
    required: number;
    installed: number;
    missing: number;
    missingRequired: number;
  };
}

// ── Required skills per discipline context ────────────────────────

/**
 * Skills always required for enhanced/strict profiles.
 * TDD and simplify are embedded directly in task structure — not external skills.
 * Only verification-before-completion is needed here.
 */
const ALWAYS_REQUIRED = [
  'verification-before-completion',
];

/** Skills required for enhanced/strict depending on configuration */
const CONDITIONAL_REQUIRED = [
  'subagent-driven-development',
  'requesting-code-review',
];

/** Optional skills — nice to have, not required */
const OPTIONAL_SKILLS = [
  'brainstorming',
  'writing-plans',
];

const ALL_SUPERPOWERS_SKILLS = [
  ...ALWAYS_REQUIRED,
  ...CONDITIONAL_REQUIRED,
  ...OPTIONAL_SKILLS,
];

// ── Core check logic ───────────────────────────────────────────────

function getSkillPath(skillName: string, toolSkillsDir: string): string {
  return path.join(homedir(), toolSkillsDir, 'skills', skillName, 'SKILL.md');
}

/**
 * Check if Superpowers skills are installed for known AI tools.
 */
export function checkSuperpowersSkills(
  disciplineLevel: string,
  options?: {
    /** Only check these specific tools (values from AI_TOOLS) */
    tools?: string[];
  },
): SkillCheckReport {
  const level = disciplineLevel || 'strict';
  const isEnhancedOrStrict = level === 'enhanced' || level === 'strict';
  const isCore = level === 'core';

  // Core profile does not require Superpowers skills
  if (isCore) {
    return {
      profile: 'core',
      disciplineLevel: level,
      allInstalled: true,
      skills: [],
      summary: { total: 0, required: 0, installed: 0, missing: 0, missingRequired: 0 },
    };
  }

  // Determine which tools to check
  const toolIds = options?.tools ?? ['claude'];
  const tools = AI_TOOLS.filter(
    (t) => toolIds.includes(t.value) && t.skillsDir,
  );

  const skills: SkillStatus[] = [];

  for (const skillName of ALL_SUPERPOWERS_SKILLS) {
    const required = ALWAYS_REQUIRED.includes(skillName) ||
      CONDITIONAL_REQUIRED.includes(skillName);
    const checkedPaths: string[] = [];
    let foundAt: string | undefined;

    for (const tool of tools) {
      const skillPath = getSkillPath(skillName, tool.skillsDir!);
      checkedPaths.push(skillPath);
      if (existsSync(skillPath)) {
        foundAt = skillPath;
        break; // Found in at least one tool — good enough
      }
    }

    skills.push({
      name: skillName,
      required,
      installed: foundAt !== undefined,
      checkedPaths,
      foundAt,
    });
  }

  const requiredSkills = skills.filter((s) => s.required);
  const missingRequired = requiredSkills.filter((s) => !s.installed);

  return {
    profile: isEnhancedOrStrict ? level : 'core',
    disciplineLevel: level,
    allInstalled: missingRequired.length === 0,
    skills,
    summary: {
      total: skills.length,
      required: requiredSkills.length,
      installed: skills.filter((s) => s.installed).length,
      missing: skills.filter((s) => !s.installed).length,
      missingRequired: missingRequired.length,
    },
  };
}

/**
 * Format a skill check report as human-readable text.
 */
export function formatSkillCheckReport(report: SkillCheckReport): string {
  if (report.summary.total === 0) {
    return 'No Superpowers skills required for core profile.';
  }

  const lines: string[] = [];
  lines.push(`Skill Check — ${report.disciplineLevel} profile`);
  lines.push('');

  for (const skill of report.skills) {
    const icon = skill.installed ? '✓' : '✗';
    const tag = skill.required ? '[required]' : '[optional]';
    const note = skill.installed
      ? `found at ${skill.foundAt}`
      : 'NOT INSTALLED';

    lines.push(`  ${icon} ${skill.name.padEnd(32)} ${tag.padEnd(11)} ${note}`);
  }

  lines.push('');
  lines.push(
    `  Required: ${report.summary.required}, Installed: ${report.summary.installed}, Missing: ${report.summary.missingRequired}`,
  );

  if (!report.allInstalled) {
    lines.push('');
    lines.push('The following required skills are missing:');
    for (const skill of report.skills) {
      if (skill.required && !skill.installed) {
        lines.push(`  - ${skill.name}`);
        lines.push(`    Install: https://github.com/obra/superpowers`);
      }
    }
    lines.push('');
    lines.push('Without these skills, the workflow will degrade gracefully (enhanced) or error (strict).');
    lines.push('See docs/openspec-superpowers-installation.md for setup instructions.');
  }

  return lines.join('\n');
}
