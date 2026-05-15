/**
 * Conflict Detector
 *
 * Scans active changes for file-level and spec-level conflicts.
 * Used before apply and archive to prevent parallel change collisions.
 */

import { promises as fs } from 'fs';
import path from 'path';

// ── Types ──────────────────────────────────────────────────────────

export type ConflictType = 'file-intersection' | 'spec-semantic' | 'requirement-id-collision';

export interface Conflict {
  type: ConflictType;
  changeA: string;
  changeB: string;
  detail: string;
}

export interface ConflictReport {
  hasConflicts: boolean;
  conflicts: Conflict[];
  summary: string;
}

// ── Interfaces for Change Info ─────────────────────────────────────

export interface ChangeInfo {
  name: string;
  /** Files referenced in tasks, design, or delta specs */
  referencedFiles: string[];
  /** Requirement IDs from delta specs */
  requirementIds: string[];
  /** Full requirement definitions: ID → description */
  requirementDefinitions: Record<string, string>;
}

// ── Scanner ────────────────────────────────────────────────────────

async function scanChange(changesDir: string, changeName: string): Promise<ChangeInfo> {
  const changeDir = path.join(changesDir, changeName);
  const referencedFiles = new Set<string>();
  const requirementIds: string[] = [];
  const requirementDefinitions: Record<string, string> = {};

  // Scan tasks.md for referenced files
  try {
    const tasksContent = await fs.readFile(path.join(changeDir, 'tasks.md'), 'utf-8');
    // Extract file paths mentioned in tasks (e.g., src/auth/login.ts)
    const fileMatches = tasksContent.match(/`?([\w./-]+\.[\w]{1,6})`?/g);
    if (fileMatches) {
      for (const m of fileMatches) {
        const cleaned = m.replace(/`/g, '');
        if (cleaned.match(/\.(ts|js|tsx|jsx|py|go|rs|java|rb|php|css|html|md|yaml|yml|json)$/)) {
          referencedFiles.add(cleaned);
        }
      }
    }
  } catch {
    // No tasks.md — ok
  }

  // Scan design.md for referenced files
  try {
    const designContent = await fs.readFile(path.join(changeDir, 'design.md'), 'utf-8');
    const fileMatches = designContent.match(/`?([\w./-]+\.[\w]{1,6})`?/g);
    if (fileMatches) {
      for (const m of fileMatches) {
        const cleaned = m.replace(/`/g, '');
        if (cleaned.match(/\.(ts|js|tsx|jsx|py|go|rs|java|rb|php|css|html|md|yaml|yml|json)$/)) {
          referencedFiles.add(cleaned);
        }
      }
    }
  } catch {
    // No design.md — ok
  }

  // Scan delta specs for requirements
  const specsDir = path.join(changeDir, 'specs');
  try {
    const entries = await fs.readdir(specsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const specPath = path.join(specsDir, entry.name, 'spec.md');
      try {
        const specContent = await fs.readFile(specPath, 'utf-8');
        // Extract requirement headers
        const reqMatches = specContent.matchAll(/^###\s+Requirement:\s*(.+)$/gm);
        for (const reqMatch of reqMatches) {
          const reqName = reqMatch[1].trim();
          const reqId = `REQ-${reqName.replace(/\s+/g, '-').toLowerCase().slice(0, 30)}`;
          requirementIds.push(reqId);
          requirementDefinitions[reqId] = reqName;
        }
      } catch {
        // spec file not readable
      }
    }
  } catch {
    // No specs dir
  }

  return {
    name: changeName,
    referencedFiles: [...referencedFiles],
    requirementIds,
    requirementDefinitions,
  };
}

// ── Detection ──────────────────────────────────────────────────────

function detectFileIntersections(changes: ChangeInfo[]): Conflict[] {
  const conflicts: Conflict[] = [];

  for (let i = 0; i < changes.length; i++) {
    for (let j = i + 1; j < changes.length; j++) {
      const filesA = new Set(changes[i].referencedFiles);
      const filesB = changes[j].referencedFiles;
      const common = filesB.filter((f) => filesA.has(f));

      if (common.length > 0) {
        conflicts.push({
          type: 'file-intersection',
          changeA: changes[i].name,
          changeB: changes[j].name,
          detail: `Both changes reference ${common.length} common file(s): ${common.slice(0, 5).join(', ')}${common.length > 5 ? '...' : ''}`,
        });
      }
    }
  }

  return conflicts;
}

function detectRequirementConflicts(changes: ChangeInfo[]): Conflict[] {
  const conflicts: Conflict[] = [];

  for (let i = 0; i < changes.length; i++) {
    for (let j = i + 1; j < changes.length; j++) {
      const idsA = new Set(changes[i].requirementIds);
      const idsB = changes[j].requirementIds;

      // Check for same requirement ID
      const sameIds = idsB.filter((id) => idsA.has(id));
      for (const id of sameIds) {
        const defA = changes[i].requirementDefinitions[id] || id;
        const defB = changes[j].requirementDefinitions[id] || id;

        if (defA !== defB) {
          // Same ID, different definition → collision
          conflicts.push({
            type: 'requirement-id-collision',
            changeA: changes[i].name,
            changeB: changes[j].name,
            detail: `Requirement ID "${id}" has different definitions: "${defA}" vs "${defB}"`,
          });
        } else {
          // Same ID, same definition → semantic conflict
          conflicts.push({
            type: 'spec-semantic',
            changeA: changes[i].name,
            changeB: changes[j].name,
            detail: `Both changes modify requirement "${id}" (${defA})`,
          });
        }
      }
    }
  }

  return conflicts;
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Detect conflicts across all active changes.
 *
 * Compares every pair of active changes for:
 * 1. File intersections — same source files referenced
 * 2. Spec semantic conflicts — same requirement modified
 * 3. Requirement ID collisions — same ID but different definitions
 */
export async function detectConflicts(
  projectRoot: string,
  changesFilter?: string[]
): Promise<ConflictReport> {
  const changesDir = path.join(projectRoot, 'openspec', 'changes');
  const changes: ChangeInfo[] = [];

  // Get active change names
  let changeNames: string[];
  try {
    const entries = await fs.readdir(changesDir, { withFileTypes: true });
    changeNames = entries
      .filter((e) => e.isDirectory() && e.name !== 'archive' && e.name !== 'aborted' && !e.name.startsWith('.'))
      .map((e) => e.name);
  } catch {
    changeNames = [];
  }

  if (changesFilter) {
    const filterSet = new Set(changesFilter);
    changeNames = changeNames.filter((n) => filterSet.has(n));
  }

  // Scan each change
  for (const name of changeNames) {
    changes.push(await scanChange(changesDir, name));
  }

  if (changes.length < 2) {
    return {
      hasConflicts: false,
      conflicts: [],
      summary: changes.length === 0
        ? 'No active changes to scan.'
        : 'Only one active change — no conflicts possible.',
    };
  }

  // Run all detectors
  const fileConflicts = detectFileIntersections(changes);
  const specConflicts = detectRequirementConflicts(changes);
  const allConflicts = [...fileConflicts, ...specConflicts];

  const summary = allConflicts.length === 0
    ? `Scanned ${changes.length} active changes — no conflicts detected.`
    : `Found ${allConflicts.length} conflict(s) across ${changes.length} active changes: ${fileConflicts.length} file intersection(s), ${specConflicts.length} spec conflict(s).`;

  return {
    hasConflicts: allConflicts.length > 0,
    conflicts: allConflicts,
    summary,
  };
}
