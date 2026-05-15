/**
 * Circular Dependency Detector
 *
 * Loads active changes' depends_on declarations, builds a directed graph,
 * and uses DFS to detect cycles.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';

// ── Types ──────────────────────────────────────────────────────────

export interface CycleInfo {
  /** The cycle path, e.g., "A → B → A" */
  path: string;
  /** Changes involved in the cycle */
  changes: string[];
}

export interface DepsReport {
  hasCycles: boolean;
  cycles: CycleInfo[];
  /** Adjacency list: change name → its dependencies */
  depGraph: Record<string, string[]>;
  summary: string;
}

// ── Parsing ────────────────────────────────────────────────────────

async function loadDependencies(changesDir: string, changeName: string): Promise<string[]> {
  const metaPath = path.join(changesDir, changeName, '.openspec.yaml');
  try {
    const content = await fs.readFile(metaPath, 'utf-8');
    const parsed = parseYaml(content);
    if (parsed && typeof parsed === 'object' && 'depends_on' in parsed) {
      const deps = (parsed as any).depends_on;
      if (Array.isArray(deps)) {
        return deps.filter((d: unknown) => typeof d === 'string' && d.length > 0);
      }
    }
  } catch {
    // No metadata file or unreadable — no dependencies
  }
  return [];
}

// ── Graph Building ─────────────────────────────────────────────────

async function buildDepGraph(
  changesDir: string,
  changeNames: string[]
): Promise<Record<string, string[]>> {
  const graph: Record<string, string[]> = {};

  for (const name of changeNames) {
    graph[name] = [];
  }

  for (const name of changeNames) {
    const deps = await loadDependencies(changesDir, name);
    // Only include dependencies that reference existing active changes
    graph[name] = deps.filter((d) => changeNames.includes(d));
  }

  return graph;
}

// ── DFS Cycle Detection ────────────────────────────────────────────

function detectCycles(graph: Record<string, string[]>): CycleInfo[] {
  const cycles: CycleInfo[] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const parent = new Map<string, string>();

  function dfs(node: string, pathStack: string[]): string[] | null {
    visited.add(node);
    inStack.add(node);
    pathStack.push(node);

    for (const dep of graph[node] || []) {
      if (!visited.has(dep)) {
        parent.set(dep, node);
        const result = dfs(dep, pathStack);
        if (result) return result;
      } else if (inStack.has(dep)) {
        // Found a cycle — extract the cycle path
        const cycleStart = pathStack.indexOf(dep);
        const cyclePath = [...pathStack.slice(cycleStart), dep];
        return cyclePath;
      }
    }

    pathStack.pop();
    inStack.delete(node);
    return null;
  }

  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      const cyclePath = dfs(node, []);
      if (cyclePath) {
        cycles.push({
          path: cyclePath.join(' → '),
          changes: [...new Set(cyclePath)],
        });
      }
    }
  }

  return cycles;
}

// ── Formatting ─────────────────────────────────────────────────────

function formatDepTree(graph: Record<string, string[]>, changeName: string, indent: number = 0): string {
  const prefix = '  '.repeat(indent);
  let result = `${prefix}${changeName}`;

  const deps = graph[changeName] || [];
  if (deps.length > 0) {
    for (const dep of deps) {
      result += '\n' + formatDepTree(graph, dep, indent + 1);
    }
  }

  return result;
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Detect circular dependencies across all active changes.
 *
 * 1. Loads depends_on from each active change's .openspec.yaml
 * 2. Builds a directed graph
 * 3. Runs DFS to find cycles
 * 4. Reports cycles and optionally formats a dependency tree
 */
export async function detectCircularDeps(
  projectRoot: string,
  changesFilter?: string[]
): Promise<DepsReport> {
  const changesDir = path.join(projectRoot, 'openspec', 'changes');

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

  const graph = await buildDepGraph(changesDir, changeNames);
  const cycles = detectCycles(graph);

  const summary = cycles.length > 0
    ? `Detected ${cycles.length} circular dependenc${cycles.length > 1 ? 'ies' : 'y'}: ${cycles.map((c) => c.path).join('; ')}`
    : `No circular dependencies detected across ${changeNames.length} active change(s).`;

  return {
    hasCycles: cycles.length > 0,
    cycles,
    depGraph: graph,
    summary,
  };
}

/**
 * Format a dependency tree for a specific change.
 * Returns a string representation of the dependency tree.
 */
export function formatDependencyTree(graph: Record<string, string[]>, rootName: string): string {
  if (!graph[rootName] || graph[rootName].length === 0) {
    return `${rootName} (no dependencies)`;
  }
  return formatDepTree(graph, rootName);
}

/**
 * Format the full dependency graph for display.
 */
export function formatFullDepTree(graph: Record<string, string[]>): string {
  const lines: string[] = [];
  const roots = Object.keys(graph).sort();

  for (const root of roots) {
    lines.push(formatDependencyTree(graph, root));
  }

  return lines.join('\n');
}
