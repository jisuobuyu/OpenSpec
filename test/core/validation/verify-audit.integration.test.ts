/**
 * Integration tests for programmatic consistency audit.
 *
 * Uses E2E fixtures (test/fixtures/e2e-change/) with real artifact files
 * to verify the full audit pipeline: parse → audit → report.
 */

import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  consistencyAudit,
  parseTasks,
  parseRequirements,
  parseDesignDecisions,
  type AuditInput,
} from '../../../src/core/validation/consistency-auditor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('verify-audit integration', () => {
  const fixtureDir = path.resolve(__dirname, '../../fixtures/e2e-change');
  const changeDir = path.join(fixtureDir, 'openspec', 'changes', 'add-dark-mode');

  let auditInput: AuditInput;

  it('should parse tasks from fixture', async () => {
    const content = await fs.readFile(path.join(changeDir, 'tasks.md'), 'utf-8');
    const tasks = parseTasks(content);
    expect(tasks).toHaveLength(5);
    expect(tasks.filter((t) => t.completed)).toHaveLength(5);
    expect(tasks[0].id).toBe('1.1');
    expect(tasks[2].description).toContain('theme toggle');
  });

  it('should parse requirements from fixture specs', async () => {
    const specsDir = path.join(changeDir, 'specs');
    let allContent = '';
    const entries = await fs.readdir(specsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        allContent += await fs.readFile(path.join(specsDir, entry.name, 'spec.md'), 'utf-8');
      }
    }
    const reqs = parseRequirements(allContent);
    expect(reqs).toHaveLength(2);
    expect(reqs[0].name).toBe('User can toggle between light and dark theme');
    expect(reqs[0].scenarioCount).toBe(2);
    expect(reqs[1].scenarioCount).toBe(1);
  });

  it('should parse design decisions from fixture', async () => {
    const content = await fs.readFile(path.join(changeDir, 'design.md'), 'utf-8');
    const decisions = parseDesignDecisions(content);
    expect(decisions).toHaveLength(3);
    expect(decisions).toContain('Use CSS variables for theming instead of CSS-in-JS');
    expect(decisions).toContain('Store theme preference in localStorage');
    expect(decisions).toContain('Use React Context for theme state management');
  });

  it('should run full consistency audit against fixture', async () => {
    // Parse all artifacts
    const tasksContent = await fs.readFile(path.join(changeDir, 'tasks.md'), 'utf-8');
    const tasks = parseTasks(tasksContent);

    const specsDir = path.join(changeDir, 'specs');
    let specsContent = '';
    const entries = await fs.readdir(specsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        specsContent += await fs.readFile(path.join(specsDir, entry.name, 'spec.md'), 'utf-8');
      }
    }
    const specRequirements = parseRequirements(specsContent);

    const designContent = await fs.readFile(path.join(changeDir, 'design.md'), 'utf-8');
    const designDecisions = parseDesignDecisions(designContent);

    // Simulate implementation files (like git diff output)
    const changedFiles = [
      'src/theme/ThemeContext.tsx',
      'src/theme/ThemeToggle.tsx',
      'src/theme/theme.css',
      'src/theme/ThemeContext.test.tsx',
    ];
    const changedFileContents: Record<string, string> = {
      'src/theme/ThemeContext.tsx': `
        import React, { createContext, useContext, useState, useEffect } from 'react';
        // Uses CSS variables for theming
        // Stores theme preference in localStorage
        export function ThemeProvider({ children }) {
          const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
          return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
        }
      `,
      'src/theme/ThemeToggle.tsx': `
        export function ThemeToggle() {
          const { theme, setTheme } = useTheme();
          return <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>Toggle</button>;
        }
      `,
      'src/theme/ThemeContext.test.tsx': `
        describe('ThemeContext', () => {
          it('should toggle between themes', () => {});
          it('should persist preference', () => {});
        });
      `,
    };

    const input: AuditInput = {
      changeName: 'add-dark-mode',
      tasks,
      specRequirements,
      designDecisions,
      changedFiles,
      changedFileContents,
      hasDesign: true,
      hasSpecs: true,
    };

    const report = consistencyAudit(input);

    // All 6 dimensions should be present
    expect(report.dimensions).toHaveLength(6);

    // Key assertions
    const specCov = report.dimensions.find((d) => d.dimension === 'Spec Coverage')!;
    expect(specCov).toBeDefined();
    // Requirements reference: "User can toggle" and "Theme preference persists"
    // Files include "ThemeToggle" and "ThemeContext" → should match keywords
    expect(specCov.severity).toBe('Pass');

    const scenario = report.dimensions.find((d) => d.dimension === 'Scenario Completeness')!;
    expect(scenario).toBeDefined();
    // Should find test file since ThemeContext.test.tsx is in changed files
    expect(scenario.severity).toBe('Pass');

    const taskAlign = report.dimensions.find((d) => d.dimension === 'Task Alignment')!;
    expect(taskAlign).toBeDefined();
    // All 5 tasks completed
    expect(taskAlign.severity).toBe('Pass');

    const designConsistency = report.dimensions.find((d) => d.dimension === 'Design Consistency')!;
    expect(designConsistency).toBeDefined();
    // CSS variables, localStorage, React Context are all in the implementation
    expect(designConsistency.severity).toBe('Pass');

    const scope = report.dimensions.find((d) => d.dimension === 'Scope Boundary')!;
    expect(scope).toBeDefined();
    expect(scope.severity).toBe('Pass');

    const implicit = report.dimensions.find((d) => d.dimension === 'Implicit Change')!;
    expect(implicit).toBeDefined();

    // Overall should be Pass since all dimensions pass
    expect(report.overall).toBe('Pass');
    expect(report.summary).toContain('All 6 dimensions pass');
  });
});
