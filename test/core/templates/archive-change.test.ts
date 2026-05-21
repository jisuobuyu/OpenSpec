import { describe, it, expect } from 'vitest';
import {
  getArchiveChangeSkillTemplate,
  getOpsxArchiveCommandTemplate,
} from '../../../src/core/templates/skill-templates.js';

describe('getArchiveChangeSkillTemplate', () => {
  const template = getArchiveChangeSkillTemplate();
  const instructions = template.instructions;

  it('has correct metadata', () => {
    expect(template.name).toBe('openspec-archive-change');
  });

  // Task 2.1: Verify gate
  it('contains three-way verify gate', () => {
    expect(instructions).toContain('If verification has NOT been run');
    expect(instructions).toContain('Verification failed');
    expect(instructions).toContain('Fix issues and re-verify before archiving');
    expect(instructions).toContain('HARD BLOCK');
    expect(instructions).toContain('If verification PASSED');
  });

  // Task 2.2: Final commit
  it('contains final commit step before archive move', () => {
    expect(instructions).toContain('Create final commit');
    expect(instructions).toContain('git add -A');
    expect(instructions).toContain('git commit');
    expect(instructions).toContain('feat(<change-name>)');
  });

  it('commit message includes Changes list', () => {
    expect(instructions).toContain('Changes:');
    expect(instructions).toContain('<task-id>: <task description>');
  });

  it('commit message includes Verify and Review status', () => {
    expect(instructions).toContain('Verify:');
    expect(instructions).toContain('Review:');
  });

  // Task 3.4: Pre-commit validation
  it('contains pre-commit validation against unmarked tasks', () => {
    expect(instructions).toContain('Pre-commit validation');
    expect(instructions).toContain('openspec instructions apply');
    expect(instructions).toContain('progress.remaining');
    expect(instructions).toContain('task(s) still unmarked');
  });
});

describe('getOpsxArchiveCommandTemplate', () => {
  const template = getOpsxArchiveCommandTemplate();
  const content = template.content;

  it('has correct metadata', () => {
    expect(template.name).toBe('OPSX: Archive');
  });

  it('contains verify gate in step 3', () => {
    expect(content).toContain('three-way gate');
    expect(content).toContain('BLOCK');
  });

  it('contains final commit step', () => {
    expect(content).toContain('Create final commit');
    expect(content).toContain('git commit');
  });
});
