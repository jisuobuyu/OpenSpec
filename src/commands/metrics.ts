/**
 * Metrics Command
 *
 * Displays engineering discipline metrics collected across changes.
 */

import ora from 'ora';
import chalk from 'chalk';
import { getMetrics, computeAggregates, type MetricsIndicators } from '../core/metrics/collector.js';

export interface MetricsOptions {
  json?: boolean;
}

const INDICATOR_LABELS: Record<keyof MetricsIndicators, string> = {
  specCoverage: 'Spec 覆盖率',
  flowEfficiency: '流转效率',
  defectEscapeRate: '缺陷逃逸率',
  overEngineeringRatio: '过度工程化占比',
  rollbackRate: '回滚率',
  userInterventions: '用户介入次数',
};

const INDICATOR_UNITS: Record<keyof MetricsIndicators, string> = {
  specCoverage: '%',
  flowEfficiency: '%',
  defectEscapeRate: '次/变更',
  overEngineeringRatio: '%',
  rollbackRate: '次/变更',
  userInterventions: '次/变更',
};

function trendSymbol(trend: 'stable' | 'improving' | 'declining'): string {
  switch (trend) {
    case 'improving': return chalk.green('↑');
    case 'declining': return chalk.red('↓');
    default: return chalk.gray('→');
  }
}

export async function metricsCommand(options: MetricsOptions): Promise<void> {
  const spinner = options.json ? undefined : ora('Loading metrics...').start();

  try {
    const projectRoot = process.cwd();
    const store = await getMetrics(projectRoot);

    if (options.json) {
      const aggregates = computeAggregates(store);
      console.log(JSON.stringify({
        version: store.version,
        changeCount: aggregates.changeCount,
        snapshotCount: store.snapshots.length,
        averages: aggregates.averages,
        trends: aggregates.trends,
        snapshots: store.snapshots,
      }, null, 2));
      return;
    }

    spinner?.stop();

    if (store.snapshots.length === 0) {
      console.log(chalk.gray('No metrics collected yet.'));
      console.log(chalk.gray('Metrics are auto-collected by openspec verify --change (specCoverage).'));
      console.log(chalk.gray('Other metrics require manual input via the recordMetrics API.'));
      return;
    }

    const aggregates = computeAggregates(store);

    console.log(chalk.bold('\nEngineering Discipline Metrics'));
    console.log(chalk.gray(`Based on ${aggregates.changeCount} change(s), ${store.snapshots.length} snapshot(s)\n`));

    // Summary table
    console.log(chalk.bold('  指标                   均值       趋势'));
    console.log('  ─────────────────────────────────────────');

    const keys: (keyof MetricsIndicators)[] = [
      'specCoverage',
      'flowEfficiency',
      'defectEscapeRate',
      'overEngineeringRatio',
      'rollbackRate',
      'userInterventions',
    ];

    for (const key of keys) {
      const label = INDICATOR_LABELS[key];
      const value = aggregates.averages[key];
      const unit = INDICATOR_UNITS[key];
      const trend = aggregates.trends[key];
      const symbol = trendSymbol(trend);

      const paddedLabel = label.padEnd(20);
      const paddedValue = `${value}${unit}`.padEnd(10);

      console.log(`  ${paddedLabel} ${paddedValue} ${symbol}`);
    }

    console.log();

    // Latest snapshot detail
    const latest = store.snapshots[store.snapshots.length - 1];
    console.log(chalk.gray(`Latest: ${latest.changeName} (${latest.collectedAt})`));
    console.log();
  } catch (error) {
    spinner?.stop();
    throw error;
  }
}
