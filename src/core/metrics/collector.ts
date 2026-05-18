/**
 * Metrics Collector
 *
 * Collects 6 engineering discipline metrics during verify and archive phases.
 * Data is stored in openspec/.metrics.yaml for trend analysis.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

// ── Types ──────────────────────────────────────────────────────────

export interface MetricsSnapshot {
  /** ISO timestamp when metrics were collected */
  collectedAt: string;
  /** Name of the change these metrics are for */
  changeName: string;
  /** 6 discipline indicators */
  indicators: MetricsIndicators;
}

export interface MetricsIndicators {
  /** Spec coverage: % of requirements with implementation traces (0-100) */
  specCoverage: number;
  /** Flow efficiency: (active time / total cycle time) × 100 */
  flowEfficiency: number;
  /** Defect escape rate: issues found post-archive per change */
  defectEscapeRate: number;
  /** Over-engineering ratio: % of tasks flagged as unnecessary or excessive */
  overEngineeringRatio: number;
  /** Rollback rate: number of rewinds per change */
  rollbackRate: number;
  /** User intervention count: number of manual overrides / decisions per change */
  userInterventions: number;
}

export interface MetricsStore {
  /** Version of the metrics schema */
  version: 1;
  /** All collected snapshots */
  snapshots: MetricsSnapshot[];
}

const METRICS_FILE = '.metrics.yaml';

const DEFAULT_INDICATORS: MetricsIndicators = {
  specCoverage: 0,
  flowEfficiency: 0,
  defectEscapeRate: 0,
  overEngineeringRatio: 0,
  rollbackRate: 0,
  userInterventions: 0,
};

// ── Store Operations ───────────────────────────────────────────────

async function loadStore(projectRoot: string): Promise<MetricsStore> {
  const metricsPath = path.join(projectRoot, 'openspec', METRICS_FILE);
  try {
    const content = await fs.readFile(metricsPath, 'utf-8');
    const parsed = parseYaml(content);
    if (parsed && typeof parsed === 'object') {
      return {
        version: 1,
        snapshots: Array.isArray((parsed as any).snapshots) ? (parsed as any).snapshots : [],
      };
    }
  } catch {
    // No metrics file yet — start fresh
  }
  return { version: 1, snapshots: [] };
}

async function saveStore(projectRoot: string, store: MetricsStore): Promise<void> {
  const openspecDir = path.join(projectRoot, 'openspec');
  await fs.mkdir(openspecDir, { recursive: true });
  const metricsPath = path.join(openspecDir, METRICS_FILE);
  await fs.writeFile(metricsPath, stringifyYaml(store), 'utf-8');
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Record a metrics snapshot for a change.
 *
 * Called automatically by `openspec verify --change` for specCoverage.
 * Other indicators (flowEfficiency, defectEscapeRate, overEngineeringRatio,
 * rollbackRate, userInterventions) require manual input via this API.
 *
 * Only non-zero values are meaningful — pass 0 for indicators
 * that haven't been measured yet.
 */
export async function recordMetrics(
  projectRoot: string,
  changeName: string,
  indicators: Partial<MetricsIndicators>
): Promise<void> {
  const store = await loadStore(projectRoot);
  const merged: MetricsIndicators = { ...DEFAULT_INDICATORS, ...indicators };

  store.snapshots.push({
    collectedAt: new Date().toISOString(),
    changeName,
    indicators: merged,
  });

  await saveStore(projectRoot, store);
}

/**
 * Get all metrics snapshots for analysis.
 */
export async function getMetrics(projectRoot: string): Promise<MetricsStore> {
  return loadStore(projectRoot);
}

/**
 * Compute aggregate metrics across all snapshots.
 */
export function computeAggregates(store: MetricsStore): {
  changeCount: number;
  averages: MetricsIndicators;
  trends: Record<keyof MetricsIndicators, 'stable' | 'improving' | 'declining'>;
} {
  const snapshots = store.snapshots;
  if (snapshots.length === 0) {
    return {
      changeCount: 0,
      averages: { ...DEFAULT_INDICATORS },
      trends: {
        specCoverage: 'stable',
        flowEfficiency: 'stable',
        defectEscapeRate: 'stable',
        overEngineeringRatio: 'stable',
        rollbackRate: 'stable',
        userInterventions: 'stable',
      },
    };
  }

  const keys: (keyof MetricsIndicators)[] = [
    'specCoverage',
    'flowEfficiency',
    'defectEscapeRate',
    'overEngineeringRatio',
    'rollbackRate',
    'userInterventions',
  ];

  // Compute averages
  const averages = { ...DEFAULT_INDICATORS };
  for (const key of keys) {
    const values = snapshots.map((s) => s.indicators[key]);
    averages[key] = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
  }

  // Compute trends (compare first half vs second half)
  const mid = Math.floor(snapshots.length / 2);
  const trends = {} as Record<keyof MetricsIndicators, 'stable' | 'improving' | 'declining'>;

  for (const key of keys) {
    if (snapshots.length < 2) {
      trends[key] = 'stable';
    } else {
      const firstHalfValues = snapshots.slice(0, mid).map((s) => s.indicators[key]);
      const secondHalfValues = snapshots.slice(mid).map((s) => s.indicators[key]);
      const firstAvg = firstHalfValues.reduce((a, b) => a + b, 0) / mid;
      const secondAvg = secondHalfValues.reduce((a, b) => a + b, 0) / (snapshots.length - mid);

      // If first half is all zeros (uninitialized data before collection started),
      // skip trend — avoid penalizing initial rollout where default 0 ≠ "perfect score"
      const firstAllZero = firstHalfValues.every((v) => v === 0);
      if (firstAllZero) {
        trends[key] = 'stable';
        continue;
      }

      const diff = secondAvg - firstAvg;

      // Lower is better for: defectEscapeRate, overEngineeringRatio, rollbackRate, userInterventions
      // Higher is better for: specCoverage, flowEfficiency
      const lowerIsBetter = ['defectEscapeRate', 'overEngineeringRatio', 'rollbackRate', 'userInterventions'].includes(key);

      if (Math.abs(diff) < 0.5) {
        trends[key] = 'stable';
      } else if (lowerIsBetter) {
        trends[key] = diff < 0 ? 'improving' : 'declining';
      } else {
        trends[key] = diff > 0 ? 'improving' : 'declining';
      }
    }
  }

  return { changeCount: snapshots.length, averages, trends };
}

/**
 * Get the latest metrics snapshot for a specific change.
 */
export function getLatestForChange(store: MetricsStore, changeName: string): MetricsSnapshot | null {
  const matching = store.snapshots.filter((s) => s.changeName === changeName);
  if (matching.length === 0) return null;
  return matching[matching.length - 1];
}
