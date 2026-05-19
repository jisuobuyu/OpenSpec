import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';
import { ChangeMetadataSchema, type ChangeMetadata } from '../core/artifact-graph/types.js';
import { listSchemas } from '../core/artifact-graph/resolver.js';
import { readProjectConfig } from '../core/project-config.js';

const METADATA_FILENAME = '.openspec.yaml';

/**
 * Error thrown when change metadata validation fails.
 */
export class ChangeMetadataError extends Error {
  constructor(
    message: string,
    public readonly metadataPath: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ChangeMetadataError';
  }
}

/**
 * Validates that a schema name is valid (exists in available schemas).
 *
 * @param schemaName - The schema name to validate
 * @param projectRoot - Optional project root for project-local schema resolution
 * @returns The validated schema name
 * @throws Error if schema is not found
 */
export function validateSchemaName(
  schemaName: string,
  projectRoot?: string
): string {
  const availableSchemas = listSchemas(projectRoot);
  if (!availableSchemas.includes(schemaName)) {
    throw new Error(
      `Unknown schema '${schemaName}'. Available: ${availableSchemas.join(', ')}`
    );
  }
  return schemaName;
}

/**
 * Writes change metadata to .openspec.yaml in the change directory.
 *
 * @param changeDir - The path to the change directory
 * @param metadata - The metadata to write
 * @param projectRoot - Optional project root for project-local schema resolution
 * @throws ChangeMetadataError if validation fails or write fails
 */
export function writeChangeMetadata(
  changeDir: string,
  metadata: ChangeMetadata,
  projectRoot?: string
): void {
  const metaPath = path.join(changeDir, METADATA_FILENAME);

  // Validate schema exists
  validateSchemaName(metadata.schema, projectRoot);

  // Validate with Zod
  const parseResult = ChangeMetadataSchema.safeParse(metadata);
  if (!parseResult.success) {
    throw new ChangeMetadataError(
      `Invalid metadata: ${parseResult.error.message}`,
      metaPath
    );
  }

  // Write YAML file
  const content = yaml.stringify(parseResult.data);
  try {
    fs.writeFileSync(metaPath, content, 'utf-8');
  } catch (err) {
    const ioError = err instanceof Error ? err : new Error(String(err));
    throw new ChangeMetadataError(
      `Failed to write metadata: ${ioError.message}`,
      metaPath,
      ioError
    );
  }
}

/**
 * Reads change metadata from .openspec.yaml in the change directory.
 *
 * @param changeDir - The path to the change directory
 * @param projectRoot - Optional project root for project-local schema resolution
 * @returns The validated metadata, or null if no metadata file exists
 * @throws ChangeMetadataError if the file exists but is invalid
 */
export function readChangeMetadata(
  changeDir: string,
  projectRoot?: string
): ChangeMetadata | null {
  const metaPath = path.join(changeDir, METADATA_FILENAME);

  if (!fs.existsSync(metaPath)) {
    return null;
  }

  let content: string;
  try {
    content = fs.readFileSync(metaPath, 'utf-8');
  } catch (err) {
    const ioError = err instanceof Error ? err : new Error(String(err));
    throw new ChangeMetadataError(
      `Failed to read metadata: ${ioError.message}`,
      metaPath,
      ioError
    );
  }

  let parsed: unknown;
  try {
    parsed = yaml.parse(content);
  } catch (err) {
    const parseError = err instanceof Error ? err : new Error(String(err));
    throw new ChangeMetadataError(
      `Invalid YAML in metadata file: ${parseError.message}`,
      metaPath,
      parseError
    );
  }

  // Validate with Zod
  const parseResult = ChangeMetadataSchema.safeParse(parsed);
  if (!parseResult.success) {
    throw new ChangeMetadataError(
      `Invalid metadata: ${parseResult.error.message}`,
      metaPath
    );
  }

  // Validate that the schema exists
  const availableSchemas = listSchemas(projectRoot);
  if (!availableSchemas.includes(parseResult.data.schema)) {
    throw new ChangeMetadataError(
      `Unknown schema '${parseResult.data.schema}'. Available: ${availableSchemas.join(', ')}`,
      metaPath
    );
  }

  return parseResult.data;
}

/**
 * Resolves the schema for a change, with explicit override taking precedence.
 *
 * Resolution order:
 * 1. Explicit schema (if provided)
 * 2. Schema from .openspec.yaml metadata (if exists)
 * 3. Schema from openspec/config.yaml (if exists)
 * 4. Default 'spec-driven'
 *
 * @param changeDir - The path to the change directory
 * @param explicitSchema - Optional explicit schema override
 * @returns The resolved schema name
 */
export function resolveSchemaForChange(
  changeDir: string,
  explicitSchema?: string
): string {
  // Derive project root from changeDir (changeDir is typically projectRoot/openspec/changes/change-name)
  const projectRoot = path.resolve(changeDir, '../../..');

  // 1. Explicit override wins
  if (explicitSchema) {
    return explicitSchema;
  }

  // 2. Try reading from metadata
  try {
    const metadata = readChangeMetadata(changeDir, projectRoot);
    if (metadata?.schema) {
      return metadata.schema;
    }
  } catch {
    // If metadata read fails, continue to next option
  }

  // 3. Try reading from project config
  try {
    const config = readProjectConfig(projectRoot);
    if (config?.schema) {
      return config.schema;
    }
  } catch {
    // If config read fails, fall back to default
  }

  // 4. Default
  return 'specpower-driven';
}

/**
 * Validates that all depends_on references are valid change names.
 *
 * Checks:
 * 1. Each referenced change exists (in active changes or archive)
 * 2. If checkArchived is true, each dependency must be archived before apply
 *
 * @param changeDir - The path to the change directory
 * @param projectRoot - Project root directory
 * @param checkArchived - If true, verify dependencies are archived (for pre-apply check)
 * @returns Array of warning/error messages (empty = all valid)
 */
export async function validateDependsOn(
  changeDir: string,
  projectRoot: string,
  checkArchived: boolean = false
): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const metadata = readChangeMetadata(changeDir, projectRoot);
  if (!metadata?.depends_on || metadata.depends_on.length === 0) {
    return { valid: true, errors: [], warnings: [] };
  }

  const changesDir = path.join(projectRoot, 'openspec', 'changes');
  const archiveDir = path.join(changesDir, 'archive');

  // Get all known change names (active + archived)
  const knownChanges = new Set<string>();

  try {
    const { promises: fs } = await import('fs');
    const entries = await fs.readdir(changesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== 'archive' && entry.name !== 'aborted' && !entry.name.startsWith('.')) {
        knownChanges.add(entry.name);
      }
    }

    // Also check archive
    try {
      const archiveEntries = await fs.readdir(archiveDir, { withFileTypes: true });
      for (const entry of archiveEntries) {
        if (entry.isDirectory()) {
          // Strip date prefix: "2026-05-15-change-name" → "change-name"
          const nameMatch = entry.name.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
          const cleanName = nameMatch ? nameMatch[1] : entry.name;
          knownChanges.add(cleanName);
        }
      }
    } catch {
      // No archive dir
    }
  } catch {
    // Can't read changes dir
  }

  for (const dep of metadata.depends_on) {
    if (!knownChanges.has(dep)) {
      warnings.push(`Dependency "${dep}" not found in active or archived changes.`);
    }

    if (checkArchived) {
      // Check if this dependency is archived
      const isArchived = await (async () => {
        try {
          const { promises: fs } = await import('fs');
          const archiveEntries = await fs.readdir(archiveDir, { withFileTypes: true });
          for (const entry of archiveEntries) {
            if (entry.isDirectory()) {
              const nameMatch = entry.name.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
              const cleanName = nameMatch ? nameMatch[1] : entry.name;
              if (cleanName === dep) return true;
            }
          }
        } catch {}
        return false;
      })();

      if (!isArchived) {
        errors.push(
          `Dependency "${dep}" is not yet archived. Archive it before applying this change.`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
