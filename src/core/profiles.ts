/**
 * Profile System
 *
 * Defines workflow profiles that control which workflows are installed.
 * Profiles determine WHICH workflows; delivery (in global config) determines HOW.
 */

import type { Profile } from './global-config.js';

/**
 * Core workflows included in the 'core' profile.
 * These provide the streamlined experience for new users.
 */
export const CORE_WORKFLOWS = ['propose', 'explore', 'apply', 'sync', 'archive'] as const;

/**
 * Enhanced workflows added on top of core for 'enhanced' and 'strict' profiles.
 */
export const ENHANCED_WORKFLOWS = [
  'new',
  'continue',
  'ff',
  'verify',
  'review',
  'simplify',
  'abort',
  'rewind',
  'unarchive',
] as const;

/**
 * All available workflows in the system.
 */
export const ALL_WORKFLOWS = [
  ...CORE_WORKFLOWS,
  ...ENHANCED_WORKFLOWS,
  'bulk-archive',
  'onboard',
] as const;

export type WorkflowId = (typeof ALL_WORKFLOWS)[number];
export type CoreWorkflowId = (typeof CORE_WORKFLOWS)[number];

/**
 * Resolves which workflows should be active for a given profile configuration.
 *
 * - 'core' profile always returns CORE_WORKFLOWS
 * - 'enhanced' profile returns CORE_WORKFLOWS + ENHANCED_WORKFLOWS
 * - 'strict' profile returns the same set as enhanced (discipline level enforces behavior)
 * - 'custom' profile returns the provided customWorkflows, or empty array if not provided
 */
export function getProfileWorkflows(
  profile: Profile,
  customWorkflows?: string[]
): readonly string[] {
  if (profile === 'enhanced' || profile === 'strict') {
    return [...CORE_WORKFLOWS, ...ENHANCED_WORKFLOWS];
  }
  if (profile === 'custom') {
    return customWorkflows ?? [];
  }
  return CORE_WORKFLOWS;
}
