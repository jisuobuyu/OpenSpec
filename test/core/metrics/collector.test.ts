import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import {
  recordMetrics,
  getMetrics,
  computeAggregates,
  getLatestForChange,
} from '../../../src/core/metrics/collector.js';

describe('metrics-collector', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-metrics-${randomUUID()}`);
    await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should record a metrics snapshot', async () => {
    await recordMetrics(testDir, 'test-change', {
      specCoverage: 85,
      flowEfficiency: 70,
    });

    const store = await getMetrics(testDir);
    expect(store.snapshots).toHaveLength(1);
    expect(store.snapshots[0].changeName).toBe('test-change');
    expect(store.snapshots[0].indicators.specCoverage).toBe(85);
    expect(store.snapshots[0].indicators.flowEfficiency).toBe(70);
    // Defaults for unset fields
    expect(store.snapshots[0].indicators.defectEscapeRate).toBe(0);
  });

  it('should accumulate multiple snapshots', async () => {
    await recordMetrics(testDir, 'change-a', { specCoverage: 80 });
    await recordMetrics(testDir, 'change-b', { specCoverage: 90 });

    const store = await getMetrics(testDir);
    expect(store.snapshots).toHaveLength(2);
    expect(store.snapshots[0].changeName).toBe('change-a');
    expect(store.snapshots[1].changeName).toBe('change-b');
  });

  it('should compute aggregates correctly', () => {
    const store = {
      version: 1 as const,
      snapshots: [
        {
          collectedAt: '2026-01-01T00:00:00Z',
          changeName: 'a',
          indicators: {
            specCoverage: 80, flowEfficiency: 60, defectEscapeRate: 1,
            overEngineeringRatio: 10, rollbackRate: 0, userInterventions: 2,
          },
        },
        {
          collectedAt: '2026-02-01T00:00:00Z',
          changeName: 'b',
          indicators: {
            specCoverage: 90, flowEfficiency: 80, defectEscapeRate: 0,
            overEngineeringRatio: 5, rollbackRate: 1, userInterventions: 1,
          },
        },
      ],
    };

    const agg = computeAggregates(store);
    expect(agg.changeCount).toBe(2);
    expect(agg.averages.specCoverage).toBe(85);
    expect(agg.averages.flowEfficiency).toBe(70);
    expect(agg.averages.defectEscapeRate).toBe(0.5);
    expect(agg.averages.overEngineeringRatio).toBe(7.5);
    expect(agg.averages.rollbackRate).toBe(0.5);
    expect(agg.averages.userInterventions).toBe(1.5);
  });

  it('should return stable trends for empty store', () => {
    const store = { version: 1 as const, snapshots: [] };
    const agg = computeAggregates(store);
    expect(agg.changeCount).toBe(0);
    expect(agg.trends.specCoverage).toBe('stable');
  });

  it('should return stable trends for single snapshot', () => {
    const store = {
      version: 1 as const,
      snapshots: [{
        collectedAt: '2026-01-01T00:00:00Z',
        changeName: 'a',
        indicators: {
          specCoverage: 80, flowEfficiency: 60, defectEscapeRate: 1,
          overEngineeringRatio: 10, rollbackRate: 0, userInterventions: 2,
        },
      }],
    };
    const agg = computeAggregates(store);
    expect(agg.trends.specCoverage).toBe('stable');
  });

  it('should detect improving trends', () => {
    const store = {
      version: 1 as const,
      snapshots: [
        { collectedAt: '2026-01-01T00:00:00Z', changeName: 'a', indicators: { specCoverage: 50, flowEfficiency: 50, defectEscapeRate: 3, overEngineeringRatio: 20, rollbackRate: 2, userInterventions: 5 } },
        { collectedAt: '2026-02-01T00:00:00Z', changeName: 'b', indicators: { specCoverage: 90, flowEfficiency: 90, defectEscapeRate: 0, overEngineeringRatio: 5, rollbackRate: 0, userInterventions: 1 } },
      ],
    };
    const agg = computeAggregates(store);
    expect(agg.trends.specCoverage).toBe('improving');
    expect(agg.trends.defectEscapeRate).toBe('improving');
  });

  it('should find latest snapshot for a change', () => {
    const store = {
      version: 1 as const,
      snapshots: [
        { collectedAt: '2026-01-01T00:00:00Z', changeName: 'change-x', indicators: { specCoverage: 50, flowEfficiency: 50, defectEscapeRate: 0, overEngineeringRatio: 0, rollbackRate: 0, userInterventions: 0 } },
        { collectedAt: '2026-01-02T00:00:00Z', changeName: 'change-x', indicators: { specCoverage: 80, flowEfficiency: 70, defectEscapeRate: 0, overEngineeringRatio: 0, rollbackRate: 0, userInterventions: 0 } },
        { collectedAt: '2026-01-03T00:00:00Z', changeName: 'change-y', indicators: { specCoverage: 90, flowEfficiency: 90, defectEscapeRate: 0, overEngineeringRatio: 0, rollbackRate: 0, userInterventions: 0 } },
      ],
    };
    const latest = getLatestForChange(store, 'change-x');
    expect(latest).not.toBeNull();
    expect(latest!.indicators.specCoverage).toBe(80);
  });

  it('should return null for unknown change', () => {
    const store = { version: 1 as const, snapshots: [] };
    expect(getLatestForChange(store, 'unknown')).toBeNull();
  });

  it('should handle partial indicators (only specCoverage provided)', async () => {
    await recordMetrics(testDir, 'partial-change', {
      specCoverage: 75,
    });

    const store = await getMetrics(testDir);
    expect(store.snapshots).toHaveLength(1);
    expect(store.snapshots[0].indicators.specCoverage).toBe(75);
    // Unset fields default to 0
    expect(store.snapshots[0].indicators.flowEfficiency).toBe(0);
    expect(store.snapshots[0].indicators.defectEscapeRate).toBe(0);
  });

  it('should handle multiple recordings for the same change', async () => {
    await recordMetrics(testDir, 'same-change', { specCoverage: 50 });
    await recordMetrics(testDir, 'same-change', { specCoverage: 90 });

    const store = await getMetrics(testDir);
    expect(store.snapshots).toHaveLength(2);
    // Latest should be 90
    const latest = getLatestForChange(store, 'same-change');
    expect(latest!.indicators.specCoverage).toBe(90);
  });

  it('should handle recording with empty indicators gracefully', async () => {
    await recordMetrics(testDir, 'empty-change', {});

    const store = await getMetrics(testDir);
    expect(store.snapshots).toHaveLength(1);
    // All defaults
    const ind = store.snapshots[0].indicators;
    expect(ind.specCoverage).toBe(0);
    expect(ind.flowEfficiency).toBe(0);
    expect(ind.defectEscapeRate).toBe(0);
  });
});
