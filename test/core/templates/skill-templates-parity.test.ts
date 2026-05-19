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
  getExploreSkillTemplate: '7fd94073192882cc2381b75d6e4a1a3cdd9f91f9fe51ff48009db5024dff31b4',
  getNewChangeSkillTemplate: '5989672758eccf54e3bb554ab97f2c129a192b12bbb7688cc1ffcf6bccb1ae9d',
  getContinueChangeSkillTemplate: 'f2e413f0333dfd6641cc2bd1a189273fdea5c399eecdde98ef528b5216f097b3',
  getApplyChangeSkillTemplate: '917818df0ce99986fb260fb9317cfd30d96faf7dc086d132085cc064fcc514e3',
  getFfChangeSkillTemplate: 'd539c4a2dcb80dba48cab51732279e141ce43c6d7ba5388b835dd9f570bdb5c3',
  getSyncSpecsSkillTemplate: 'bded184e4c345619148de2c0ad80a5b527d4ffe45c87cc785889b9329e0f465b',
  getOnboardSkillTemplate: 'c9e719a02d2ae7f74a0e978f9ad4e767c1921248a9e3724c3321c58a15c38ba9',
  getOpsxExploreCommandTemplate: '317897745ec6c97284b321aed9d4b6f8fb1f980b9c7729b51b9503132fbf83b7',
  getOpsxNewCommandTemplate: '62eee32d6d81a376e7be845d0891e28e6262ad07482f9bfe6af12a9f0366c364',
  getOpsxContinueCommandTemplate: '8bbaedcc95287f9e822572608137df4f49ad54cedfb08d3342d0d1c4e9716caa',
  getOpsxApplyCommandTemplate: '5b6495dffabe555cee0668a6488ea2f1bae9cf7bd133968c067e0b0d3b35004a',
  getOpsxFfCommandTemplate: 'c1ecb757becd7b34f49a2eddbc89efa5bd08c17347d63871a380dc40d6735502',
  getArchiveChangeSkillTemplate: '5afccf3cf4a69986ae6d329469bf88689ea5e9bbf95b2c9716c84c0800c18463',
  getBulkArchiveChangeSkillTemplate: '8049897ce1ddb2ff6c0d4b72e22636f9ecfd083b5f2c2a30cf3bb1cb828a2f93',
  getOpsxSyncCommandTemplate: '378d035fe7cc30be3e027b66dcc4b8afc78ef1c8369c39479c9b05a582fb5ccf',
  getVerifyChangeSkillTemplate: 'e11e97ccd7e1f3b7e7ec54622073b52109e190ad1be4b70e0f02e1f464ea3d74',
  getOpsxArchiveCommandTemplate: 'f6e648c498efd63956d0ddaf8b25269b3ea9ffc2c12bd16e658be6fe57c729fb',
  getOpsxOnboardCommandTemplate: 'fce531f952e939ee85a41848fc21e4cc720b0f3eb62737adc3a51ee6ad2dfc57',
  getOpsxBulkArchiveCommandTemplate: '0d77c82de43840a28c74f5181cb21e33b9a9d00454adf4bc92bdc9e69817d6f5',
  getOpsxVerifyCommandTemplate: 'd1ec69bd247442bfc15cb6d442f0160d72ca0153cbff31e1f80d2f082bb3f758',
  getOpsxProposeSkillTemplate: 'd67f937d44650e9c61d2158c865309fbab23cb3f50a3d4868a640a97776e3999',
  getOpsxProposeCommandTemplate: '41ad59b37eafd7a161bab5c6e41997a37368f9c90b194451295ede5cd42e4d46',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getSimplifySkillTemplate: 'd5f50d488a92e836629f528811122c2ed7d33fe0e51fb3fc55402fcbf15d2e3f',
  getOpsxSimplifyCommandTemplate: 'ab22f8be15c542ad36a6447b9f10a5ac74f0e13b53990867b36561514a0770f9',
  getReviewSkillTemplate: 'e7ae656d50131202478535fd9de92958994fefeff227d4e0025525c12c8c67bd',
  getOpsxReviewCommandTemplate: '4be104c0b8425292dc4ef0453f2be4204de8b9984ef5bbcb42ef0b4389a57a20',
  getAbortChangeSkillTemplate: '026834dc75529590b32069f013164c668f7af3abdb472a4f5d1b494f9fe97817',
  getRewindChangeSkillTemplate: 'c446bfcd983b8780014bfab63807ba8e0c33cd43a00b2221a33186c26d6122a8',
  getUnarchiveChangeSkillTemplate: '129dffb481a6806dacace24103ced80a70654c1593ab037287d949627967eb48',
  getOpsxAbortCommandTemplate: '1b5a9a6cd8d72f7bc43e621d69a30e22fae5762439457dd3a39367d671af3be1',
  getOpsxRewindCommandTemplate: '82698399f06b3cda765e51378610a4609fab77b6778dd0bd38ffa5591ac7e7fd',
  getOpsxUnarchiveCommandTemplate: '3ff16e0f30f214089e6d5da5f830f21b3a3303212e4c14d246d98bb9a1aff849',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '66c7ec42fc867fe52340fac492e5dd8b4890853a14cdcc11df465f8c8028be97',
  'openspec-new-change': 'c324a7ace1f244aa3f534ac8e3370a2c11190d6d1b85a315f26a211398310f0f',
  'openspec-continue-change': '463cf0b980ec9c3c24774414ef2a3e48e9faa8577bc8748990f45ab3d5efe960',
  'openspec-apply-change': '50e34686ec149fb00442229aafc6f5cef72aaa15e10b0dd653ceed6983bd78ca',
  'openspec-ff-change': '0327cf587058b23330b40fbf31c672bd7473dcb5d282f809d6dedd397c40903d',
  'openspec-sync-specs': 'b8859cf454379a19ca35dbf59eedca67306607f44a355327f9dc851114e50bde',
  'openspec-archive-change': '4b413c536d06bacbb862dfc048ce2918a5912e18763e2866cb5ca9db4e153dfc',
  'openspec-bulk-archive-change': '10477399bb07c7ba67f78e315bd68fb1901af8866720545baf4c62a6a679493b',
  'openspec-verify-change': 'de4fe7091713ace37763a93eeb0644271a92c93312ddd233a0124623b93ae23c',
  'openspec-onboard': 'c1444e026028210efd699110f7e9079bcb486d85ccf27f743213a81cb1084303',
  'openspec-propose': '20e36dabefb90e232bad0667292bd5007ec280f8fc4fc995dbc4282bf45a22e7',
  'openspec-simplify': 'b64210fdb1cbf51bfbd83a4915e09fe77d1fefa5323939a5fbbda824d41563a2',
  'openspec-review': '9dfe1c6713045546f3f5c5e6d470aaae1b45bddff9000191bdd05827b15dc122',
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
