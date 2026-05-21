import { describe, it, expect } from 'vitest';
import {
  parseTasks,
  parseRequirements,
  parseDesignDecisions,
} from '../../../src/core/validation/consistency-auditor.js';

describe('parseTasks', () => {
  it('parses tasks from checkbox format', () => {
    const content = '- [ ] 1.1 Add validation\n- [x] 1.2 Add logging\n';
    const tasks = parseTasks(content);
    expect(tasks.length).toBe(2);
    expect(tasks[0].completed).toBe(false);
    expect(tasks[1].completed).toBe(true);
  });

  it('returns empty array for empty content', () => {
    const tasks = parseTasks('');
    expect(tasks.length).toBe(0);
  });
});

describe('parseRequirements', () => {
  it('parses requirements from spec content', () => {
    const content = `### Requirement: User Auth
Users must authenticate.

#### Scenario: Login success
- **WHEN** valid credentials
- **THEN** user is authenticated
`;
    const reqs = parseRequirements(content);
    expect(reqs.length).toBe(1);
    expect(reqs[0].name).toBe('User Auth');
  });

  it('returns empty array for no requirements', () => {
    const reqs = parseRequirements('No requirements here');
    expect(reqs.length).toBe(0);
  });
});

describe('parseDesignDecisions', () => {
  it('returns an array', () => {
    const decisions = parseDesignDecisions('');
    expect(Array.isArray(decisions)).toBe(true);
  });
});
