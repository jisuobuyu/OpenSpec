import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  type SkillTemplate,
  getApplyChangeSkillTemplate,
  getArchiveChangeSkillTemplate,
  getBulkArchiveChangeSkillTemplate,
  getContinueChangeSkillTemplate,
  getExploreSkillTemplate,
  getFeedbackSkillTemplate,
  getFfChangeSkillTemplate,
  getNewChangeSkillTemplate,
  getOnboardSkillTemplate,
  getOpsxApplyCommandTemplate,
  getOpsxArchiveCommandTemplate,
  getOpsxBulkArchiveCommandTemplate,
  getOpsxContinueCommandTemplate,
  getOpsxExploreCommandTemplate,
  getOpsxFfCommandTemplate,
  getOpsxNewCommandTemplate,
  getOpsxOnboardCommandTemplate,
  getOpsxSyncCommandTemplate,
  getOpsxProposeCommandTemplate,
  getOpsxProposeSkillTemplate,
  getOpsxVerifyCommandTemplate,
  getSyncSpecsSkillTemplate,
  getVerifyChangeSkillTemplate,
  getSimplifySkillTemplate,
  getOpsxSimplifyCommandTemplate,
  getReviewSkillTemplate,
  getOpsxReviewCommandTemplate,
  getAbortChangeSkillTemplate,
  getRewindChangeSkillTemplate,
  getUnarchiveChangeSkillTemplate,
  getOpsxAbortCommandTemplate,
  getOpsxRewindCommandTemplate,
  getOpsxUnarchiveCommandTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';

const EXPECTED_FUNCTION_HASHES: Record<string, string> = {
  getExploreSkillTemplate: 'e026179c7d61e0e32c5be3142d8b2bbc1c3968c0932629e57c7e4e9c9f0e63ce',
  getNewChangeSkillTemplate: '5989672758eccf54e3bb554ab97f2c129a192b12bbb7688cc1ffcf6bccb1ae9d',
  getContinueChangeSkillTemplate: 'f2e413f0333dfd6641cc2bd1a189273fdea5c399eecdde98ef528b5216f097b3',
  getApplyChangeSkillTemplate: 'f6d1bab06bf106960b2a7be2e5bb4d98ea226ecb1cb0aa8ae4743ff9e4b1c49b',
  getFfChangeSkillTemplate: '31ad9284b9f4ac1366074bc6ba7aabb90c154db39c685304ed7d7780e0524ff9',
  getSyncSpecsSkillTemplate: 'bded184e4c345619148de2c0ad80a5b527d4ffe45c87cc785889b9329e0f465b',
  getOnboardSkillTemplate: 'c9e719a02d2ae7f74a0e978f9ad4e767c1921248a9e3724c3321c58a15c38ba9',
  getOpsxExploreCommandTemplate: '0f6602131eb3289e4db456f706d5e52ba5082b7a55f475897fe6f5f132e9b376',
  getOpsxNewCommandTemplate: '62eee32d6d81a376e7be845d0891e28e6262ad07482f9bfe6af12a9f0366c364',
  getOpsxContinueCommandTemplate: '8bbaedcc95287f9e822572608137df4f49ad54cedfb08d3342d0d1c4e9716caa',
  getOpsxApplyCommandTemplate: '2b97876085b15f23be99405b0c2c86388cc4b507127f9714134011bf6c3729c8',
  getOpsxFfCommandTemplate: '161598fa457941919b42c30baf93b538c85dc62cb301f4f451ffe878b22eb64c',
  getArchiveChangeSkillTemplate: '83f088bc6c95febd01b9d7cba91aa1c4532978c63e28e90132ab3ff21b53e4e7',
  getBulkArchiveChangeSkillTemplate: '8049897ce1ddb2ff6c0d4b72e22636f9ecfd083b5f2c2a30cf3bb1cb828a2f93',
  getOpsxSyncCommandTemplate: '378d035fe7cc30be3e027b66dcc4b8afc78ef1c8369c39479c9b05a582fb5ccf',
  getVerifyChangeSkillTemplate: 'a39b151e1e3164468688abcb16403302a5a50470cf602707e6e3f4be41c1afd0',
  getOpsxArchiveCommandTemplate: '0b3a9bd2b84ca1391a930085a21777dcedbfdb238e64bacfe8a72948a9fc77f8',
  getOpsxOnboardCommandTemplate: 'fce531f952e939ee85a41848fc21e4cc720b0f3eb62737adc3a51ee6ad2dfc57',
  getOpsxBulkArchiveCommandTemplate: '0d77c82de43840a28c74f5181cb21e33b9a9d00454adf4bc92bdc9e69817d6f5',
  getOpsxVerifyCommandTemplate: 'd1ec69bd247442bfc15cb6d442f0160d72ca0153cbff31e1f80d2f082bb3f758',
  getOpsxProposeSkillTemplate: 'd67f937d44650e9c61d2158c865309fbab23cb3f50a3d4868a640a97776e3999',
  getOpsxProposeCommandTemplate: '41ad59b37eafd7a161bab5c6e41997a37368f9c90b194451295ede5cd42e4d46',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getSimplifySkillTemplate: '30808310a8372608c6021ac422f5ba54cfd18bb160021108159c0a56f2f7985f',
  getOpsxSimplifyCommandTemplate: '1204ce4ad7e93874a7d12fa467a5a8936d9608f1cb89f481f64ac399c74ea954',
  getReviewSkillTemplate: 'd29e287f8e0c5b23e1955d82694612eeb4127a91a3cd921086f167aa988057c3',
  getOpsxReviewCommandTemplate: '4be104c0b8425292dc4ef0453f2be4204de8b9984ef5bbcb42ef0b4389a57a20',
  getAbortChangeSkillTemplate: '026834dc75529590b32069f013164c668f7af3abdb472a4f5d1b494f9fe97817',
  getRewindChangeSkillTemplate: 'c446bfcd983b8780014bfab63807ba8e0c33cd43a00b2221a33186c26d6122a8',
  getUnarchiveChangeSkillTemplate: '129dffb481a6806dacace24103ced80a70654c1593ab037287d949627967eb48',
  getOpsxAbortCommandTemplate: '1b5a9a6cd8d72f7bc43e621d69a30e22fae5762439457dd3a39367d671af3be1',
  getOpsxRewindCommandTemplate: '82698399f06b3cda765e51378610a4609fab77b6778dd0bd38ffa5591ac7e7fd',
  getOpsxUnarchiveCommandTemplate: '3ff16e0f30f214089e6d5da5f830f21b3a3303212e4c14d246d98bb9a1aff849',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '1614c3ab93034afd9712279d152ebb59907c43046f5b01c2dcc4f39c2bae08a7',
  'openspec-new-change': 'c324a7ace1f244aa3f534ac8e3370a2c11190d6d1b85a315f26a211398310f0f',
  'openspec-continue-change': '463cf0b980ec9c3c24774414ef2a3e48e9faa8577bc8748990f45ab3d5efe960',
  'openspec-apply-change': 'bc6b5e96f3d63a52319de7918e49f4e2acd52641e1849d8d243a953d99b75ac3',
  'openspec-ff-change': 'a57497fbd67e502f6c233808827124aed1df43b0805792a4ff825049fd65a44a',
  'openspec-sync-specs': 'b8859cf454379a19ca35dbf59eedca67306607f44a355327f9dc851114e50bde',
  'openspec-archive-change': '458b70104920d8599789bf68e682fbb337bfe37eb91b6bc1ebae28c85506258d',
  'openspec-bulk-archive-change': '10477399bb07c7ba67f78e315bd68fb1901af8866720545baf4c62a6a679493b',
  'openspec-verify-change': '186800a2c79bf3a0dbdfb48f97d03abcfdc0a049f868d029046262114e10c56f',
  'openspec-onboard': 'c1444e026028210efd699110f7e9079bcb486d85ccf27f743213a81cb1084303',
  'openspec-propose': '20e36dabefb90e232bad0667292bd5007ec280f8fc4fc995dbc4282bf45a22e7',
  'openspec-simplify': '5e4c5ca99360bcf9b536cfaaf58f0be9e98bd345080d05033fc001230f5d333e',
  'openspec-review': 'a7226a8700c81a272a4a3ba944fcb462bffc01c6165cf80117a7c0ee9b9f0a63',
  'openspec-abort-change': 'cedd4331e900ebad47a768f37090f78d6203094d64e734aa7b1f48fbd44e1f76',
  'openspec-rewind-change': 'a32ce02b3f8e0d924dde6fc0f6c66b15e20607f05594ef1b84370b5fa1381e30',
  'openspec-unarchive-change': '67040e65a2c282f3849f63c81a9c6befb82bf7a7d747a8546680e4c9276c0bc9',
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);

    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('skill templates split parity', () => {
  it('preserves all template function payloads exactly', () => {
    const functionFactories: Record<string, () => unknown> = {
      getExploreSkillTemplate,
      getNewChangeSkillTemplate,
      getContinueChangeSkillTemplate,
      getApplyChangeSkillTemplate,
      getFfChangeSkillTemplate,
      getSyncSpecsSkillTemplate,
      getOnboardSkillTemplate,
      getOpsxExploreCommandTemplate,
      getOpsxNewCommandTemplate,
      getOpsxContinueCommandTemplate,
      getOpsxApplyCommandTemplate,
      getOpsxFfCommandTemplate,
      getArchiveChangeSkillTemplate,
      getBulkArchiveChangeSkillTemplate,
      getOpsxSyncCommandTemplate,
      getVerifyChangeSkillTemplate,
      getOpsxArchiveCommandTemplate,
      getOpsxOnboardCommandTemplate,
      getOpsxBulkArchiveCommandTemplate,
      getOpsxVerifyCommandTemplate,
      getOpsxProposeSkillTemplate,
      getOpsxProposeCommandTemplate,
      getFeedbackSkillTemplate,
      getSimplifySkillTemplate,
      getOpsxSimplifyCommandTemplate,
      getReviewSkillTemplate,
      getOpsxReviewCommandTemplate,
      getAbortChangeSkillTemplate,
      getRewindChangeSkillTemplate,
      getUnarchiveChangeSkillTemplate,
      getOpsxAbortCommandTemplate,
      getOpsxRewindCommandTemplate,
      getOpsxUnarchiveCommandTemplate,
    };

    const actualHashes = Object.fromEntries(
      Object.entries(functionFactories).map(([name, fn]) => [name, hash(stableStringify(fn()))])
    );

    expect(actualHashes).toEqual(EXPECTED_FUNCTION_HASHES);
  });

  it('preserves generated skill file content exactly', () => {
    // Intentionally excludes getFeedbackSkillTemplate: skillFactories only models templates
    // deployed via generateSkillContent, while feedback is covered in function payload parity.
    const skillFactories: Array<[string, () => SkillTemplate]> = [
      ['openspec-explore', getExploreSkillTemplate],
      ['openspec-new-change', getNewChangeSkillTemplate],
      ['openspec-continue-change', getContinueChangeSkillTemplate],
      ['openspec-apply-change', getApplyChangeSkillTemplate],
      ['openspec-ff-change', getFfChangeSkillTemplate],
      ['openspec-sync-specs', getSyncSpecsSkillTemplate],
      ['openspec-archive-change', getArchiveChangeSkillTemplate],
      ['openspec-bulk-archive-change', getBulkArchiveChangeSkillTemplate],
      ['openspec-verify-change', getVerifyChangeSkillTemplate],
      ['openspec-onboard', getOnboardSkillTemplate],
      ['openspec-propose', getOpsxProposeSkillTemplate],
      ['openspec-simplify', getSimplifySkillTemplate],
      ['openspec-review', getReviewSkillTemplate],
      ['openspec-abort-change', getAbortChangeSkillTemplate],
      ['openspec-rewind-change', getRewindChangeSkillTemplate],
      ['openspec-unarchive-change', getUnarchiveChangeSkillTemplate],
    ];

    const actualHashes = Object.fromEntries(
      skillFactories.map(([dirName, createTemplate]) => [
        dirName,
        hash(generateSkillContent(createTemplate(), 'PARITY-BASELINE')),
      ])
    );

    expect(actualHashes).toEqual(EXPECTED_GENERATED_SKILL_CONTENT_HASHES);
  });
});
