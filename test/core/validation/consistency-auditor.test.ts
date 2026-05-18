import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import {
  consistencyAudit,
  parseTasks,
  parseRequirements,
  parseDesignDecisions,
  checkReVerifyNeeded,
  type AuditInput,
} from '../../../src/core/validation/consistency-auditor.js';

const baseInput: AuditInput = {
  changeName: 'test-change',
  tasks: [],
  specRequirements: [],
  designDecisions: [],
  changedFiles: [],
  hasDesign: false,
  hasSpecs: false,
};

describe('consistency-auditor', () => {
  describe('consistencyAudit', () => {
    it('should return Pass for all dimensions on empty input', () => {
      const report = consistencyAudit(baseInput);
      expect(report.overall).toBe('Pass');
      expect(report.dimensions).toHaveLength(6);
    });

    it('should return Pass when all dimensions pass', () => {
      const input: AuditInput = {
        ...baseInput,
        hasSpecs: true,
        hasDesign: true,
        specRequirements: [{ id: 'REQ-1', name: 'User can login', scenarioCount: 2 }],
        tasks: [
          { id: '1.1', description: 'Add login endpoint', completed: true },
          { id: '1.2', description: 'Add tests', completed: true },
        ],
        designDecisions: ['Use JWT for auth'],
        changedFiles: ['src/auth/login.ts', 'src/auth/login.test.ts'],
        changedFileContents: {
          'src/auth/login.ts': 'export function login() { /* JWT auth */ }',
          'src/auth/login.test.ts': 'describe("login", () => { it("works", () => {}) })',
        },
      };

      const report = consistencyAudit(input);
      expect(report.overall).toBe('Pass');
    });

    it('should detect Critical when spec coverage is below 50%', () => {
      const input: AuditInput = {
        ...baseInput,
        hasSpecs: true,
        specRequirements: [
          { id: 'REQ-1', name: 'User can login', scenarioCount: 1 },
          { id: 'REQ-2', name: 'User can logout', scenarioCount: 1 },
          { id: 'REQ-3', name: 'Password reset', scenarioCount: 2 },
        ],
        changedFiles: ['src/auth/login.ts'],
        changedFileContents: {
          'src/auth/login.ts': 'export function login() {}',
        },
      };

      const report = consistencyAudit(input);
      const specCov = report.dimensions.find((d) => d.dimension === 'Spec Coverage');
      expect(specCov?.severity).toBe('Critical');
    });

    it('should return Warning for no test files with scenarios defined', () => {
      const input: AuditInput = {
        ...baseInput,
        hasSpecs: true,
        specRequirements: [{ id: 'REQ-1', name: 'User can login', scenarioCount: 3 }],
        tasks: [{ id: '1.1', description: 'Implement login', completed: true }],
        changedFiles: ['src/auth/login.ts'],
      };

      const report = consistencyAudit(input);
      const scenario = report.dimensions.find((d) => d.dimension === 'Scenario Completeness');
      expect(scenario?.severity).toBe('Warning');
    });

    it('should return Warning for incomplete tasks', () => {
      const input: AuditInput = {
        ...baseInput,
        tasks: [
          { id: '1.1', description: 'Add login', completed: true },
          { id: '1.2', description: 'Add dashboard', completed: false },
        ],
        changedFiles: ['src/auth/login.ts'],
      };

      const report = consistencyAudit(input);
      const alignment = report.dimensions.find((d) => d.dimension === 'Task Alignment');
      expect(alignment?.severity).toBe('Warning');
    });

    it('should detect scope creep for unexpected paths', () => {
      const input: AuditInput = {
        ...baseInput,
        changedFiles: ['src/auth/login.ts', 'node_modules/leftover.js'],
      };

      const report = consistencyAudit(input);
      const scope = report.dimensions.find((d) => d.dimension === 'Scope Boundary');
      expect(scope?.severity).toBe('Warning');
    });

    it('should warn for large change scope (>30 files)', () => {
      const input: AuditInput = {
        ...baseInput,
        changedFiles: Array.from({ length: 35 }, (_, i) => `src/module/file${i}.ts`),
      };

      const report = consistencyAudit(input);
      const scope = report.dimensions.find((d) => d.dimension === 'Scope Boundary');
      expect(scope?.severity).toBe('Warning');
    });

    it('should return Critical when no design decisions verified in code', () => {
      const input: AuditInput = {
        ...baseInput,
        hasDesign: true,
        designDecisions: ['Use gRPC for service communication', 'Implement event sourcing'],
        changedFiles: ['src/http/rest.ts'],
        changedFileContents: {
          'src/http/rest.ts': 'export function handleRequest() { /* REST handler */ }',
        },
      };

      const report = consistencyAudit(input);
      const design = report.dimensions.find((d) => d.dimension === 'Design Consistency');
      expect(design?.severity).toBe('Critical');
      expect(design?.detail).toContain('None of the 2 design decisions could be verified');
    });

    it('should return Warning when some but not all design decisions verified', () => {
      const input: AuditInput = {
        ...baseInput,
        hasDesign: true,
        designDecisions: ['Use gRPC for service communication', 'Use Redis for caching'],
        changedFiles: ['src/rpc/grpc-server.ts'],
        changedFileContents: {
          'src/rpc/grpc-server.ts': '// gRPC server implementation',
        },
      };

      const report = consistencyAudit(input);
      const design = report.dimensions.find((d) => d.dimension === 'Design Consistency');
      expect(design?.severity).toBe('Warning');
      expect(design?.recommendations.length).toBeGreaterThan(0);
    });

    it('should return Warning for implicit changes (>5 unaccounted symbols)', () => {
      const input: AuditInput = {
        ...baseInput,
        hasSpecs: true,
        specRequirements: [{ id: 'REQ-login', name: 'User can login', scenarioCount: 1 }],
        changedFiles: ['src/misc.ts'],
        changedFileContents: {
          'src/misc.ts': `
            export function exportCSV() {}
            export function sendEmail() {}
            export function generatePDF() {}
            export function parseXML() {}
            export function uploadFile() {}
            export function downloadAsset() {}
            export function syncCalendar() {}
          `,
        },
      };

      const report = consistencyAudit(input);
      const implicit = report.dimensions.find((d) => d.dimension === 'Implicit Change');
      expect(implicit?.severity).toBe('Warning');
      expect(implicit?.detail).toContain('potential implicit changes');
    });

    it('should return Warning when completed tasks have no code changes', () => {
      const input: AuditInput = {
        ...baseInput,
        tasks: [
          { id: '1.1', description: 'Add login', completed: true },
          { id: '1.2', description: 'Add dashboard', completed: true },
        ],
        changedFiles: [], // No code changed
      };

      const report = consistencyAudit(input);
      const alignment = report.dimensions.find((d) => d.dimension === 'Task Alignment');
      expect(alignment?.severity).toBe('Warning');
      expect(alignment?.detail).toContain('marked complete but no changed files');
    });

    it('should return Warning when no scenarios defined in specs', () => {
      const input: AuditInput = {
        ...baseInput,
        hasSpecs: true,
        specRequirements: [{ id: 'REQ-1', name: 'User can login', scenarioCount: 0 }],
        tasks: [{ id: '1.1', description: 'Implement login', completed: true }],
      };

      const report = consistencyAudit(input);
      const scenario = report.dimensions.find((d) => d.dimension === 'Scenario Completeness');
      expect(scenario?.severity).toBe('Warning');
      expect(scenario?.detail).toContain('No scenarios defined');
    });
  });

  describe('parseTasks', () => {
    it('should parse completed and pending tasks', () => {
      const content = `
## 1. Setup

- [x] 1.1 Create project structure
- [ ] 1.2 Add dependencies

## 2. Core

- [x] 2.1 Implement login
- [ ] 2.2 Add validation
`;

      const tasks = parseTasks(content);
      expect(tasks).toHaveLength(4);
      expect(tasks[0]).toEqual({ id: '1.1', description: 'Create project structure', completed: true });
      expect(tasks[1]).toEqual({ id: '1.2', description: 'Add dependencies', completed: false });
      expect(tasks[2]).toEqual({ id: '2.1', description: 'Implement login', completed: true });
      expect(tasks[3]).toEqual({ id: '2.2', description: 'Add validation', completed: false });
    });

    it('should return empty array for no tasks', () => {
      expect(parseTasks('## Notes\nNo tasks here.')).toEqual([]);
    });
  });

  describe('parseRequirements', () => {
    it('should extract requirements and scenario counts', () => {
      const content = `
## ADDED Requirements

### Requirement: User can login
The system SHALL allow users to authenticate.

#### Scenario: Valid credentials
- **WHEN** user enters valid credentials
- **THEN** system returns JWT token

#### Scenario: Invalid credentials
- **WHEN** user enters wrong password
- **THEN** system returns 401

### Requirement: User can logout
The system SHALL allow users to end their session.

#### Scenario: Active session
- **WHEN** user clicks logout
- **THEN** session is terminated
`;

      const reqs = parseRequirements(content);
      expect(reqs).toHaveLength(2);
      expect(reqs[0].name).toBe('User can login');
      expect(reqs[0].scenarioCount).toBe(2);
      expect(reqs[1].name).toBe('User can logout');
      expect(reqs[1].scenarioCount).toBe(1);
    });
  });

  describe('parseDesignDecisions', () => {
    it('should extract decisions from design.md content', () => {
      const content = `
## Decisions

- Use JWT for authentication
- Store sessions in Redis
- Hash passwords with bcrypt
`;

      const decisions = parseDesignDecisions(content);
      expect(decisions).toHaveLength(3);
      expect(decisions).toContain('Use JWT for authentication');
      expect(decisions).toContain('Store sessions in Redis');
    });

    it('should return empty for no decisions section', () => {
      expect(parseDesignDecisions('## Context\nNo decisions here.')).toEqual([]);
    });
  });

  describe('checkReVerifyNeeded', () => {
    let testDir: string;

    beforeEach(async () => {
      testDir = path.join(os.tmpdir(), `openspec-reverify-${randomUUID()}`);
      await fs.mkdir(path.join(testDir, 'openspec', 'changes'), { recursive: true });
      await fs.mkdir(path.join(testDir, 'openspec', 'changes', 'archive'), { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it('should return not needed when no prior verification', async () => {
      const result = await checkReVerifyNeeded('test-change', null, testDir);
      expect(result.needed).toBe(false);
      expect(result.reason).toContain('No prior verification');
    });

    it('should return not needed when no delta specs in change', async () => {
      const result = await checkReVerifyNeeded('test-change', '2026-05-15T10:00:00Z', testDir);
      expect(result.needed).toBe(false);
      expect(result.reason).toContain('No delta specs');
    });

    it('should return not needed when no conflicting archives exist', async () => {
      // Create a change with delta specs
      const changeDir = path.join(testDir, 'openspec', 'changes', 'test-change');
      await fs.mkdir(path.join(changeDir, 'specs', 'auth'), { recursive: true });
      await fs.writeFile(path.join(changeDir, 'specs', 'auth', 'spec.md'), '### Requirement: Login');

      const result = await checkReVerifyNeeded('test-change', '2026-05-15T10:00:00Z', testDir);
      expect(result.needed).toBe(false);
    });

    it('should detect re-verify needed when archive modified same spec after verify', async () => {
      // Create a change with delta specs
      const changeDir = path.join(testDir, 'openspec', 'changes', 'test-change');
      await fs.mkdir(path.join(changeDir, 'specs', 'auth'), { recursive: true });
      await fs.writeFile(path.join(changeDir, 'specs', 'auth', 'spec.md'), '### Requirement: Login');

      // Create an archived change with same spec, archived after verify time
      const archiveDir = path.join(testDir, 'openspec', 'changes', 'archive', '2026-05-16-other-change');
      await fs.mkdir(path.join(archiveDir, 'specs', 'auth'), { recursive: true });
      await fs.writeFile(path.join(archiveDir, 'specs', 'auth', 'spec.md'), '### Requirement: Login');

      // Set archive mtime to be after verify time
      const futureTime = new Date('2026-05-17T00:00:00Z');
      await fs.utimes(archiveDir, futureTime, futureTime);

      const result = await checkReVerifyNeeded('test-change', '2026-05-15T10:00:00Z', testDir);
      expect(result.needed).toBe(true);
      expect(result.reason).toContain('Re-verify recommended');
    });
  });
});
