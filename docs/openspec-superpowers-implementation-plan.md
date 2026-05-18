# OpenSpec × Superpowers 融合实施方案

> 基于 [设计规格 vFinal](./openspec-superpowers-fusion.md)，`@fission-ai/openspec` v1.3.1。  
> **核心架构**：OpenSpec **编排**已有 Superpowers 技能（`Skill({...})`），**非重新实现**工程纪律。  
> **状态：全部实施完成**

**文档导航**：  
→ 想**了解设计思路**？阅读 [设计规格](./openspec-superpowers-fusion.md)  
→ 想**安装部署**？阅读 [安装指南](./openspec-superpowers-installation.md)  
→ 想**学习使用**？阅读 [使用手册](./openspec-superpowers-usage-guide.md)  
→ 想**了解实施过程**？你在看的正是实施方案

## 实施总览

| Phase | 名称 | Tasks | 状态 |
|-------|------|-------|------|
| **P0** | Schema & Config 基础设施 | 4 | ✅ 已完成 |
| **P1** | Apply 编排 + TDD 级别 + Simplify 集成 | 6 | ✅ 已完成 |
| **P2** | Verify 双层 + Review 编排 | 4 | ✅ 已完成 |
| **P3** | 生命周期完整性（abort/rewind/unarchive） | 5 | ✅ 已完成 |
| **P4** | 并行安全（冲突检测 + 依赖管理） | 5 | ✅ 已完成 |
| **P5** | 技能降级 + 会话恢复 + 度量 | 4 | ✅ 已完成 |
| **P6** | 兼容性 + 测试 + 文档 | 3 | ✅ 已完成 |

**总计**：31 tasks，全部完成。

```
P0 ──┬── P1 ── P2 ──┬── P5 ── P6 (P5 仅需 P1/P2 模板就绪，不等 P3/P4)
      │               │
      ├── P3 ─────────┘
      │
      └── P4
```

---

## P0：Schema & Config 基础设施

**目标**：`superpowers` schema 可被系统加载，`config.yaml` 支持 `discipline` 配置，profile 支持 `enhanced`/`strict`。

> **无需注册步骤**：`schemas/superpowers/schema.yaml` 放入包根目录即自动被 `resolver.ts` 发现为 built-in schema。

### Task 0.1 — 新建 `superpowers` schema YAML + 模板目录

| 维度 | 内容 |
|------|------|
| **新建** | `schemas/superpowers/schema.yaml` |
| **内容** | 7 artifacts（proposal, exploration, specs, design, tasks, review）+ apply / verify / archive 三阶段（对标设计规格 Section 4） |
| **参照** | `schemas/spec-driven/schema.yaml`（line 1-154） |
| **新建** | `schemas/superpowers/templates/` 下 7 个模板文件：`proposal.md`, `exploration.md`, `specs.md`, `design.md`, `tasks.md`, `review.md`（exploration 和 review 为 optional artifact 模板） |
| **验收** | `openspec validate` 不报错；`openspec templates --schema superpowers` 列出 7 个模板路径 |

### Task 0.2 — 扩展 `ProjectConfigSchema` + `readProjectConfig()` 支持 `discipline`

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/project-config.ts`（`ProjectConfigSchema` 定义在 line 19-41，parse 逻辑在 line 66-161） |
| **改动** | ① `ProjectConfigSchema` 新增可选 `discipline` 节点（`level`, `tdd.default`, `subagent.mode`, `worktree.enabled`, `exploration.search_history`）② `readProjectConfig()` 中追加 discipline 的 safeParse |
| **向后兼容** | 全部字段 optional + 默认值（level=core, tdd=adaptive, subagent=adaptive, worktree=true, exploration.search_history=false） |
| **验收** | 纯 `schema: spec-driven` 的 config 解析通过；完整 discipline 节的 config 解析通过 |

### Task 0.3 — 扩展 `GlobalConfigSchema` profile enum + `getProfileWorkflows()`

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/config-schema.ts`（line 13-16: profile enum）+ `src/core/profiles.ts`（line 14-50） |
| **改动** | `profile` enum: `['core', 'enhanced', 'strict', 'custom']`；`getProfileWorkflows()` 新增 enhanced/strict 映射 |
| **Workflow 分配** | enhanced = CORE_WORKFLOWS + `['new', 'continue', 'ff', 'verify', 'review', 'simplify', 'abort', 'rewind', 'unarchive']`；strict = enhanced |
| **验收** | `openspec init --profile enhanced` 生成对应 skill/command 文件数量 |

### Task 0.4 — 扩展 `SchemaYamlSchema` + `ChangeMetadataSchema`

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/artifact-graph/types.ts`（`SchemaYamlSchema` line 24-31, `ChangeMetadataSchema` line 41-52） |
| **改动** | ① `SchemaYamlSchema` 新增 `verify`/`archive` 可选 phase（复用 `ApplyPhaseSchema` 结构，optional）② `ChangeMetadataSchema` 新增 `depends_on: string[]`（optional）, `last_checkpoint: string`（optional） |
| **向后兼容** | 全部 optional；现有 spec-driven schema.yaml 加载不受影响 |
| **验收** | superpowers schema.yaml 通过 Zod 校验；含 `depends_on` 的 `.openspec.yaml` 解析正确 |

**P0 验收标准**：`openspec init --schema superpowers --profile enhanced` 创建项目 → 生成全部 skill/command 文件 → `openspec status` 正常显示 artifact 状态。

---

## P1：Apply 编排 + TDD 级别 + Simplify 集成

**目标**：`/opsx:apply` 工作流模板调用 Superpowers 技能（TDD、simplify），OpenSpec 负责 TDD 级别选择、状态追踪、spec 上下文注入。

> **架构原则**：apply 模板是薄编排层。它告诉 AI **何时调用哪个技能**，不内置 TDD/Simplify 的指令。

### Task 1.1 — 编写 `tasks.md` 模板（TDD 级别 + spec-ref 标注）

| 维度 | 内容 |
|------|------|
| **文件** | `schemas/superpowers/templates/tasks.md` |
| **内容** | 支持 `[TDD: Full]` / `[TDD: Lite]` / `[TDD: Skip]` 标注；可选 `[Spec: REQ-xxx]` 标注（实现 Section 2.6.1 的 spec 上下文精确注入）；Full TDD task 展开 RED→GREEN→REFACTOR 子 checklist |
| **验收** | AI 读取 tasks.md 时可解析 TDD 级别和 spec-ref 标注；无标注回退到默认行为 |

### Task 1.2 — 编写 `apply` workflow 模板（编排核心）

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/templates/workflows/apply-change.ts` |
| **内容** | 外循环（task 迭代器）+ Pre-context / Skill 执行 / Post-checkpoint 三段式结构。关键指令：① 声明"你是 OpenSpec apply 外循环的 controller" ② 每次只处理一个 task ③ `[TDD: Full]` → `Skill({skill: "test-driven-development"})`；`[TDD: Lite]` → 技能 + 例外提示；`[TDD: Skip]` → 直接修改 ④ Post-checkpoint：更新 checkbox + 触发 simplify + 读下一个 task ⑤ `[Spec: REQ-xxx]` → 提取对应 requirement block 注入 pre-context ⑥ apply 开始时快照 `config.yaml` 的 discipline 配置，整个 change 使用一致配置（防热变更，对标设计规格 Section 8.5） |
| **参照** | 设计规格 Section 2.6 (完整控制流架构) + Section 8.5 (Config 热变更) |
| **验收** | 生成的 `.claude/commands/opsx/apply.md` 包含外循环声明、skill 调用指令、post-checkpoint 逻辑 |

### Task 1.3 — 编写 `simplify` workflow 模板

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/templates/workflows/simplify.ts`（新建） |
| **内容** | 调用 `Skill({skill: "simplify"})`，OpenSpec 注入文件白名单（仅当前 session 文件）、独立 commit（`simplify(task-N.M)`）、undo 指令 |
| **注册** | `src/core/profiles.ts` ALL_WORKFLOWS 追加 `simplify` |
| **验收** | `.claude/skills/openspec-simplify/SKILL.md` 和 `.claude/commands/opsx/simplify.md` 生成 |

### Task 1.4 — 编写 `/opsx:ff` workflow 模板（writing-plans 编排）

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/templates/workflows/ff-change.ts`（扩展） |
| **内容** | 编排 `Skill({skill: "writing-plans"})` 生成 design.md；嵌入复杂度信号检测（文件数、架构决策、跨 domain）→ 自适应选择 Simple/Compact/Full 格式 |
| **参照** | 设计规格 Section 3.2（Plan 粒度自适应表） |
| **验收** | `/opsx:ff` 生成 design.md，Plan 格式与变更复杂度匹配 |

### Task 1.5 — 编写 `exploration.md` + `proposal` 模板（软依赖连接）

| 维度 | 内容 |
|------|------|
| **文件** | `schemas/superpowers/templates/exploration.md`（新建）+ `schemas/superpowers/templates/proposal.md` |
| **内容** | exploration 模板：灵活格式（Key Insights / Options / Recommendation / Open Questions 均可选）；proposal 模板：嵌入"若 exploration.md 存在则读取其内容作为输入，否则使用对话历史"的条件读取逻辑 |
| **验收** | 存在 exploration.md 时 proposal 指令自动引用其内容 |

### Task 1.6 — 注册新 workflow + 生成 skill/command

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/profiles.ts` + 自动生成系统 |
| **改动** | 确认 ALL_WORKFLOWS 含 simplifiy；`openspec update` 生成所有 skill/command 文件 |
| **验收** | enhanced profile 下所有 opsx 命令可用 |

**P1 验收标准**：`/opsx:apply` 执行时 AI 按 TDD 级别调用对应技能、spec-ref 精确注入、post-checkpoint 更新 checkbox。

---

## P2：Verify 双层 + Review 编排

**目标**：verify 区分 Layer 1（调用技能）和 Layer 2（OpenSpec 独有一致性审计）；review 编排 requesting-code-review 技能 + 复杂度自适应。

### Task 2.1 — 实现 Consistency Auditor（Layer 2 核心逻辑）

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/validation/consistency-auditor.ts`（新建） |
| **改动** | 实现 6 个审计维度：Spec 覆盖度（requirement→code）、Scenario 完整性（Given/When/Then→code paths）、Task 对齐度（checkbox vs 实际代码）、Design 一致性（架构决策 vs 实现）、范围边界（scope creep 检测）、隐式变更（未声明行为修改）。增量扫描（仅变更涉及文件）。输出 Pass/Warning/Critical 分级 |
| **单元测试** | 每个审计维度的独立测试 + 集成测试（对示例 change 运行审计） |
| **验收** | 函数输入 delta specs + 代码变更 → 输出 6 维度审计结果 |

### Task 2.2 — 编写 `verify` workflow 模板（双层编排）

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/templates/workflows/verify-change.ts` |
| **内容** | L1: `Skill({skill: "verification-before-completion"})` — 运行测试套件 + 统计覆盖率；L2: 调用 consistency-auditor 逻辑（6 维度审计）；此外：若 change 有 `depends_on` 声明，交叉验证依赖 change 的 specs 是否与本 change 实现一致（设计规格 Section 3.7.2）；输出双层面板 + 分级结论（设计规格 Section 3.5 行为示例） |
| **验收** | `/opsx:verify` 产生双层输出：L1 测试结果面板 + L2 6 维度审计面板 |

### Task 2.3 — 编写 `review` workflow 模板（编排 requesting-code-review）

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/templates/workflows/review.ts`（新建） |
| **内容** | 复杂度判断 → 简单变更跳过、中等变更 AI 自审（形式 A）、复杂变更调用 `Skill({skill: "requesting-code-review"})` 两阶段审查（形式 B）；生成 review.md |
| **注册** | ALL_WORKFLOWS 追加 `review` |
| **验收** | `/opsx:review` 按复杂度产生对应格式 review.md |

### Task 2.4 — 更新 `archive` workflow 模板

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/templates/workflows/archive-change.ts` |
| **内容** | archive 前自动运行 verify（若未运行）、检查 review.md（不存在→提示运行 review）、冲突检测、merge delta specs、清理 worktree |
| **验收** | `/opsx:archive` 完成 10 步闭环（specs 合并 + review 检查 + 冲突检测 + worktree 清理） |

**P2 验收标准**：`/opsx:verify` 双层输出、`/opsx:review` 自适应审查、`/opsx:archive` 完成闭环。

---

## P3：生命周期完整性

**目标**：abort / rewind / unarchive 全流程非破坏性，folder-only 模式有降级路径。

> P3 仅依赖 P0（schema/profile 就绪即可注册新 workflow），可与 P1/P2 并行。

### Task 3.1 — 编写 `abort` workflow 模板

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/templates/workflows/abort-change.ts`（新建） |
| **内容** | 确认提示 → worktree 模式：git branch 备份为 `refs/heads/aborted/<change>` → 清理 worktree → 移动 artifacts 到 `aborted/`；folder-only 模式：复制源文件到 `aborted/<change>/source/` |
| **注册** | ALL_WORKFLOWS 追加 `abort` |
| **验收** | abort 后 branch 备份存在 + artifacts 在 aborted/；folder-only 模式降级可用 |

### Task 3.2 — 编写 `rewind` workflow 模板

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/templates/workflows/rewind-change.ts`（新建） |
| **内容** | worktree 模式：git revert 指定 task 后的 commits → tasks.md checkbox 自动重置为 `[ ]`；folder-only 模式：反向 patch → 手动还原文件 |
| **注册** | ALL_WORKFLOWS 追加 `rewind` |
| **验收** | rewind 后代码回退 + checkbox 与代码状态一致 |

### Task 3.3 — 编写 `unarchive` workflow 模板

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/templates/workflows/unarchive-change.ts`（新建） |
| **内容** | 从主 specs 移除 delta → change 文件夹从 archive/ 移回活跃 changes/ → 提示代码需手动 git revert |
| **注册** | ALL_WORKFLOWS 追加 `unarchive` |
| **验收** | unarchive 后 delta specs 回退，change 恢复活跃 |

### Task 3.4 — 编写 `explore` workflow 模板（brainstorming 编排）

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/templates/workflows/explore.ts`（已有，需扩展） |
| **内容** | 嵌入分层融合模型：保持自由探索姿态；检测到多方案 trade-offs 时**提议**（非自动）调用 `Skill({skill: "brainstorming"})`；结束后提议生成 exploration.md |
| **验收** | 简单探索时不调用 brainstorming；复杂决策时 AI 主动提议 |

### Task 3.5 — 注册 P3 workflow + 生成 skill/command

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/profiles.ts` + 自动生成 |
| **验收** | `.claude/commands/opsx/abort.md`, `rewind.md`, `unarchive.md` 生成；enhanced profile 下可用 |

**P3 验收标准**：abort → 非破坏；rewind → tasks.md 同步；unarchive → specs 回退。

---

## P4：并行安全

**目标**：冲突检测、依赖管理、循环检测、Requirement ID 碰撞——纯 OpenSpec 逻辑，无 Superpowers 依赖。

> P4 仅依赖 P0，可与 P1/P2/P3 并行。

### Task 4.1 — 实现文件交集 + Spec 冲突检测

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/conflict/detector.ts`（新建模块） |
| **改动** | 扫描活跃 change 的 delta specs / design / tasks，检测文件交集 + Spec requirement 语义冲突 + Requirement ID 碰撞（同 ID 不同定义）；输出冲突报告 |
| **单元测试** | 4 种冲突类型独立 test case |
| **验收** | 两个 change 改同文件/同 requirement/同 ID → 检测到冲突；无交集 → 静默 |

### Task 4.2 — 实现循环依赖检测（DFS）

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/conflict/circular-deps.ts`（新建） |
| **改动** | 加载活跃 change 的 `depends_on` → 构建有向图 → DFS 环路检测；propose + apply 阶段各校验一次 |
| **单元测试** | 环/非环/自环 case |
| **验收** | A→B→A 报告循环；无环通过 |

### Task 4.3 — 实现增量 re-verify（时间窗竞态防护）

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/validation/consistency-auditor.ts`（扩展 Task 2.1） |
| **改动** | archive 前对比 verify 时间戳 vs 其他 change 的 archive 时间戳 → 若有同 spec 修改则触发增量 re-verify |
| **验收** | 时间窗内其他 change 修改同 spec 时 re-verify 触发 |

### Task 4.4 — 集成冲突检测到 CLI

| 维度 | 内容 |
|------|------|
| **文件** | `src/cli/index.ts` + `src/commands/change.ts` |
| **改动** | `openspec archive` 命令调用冲突检测 → 有冲突时输出报告；`openspec status --deps` 输出依赖树 |
| **验收** | 有冲突时 archive 输出检测报告；依赖树正确反映 depends_on |

### Task 4.5 — 更新 `depends_on` 解析

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/artifact-graph/types.ts`（ChangeMetadataSchema 扩展已在 P0.4 完成）+ `src/utils/change-metadata.ts` |
| **改动** | 解析时校验引用的 change 名称存在 → apply 前检查依赖是否已 archive |
| **验收** | 依赖未 archive 时 apply 阻塞并提示 |

**P4 验收标准**：并行 change 冲突自动检测；循环依赖被拒绝；时间窗竞态有增量审计。

---

## P5：技能降级 + 会话恢复 + 度量

**目标**：设计规格 Section 8.6（技能降级）、5.1.1（会话恢复）、7.1（度量指标）的实现。

### Task 5.1 — 实现技能可用性检测 + 降级

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/templates/workflows/apply-change.ts`（扩展）+ `src/core/templates/workflows/verify-change.ts`（扩展） |
| **内容** | apply/verify 模板中嵌入技能检测逻辑：调用前检查 ~/.claude/skills/ 下是否存在对应 SKILL.md；缺失时按降级矩阵处理（enhanced: 内置简化版；strict: 报错） |
| **验收** | 缺失 TDD 技能时 enhanced 模式降级为内置 Lite TDD + 提示；strict 模式报错 |

### Task 5.2 — 实现会话中断恢复

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/templates/workflows/apply-change.ts`（扩展） |
| **内容** | apply 模板嵌入恢复检测：读取 tasks.md checkbox + git log task 编号 + `git diff --name-only` 检测未提交修改 → 推断进度 → 提示用户三选一（提交继续/放弃重做/跳过）→ 更新 `.openspec.yaml` 的 `last_checkpoint` |
| **验收** | 模拟中断后重新 apply，显示进度推断面板 |

### Task 5.3 — 实现度量指标自动采集

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/metrics/collector.ts`（新建模块） |
| **改动** | 6 项指标（Spec 覆盖率、流转效率、缺陷逃逸率、过度工程化占比、回滚率、用户介入次数）在 verify + archive 阶段采集 → 写入 `openspec/.metrics.yaml` |
| **单元测试** | 6 项指标独立 test case |
| **验收** | 每次 archive 后 metrics 更新 |

### Task 5.4 — 新增 `openspec metrics` CLI 命令

| 维度 | 内容 |
|------|------|
| **文件** | `src/cli/index.ts` + `src/commands/metrics.ts`（新建） |
| **改动** | `openspec metrics [--json]` 输出 6 项指标 |
| **验收** | 命令输出与设计规格 Section 7.1 定义一致 |

**P5 验收标准**：技能缺失时优雅降级；中断恢复可用；metrics 自动采集可查询。

---

## P6：兼容性 + 测试 + 文档

### Task 6.1 — 现有 change 兼容性适配

| 维度 | 内容 |
|------|------|
| **文件** | `src/core/artifact-graph/state.ts` |
| **改动** | 无 TDD 级别标注的 tasks.md → AI 按 task 内容自动推断；无 spec-ref 标注 → 回退到 spec 摘要注入 |
| **验收** | 现有 core 创建的 change 在 superpowers schema 下可正常 apply |

### Task 6.2 — 全量测试

| 维度 | 内容 |
|------|------|
| **可单测模块** | TDD classifier, consistency auditor (6 维度), conflict detector (4 冲突类型), circular deps detector, metrics collector — 预估 8-10 个新测试文件 |
| **模板验证 checklist** | apply（TDD 编排 + spec-ref 注入 + post-checkpoint）、simplify（commit + undo）、verify（双层面板）、review（自适应格式）、abort（备份 + 降级）、rewind（checkbox 同步）、unarchive（specs 回退）、explore（brainstorming 提议） |
| **回归** | 现有 74 测试文件全部通过 |

### Task 6.3 — 文档更新

| 维度 | 内容 |
|------|------|
| **文件** | `README.md`（追加 superpowers schema 说明） + 已有 `docs/openspec-superpowers-fusion.md` |
| **验收** | 新用户可通过 README + 设计规格理解融合方案 |

**P6 验收标准**：现有测试全绿；新增单测通过；模板 checklist 全部打勾。

---

## 关键文件变更清单

| 文件 | Phase | 改动 | 风险 |
|------|-------|------|------|
| `schemas/superpowers/schema.yaml` | P0 | 新建 | 低 |
| `schemas/superpowers/templates/*.md` | P0-P1 | 新建 7 个 | 低 |
| `src/core/project-config.ts` | P0 | 扩展 Zod + parse | **中** — 核心 config 解析 |
| `src/core/config-schema.ts` | P0 | 扩展 profile enum | 低 |
| `src/core/profiles.ts` | P0-P3 | 追加常量 + getProfileWorkflows | 低 |
| `src/core/artifact-graph/types.ts` | P0 | 扩展 SchemaYaml + ChangeMetadata | **中** — schema 加载 + .openspec.yaml 解析 |
| `src/core/templates/workflows/apply-change.ts` | P1, P5 | **重写** — 编排模型 | **高** — apply 核心模板 |
| `src/core/templates/workflows/verify-change.ts` | P2, P5 | **重写** — 双层编排 | 中 |
| `src/core/templates/workflows/simplify.ts` | P1 | 新建 | 低 |
| `src/core/templates/workflows/ff-change.ts` | P1 | 扩展 — writing-plans 编排 | 低 |
| `src/core/templates/workflows/review.ts` | P2 | 新建 | 低 |
| `src/core/templates/workflows/abort-change.ts` | P3 | 新建 | 中 — git 操作 |
| `src/core/templates/workflows/rewind-change.ts` | P3 | 新建 | 中 — git revert + tasks.md 同步 |
| `src/core/templates/workflows/unarchive-change.ts` | P3 | 新建 | 低 |
| `src/core/templates/workflows/explore.ts` | P3 | 扩展 | 低 |
| `src/core/templates/workflows/archive-change.ts` | P2 | 扩展 | 低 |
| `src/core/validation/consistency-auditor.ts` | P2, P4 | 新建 | **高** — 核心新增逻辑 |
| `src/core/conflict/detector.ts` | P4 | 新建 | 中 |
| `src/core/conflict/circular-deps.ts` | P4 | 新建 | 中 |
| `src/core/metrics/collector.ts` | P5 | 新建 | 低 |
| `src/cli/index.ts` | P4-P5 | 追加命令 | 低 |

> **风险分布**：3 个高风险文件（2 个模板重写 + 1 个核心审计逻辑），4 个中风险，其余低风险。

---

## 实施风险汇总

| 风险 | Phase | 缓解 |
|------|-------|------|
| apply 模板重写后 AI 行为退化 | P1 | 保留旧模板作为回退；逐 task 灰度切换 |
| consistency auditor 对大项目性能差 | P2 | 增量扫描（仅变更文件）；分页输出 |
| SchemaYaml 扩展后 spec-driven schema 加载失败 | P0 | `verify`/`archive` phase 为 optional；Zod passthrough |
| 现有 74 测试回归 | P6 | 每个 Phase 完成后 `npm test` |
| 模板变更无法自动验证 | P1-P3 | P6 端到端 checklist 逐项人工验证 |
| Superpowers 技能版本不兼容 | P5 | 降级矩阵；V2 考虑技能版本锁定 |

---

## 里程碑

| M | Phase | 可交付 | 估时 |
|---|-------|--------|------|
| M1 | P0 | `openspec init --schema superpowers` 可用 | 2d |
| M2 | P1 | `/opsx:apply` 编排 TDD + Simplify + `/opsx:ff` | 3.5d |
| M3 | P2 | `/opsx:verify` 双层 + `/opsx:review` 自适应 | 2d |
| M4 | P3 ‖ P4 | abort/rewind/unarchive + 冲突检测/依赖管理 | 3d（并行） |
| M5 | P5 | 技能降级 + 中断恢复 + metrics | 2d |
| M6 | P6 | 测试全绿 + 文档更新 | 1.5d |

> **总预估**：约 **14 个工作日**（单人全职）。M4 是 P3+P4 并行，P5 不等 P3/P4，实际关键路径 P0(2) → P1(3.5) → P2(2) → P5(2) → P6(1.5) ≈ 11d。

## 实施成果

| 指标 | 值 |
|------|-----|
| 新建源文件 | 14 |
| 修改文件 | 22 |
| 测试文件 | 78 |
| 测试通过 | 1514 |
| Enhanced profile workflows | 14/14 |
| Git 分支 | dev |

**关键交付物**：

| 类别 | 文件 |
|------|------|
| Schema | `schemas/superpowers/schema.yaml` + 6 模板 |
| 编排模板 | apply, verify, review, simplify, ff, explore, abort, rewind, unarchive（9 个 workflow） |
| 核心逻辑 | consistency-auditor, conflict/detector, conflict/circular-deps, metrics/collector |
| CLI | `openspec verify --change`, `openspec metrics`, `openspec status --deps`, archive 冲突检测 |
| 配置 | discipline schema, enhanced/strict profile |
| 文档 | 使用手册, 安装指南, 设计规格（更新）, 实施方案（更新） |

---

## 验收手册

每个 task 的具体验证步骤。**代码类 task** 用自动化命令验证；**模板类 task** 用行为观察验证。

### P0 验收

#### Task 0.1 — schema YAML + 模板目录

```bash
# 1. 文件存在性
ls schemas/superpowers/schema.yaml
ls schemas/superpowers/templates/
# 预期: 列出 7 个 .md 文件

# 2. Schema 可被系统发现
openspec schemas
# 预期: 输出列表中包含 superpowers

# 3. 模板路径解析
openspec templates --schema superpowers
# 预期: 列出 7 个模板的完整路径
```

| 判定 | 标准 |
|------|------|
| ✅ Pass | 3 条命令全部通过 |
| ❌ Fail | 任一命令报错或缺失文件 |

#### Task 0.2 — ProjectConfigSchema + discipline

```bash
# 1. 旧 config 不受影响
cat > /tmp/test-config.yaml << 'EOF'
schema: spec-driven
EOF
# 运行 parse 单元测试
npm test -- --run test/core/project-config.test.ts
# 预期: 通过，无新增警告

# 2. 新 config 解析
cat > /tmp/test-superpowers-config.yaml << 'EOF'
schema: superpowers
discipline:
  level: enhanced
  tdd:
    default: adaptive
  subagent:
    mode: adaptive
  worktree:
    enabled: true
EOF
npm test -- --run test/core/project-config.test.ts
# 预期: 通过，discipline 各字段值正确
```

| 判定 | 标准 |
|------|------|
| ✅ Pass | 旧 config 零影响；新 config 所有 discipline 字段解析正确 |
| ❌ Fail | 旧 config 解析报错或警告；新 config discipline 字段缺失或默认值错误 |

#### Task 0.3 — profile enum + getProfileWorkflows()

```bash
# 1. enhanced profile 生成
openspec init --schema superpowers --profile enhanced --tools claude /tmp/test-project
ls /tmp/test-project/.claude/commands/opsx/
# 预期: 包含 apply.md, verify.md, review.md, simplify.md, abort.md, rewind.md, unarchive.md, ff.md (比 core 多 9 个)

# 2. strict profile 等价于 enhanced（相同 workflow 集合）
openspec init --schema superpowers --profile strict --tools claude /tmp/test-strict
diff <(ls /tmp/test-project/.claude/commands/opsx/) <(ls /tmp/test-strict/.claude/commands/opsx/)
# 预期: 无差异

# 3. core profile 不变
openspec init --profile core --tools claude /tmp/test-core
ls /tmp/test-core/.claude/commands/opsx/
# 预期: 仅 5 个文件 (apply, explore, propose, sync, archive)
```

| 判定 | 标准 |
|------|------|
| ✅ Pass | enhanced 生成 14 个 command 文件；strict = enhanced；core 仅 5 个 |
| ❌ Fail | 数量不对或某 profile 报错 |

#### Task 0.4 — SchemaYamlSchema + ChangeMetadataSchema

```bash
# 1. superpowers schema 通过 Zod 校验
npm test -- --run test/core/artifact-graph/schema.test.ts
# 预期: 通过，verify/archive phase 解析正确

# 2. depends_on 解析
cat > /tmp/test-openspec.yaml << 'EOF'
schema: superpowers
created: 2026-05-15
depends_on:
  - some-other-change
last_checkpoint: "1.3"
EOF
npm test -- --run test/utils/change-metadata.test.ts
# 预期: depends_on 和 last_checkpoint 字段正确反序列化

# 3. 旧 .openspec.yaml 不受影响（无 depends_on 字段）
cat > /tmp/test-old-openspec.yaml << 'EOF'
schema: spec-driven
created: 2026-01-01
EOF
# 预期: 解析通过，无报错
```

| 判定 | 标准 |
|------|------|
| ✅ Pass | 3 项全部通过 |
| ❌ Fail | Zod 校验报错或旧格式解析失败 |

---

### P1 验收

#### Task 1.1 — tasks.md 模板（TDD + spec-ref）

**验证方法**：创建一个测试 change，生成 tasks.md，检查格式。

```bash
openspec new change test-tdd-levels --schema superpowers /tmp/test-project
cat /tmp/test-project/openspec/changes/test-tdd-levels/tasks.md
```

**手动检查**（打开生成的文件，逐项确认）：

| 检查项 | 预期 |
|--------|------|
| 模板中包含 `[TDD: Full]` 标注语法说明 | 有，且说明对应 RED→GREEN→REFACTOR |
| 模板中包含 `[TDD: Lite]` 标注语法说明 | 有，且说明纯重命名例外 |
| 模板中包含 `[TDD: Skip]` 标注语法说明 | 有 |
| 模板中包含 `[Spec: REQ-xxx]` 标注语法说明 | 有，含精确注入 / 多引用 / 全量注入四种情况 |
| Full TDD task 展开子 checklist | 有 RED/Verify RED/GREEN/Verify GREEN/REFACTOR |

#### Task 1.2 — apply 模板（编排核心）

**验证方法**：检查生成的 apply.md 内容。

```bash
cat /tmp/test-project/.claude/commands/opsx/apply.md
```

| 检查项 | 预期 |
|--------|------|
| 包含 "外循环" 或 "top-level controller" 声明 | 有 |
| 包含 `Skill({skill: "test-driven-development"})` 调用指令 | 有，且在 `[TDD: Full]` 条件下 |
| 包含 Pre-context / Post-checkpoint 分界 | 有 |
| Post-checkpoint 包含 "更新 tasks.md checkbox" | 有 |
| Post-checkpoint 包含 "读取下一个 task" | 有 |
| 包含 config 快照指令 | 有 |
| 包含 `[Spec: REQ-xxx]` → 提取 requirement block 指令 | 有 |
| 包含 `Skill({skill: "subagent-driven-development"})` 调用条件 | 有，且限 Per-Task 模式 |
| 包含 "完成当前 task 后返回此处，不要自行决定下一个 task" | 有 |

#### Task 1.3 — simplify 模板

```bash
cat /tmp/test-project/.claude/commands/opsx/simplify.md
```

| 检查项 | 预期 |
|--------|------|
| 调用 `Skill({skill: "simplify"})` | 有 |
| 注入文件白名单指令 | 有 |
| 独立 commit 指令 (`simplify(task-N.M)`) | 有 |
| undo 指令 (`git revert`) | 有 |

#### Task 1.4 — ff 模板（writing-plans 编排）

```bash
cat /tmp/test-project/.claude/commands/opsx/ff.md
```

| 检查项 | 预期 |
|--------|------|
| 调用 `Skill({skill: "writing-plans"})` | 有 |
| 复杂度信号检测指令（文件数、架构决策、跨 domain） | 有 |
| Simple/Compact/Full 三级选择逻辑 | 有 |
| Plan 写入 design.md 指令 | 有 |

#### Task 1.5 — exploration + proposal 软依赖

```bash
cat /tmp/test-project/openspec/schemas/superpowers/templates/exploration.md
cat /tmp/test-project/openspec/schemas/superpowers/templates/proposal.md
```

| 检查项 | 预期 |
|--------|------|
| exploration 模板：Key Insights / Options / Recommendation / Open Questions | 四节均标注为可选 |
| proposal 模板：条件读取 exploration.md 的逻辑 | 有，"若 exploration.md 存在则读取" |

#### Task 1.6 — 注册 + 生成

```bash
openspec update /tmp/test-project
ls /tmp/test-project/.claude/skills/ | grep openspec
# 预期: openspec-simplify 在列表中
```

---

### P2 验收

#### Task 2.1 — Consistency Auditor

```bash
npm test -- --run test/core/validation/consistency-auditor.test.ts
```

| 测试 case | 预期 |
|-----------|------|
| Spec 覆盖度：2 requirements 实现 2 → Pass | Coverage = 100% |
| Spec 覆盖度：2 requirements 实现 1 → Warning | Coverage = 50% |
| Scenario 完整性：Scenario 无测试 → Warning | 提示 "no test found" |
| Task 对齐度：checkbox [x] 但无对应代码 → Warning | 提示 "task marked done but no code change" |
| Design 一致性：design 说 CSS variables 但代码用 Tailwind → Warning | 提示 "design incoherence" |
| 范围边界：额外新增了未声明文件 → Warning | 提示 "scope creep" |
| 隐式变更：修改了已有函数但未在 delta spec 声明 → Warning | 提示 "implicit change" |
| 全 Pass case → Pass | 6 维度全部 Pass |

#### Task 2.2 — verify 模板

```bash
cat /tmp/test-project/.claude/commands/opsx/verify.md
```

| 检查项 | 预期 |
|--------|------|
| L1 调用 `Skill({skill: "verification-before-completion"})` | 有 |
| L2 调用 consistency-auditor | 有 |
| 双层面板输出格式 | 有 Layer 1 / Layer 2 分界 |
| Pass/Warning/Critical 分级结论 | 有 |
| depends_on 交叉验证指令（存在依赖时检查上下游 spec 一致性，设计规格 Section 3.7.2） | 有 |

#### Task 2.3 — review 模板

```bash
cat /tmp/test-project/.claude/commands/opsx/review.md
```

| 检查项 | 预期 |
|--------|------|
| 复杂度判断逻辑（简单跳过 / 中等自审 / 复杂两阶段） | 有 |
| 调用 `Skill({skill: "requesting-code-review"})` 条件 | 有，仅在复杂变更 |
| review.md 生成指令（形式 A / 形式 B） | 有 |

#### Task 2.4 — archive 模板

```bash
cat /tmp/test-project/.claude/commands/opsx/archive.md
```

| 检查项 | 预期 |
|--------|------|
| 若未运行 verify 则自动运行 | 有 |
| merge delta specs 到主 specs | 有 |
| 清理 worktree | 有 |

---

### P3 验收

#### Task 3.1 — abort 模板

```bash
cat /tmp/test-project/.claude/commands/opsx/abort.md
```

| 检查项 | 预期 |
|--------|------|
| 确认提示流程 | 有 |
| worktree 模式：git branch 备份为 `refs/heads/aborted/<change>` | 有 |
| folder-only 模式：复制源文件到 `aborted/<change>/source/` | 有 |
| artifacts 移动到 `aborted/` | 有 |
| 恢复方法说明 | 有 |

#### Task 3.2 — rewind 模板

```bash
cat /tmp/test-project/.claude/commands/opsx/rewind.md
```

| 检查项 | 预期 |
|--------|------|
| worktree 模式：git revert 指定 task 后的 commits | 有 |
| folder-only 模式：反向 patch | 有 |
| tasks.md checkbox 自动重置为 `[ ]` | 有 |
| 提示从哪个 task 继续 | 有 |

#### Task 3.3 — unarchive 模板

```bash
cat /tmp/test-project/.claude/commands/opsx/unarchive.md
```

| 检查项 | 预期 |
|--------|------|
| delta specs 从主 specs 回退 | 有 |
| change 文件夹从 archive/ 移回 | 有 |
| 代码不回滚提示 | 有 |

#### Task 3.4 — explore 模板（brainstorming 编排）

```bash
cat /tmp/test-project/.claude/commands/opsx/explore.md
```

| 检查项 | 预期 |
|--------|------|
| 保持自由探索姿态（无强制步骤） | 有 |
| 检测到多方案 trade-offs 时**提议**调用 `Skill({skill: "brainstorming"})` | 有，且标注"可选" |
| 结束后提议生成 exploration.md | 有 |

#### Task 3.5 — 注册 + 生成

```bash
ls /tmp/test-project/.claude/commands/opsx/ | grep -E "abort|rewind|unarchive"
# 预期: 三个文件均存在
```

---

### P4 验收

#### Task 4.1 — conflict detector

```bash
npm test -- --run test/core/conflict/detector.test.ts
```

| 测试 case | 预期 |
|-----------|------|
| 无交集 | 返回空冲突列表 |
| 同文件不同区域 | 返回 "文件交集但行级无冲突" |
| 同一 requirement | 返回 "Spec 语义冲突" |
| 同一 requirement ID 不同定义 | 返回 "Requirement ID 碰撞" |

#### Task 4.2 — circular deps

```bash
npm test -- --run test/core/conflict/circular-deps.test.ts
```

| 测试 case | 预期 |
|-----------|------|
| A→B→A | 检测到环路，报告 A↔B |
| A→B→C→A | 检测到环路，报告完整环 |
| A→B, B→C (无环) | 通过 |
| A→A (自环) | 检测到环路 |

#### Task 4.3 — 增量 re-verify

```bash
npm test -- --run test/core/validation/consistency-auditor.test.ts
# 追加 case: verify 时间戳 < 其他 change archive 时间戳 → re-verify 触发
```

| 测试 case | 预期 |
|-----------|------|
| 时间窗内无其他 archive | 不触发 re-verify |
| 时间窗内有其他 change 修改同 spec | 触发 re-verify，仅扫描变更的 spec 维度 |

#### Task 4.4 — CLI 集成

```bash
# 依赖检测
openspec archive test-change --dry-run
# 预期: 有并行 change 冲突时输出报告

# 依赖树
openspec status --deps
# 预期: 树形输出所有活跃 change 的 depends_on 关系
```

#### Task 4.5 — depends_on 解析

```bash
npm test -- --run test/utils/change-metadata.test.ts
```

| 测试 case | 预期 |
|-----------|------|
| depends_on 引用的 change 存在 | 通过 |
| depends_on 引用的 change 不存在 | 警告 "change X not found" |
| 依赖未 archive 时 apply | 阻塞，提示先完成依赖 |

---

### P5 验收

#### Task 5.1 — 技能降级

**验证方法**：临时移走某个技能目录，运行 apply。

```bash
# 模拟缺失 test-driven-development
mv ~/.claude/skills/test-driven-development ~/.claude/skills/_bak_test-driven-development

# 在 enhanced 模式下 apply
/opsx:apply test-change
# 预期: 输出 "[Skill check] test-driven-development ✗ (降级为内置 Lite TDD)"

# 恢复
mv ~/.claude/skills/_bak_test-driven-development ~/.claude/skills/test-driven-development
```

| 检查项 | 预期 |
|--------|------|
| enhanced 模式缺失技能 | 降级提示 + 使用内置简化版 |
| strict 模式缺失技能 | 报错，要求安装后重试 |
| core 模式缺失技能 | 不受影响（不调用任何技能） |

#### Task 5.2 — 会话中断恢复

**验证方法**：模拟 apply 中途中断。

```bash
# 1. 创建 test change with 3 tasks
# 2. 执行 Task 1.1 并提交
# 3. 执行 Task 1.2 但只修改代码不提交
# 4. 关闭终端
# 5. 重新 /opsx:apply

# 预期输出:
# "检测到上次 apply 未正常完成。
#  ✅ 1.1 ... (commit: xxx)
#  ⚠ 1.2 ... (代码已修改但未提交)
#  [ ] 1.3 ...
#  建议 [1] 保留继续 / [2] 放弃重做 / [3] 跳过"
```

| 检查项 | 预期 |
|--------|------|
| checkbox 完成的 task 正确标记 ✅ | 无遗漏 |
| 未提交修改检测正确 | 标记 ⚠ |
| 三选一提示显示 | 有 |
| `last_checkpoint` 字段更新 | `.openspec.yaml` 中有对应值 |

#### Task 5.3 + 5.4 — metrics

```bash
# CLI 命令
openspec metrics
# 预期: 输出 6 项指标表格

openspec metrics --json
# 预期: JSON 格式输出

# 自动采集验证
# 完成一次 archive 后
cat openspec/.metrics.yaml
# 预期: 指标数据已更新
```

| 检查项 | 预期 |
|--------|------|
| `openspec metrics` 输出 6 项 | Spec覆盖率、流转效率、缺陷逃逸率、过度工程化占比、回滚率、用户介入次数 |
| archive 后自动更新 | metrics.yaml 时间戳变化 |
| `--json` 输出 | 合法 JSON |

---

### P6 验收

#### Task 6.1 — 向后兼容

```bash
# 1. 用 core profile 创建 old change
openspec new change test-old --schema spec-driven /tmp/test-project
cat /tmp/test-project/openspec/changes/test-old/tasks.md
# 预期: 无 [TDD: xxx] 标注（old format）

# 2. 切换到 superpowers schema 后重新 apply
# 在 /opsx:apply 中读取该 tasks.md
# 预期: AI 按 task 描述自动推断 TDD 级别，不报错
```

| 检查项 | 预期 |
|--------|------|
| 旧 tasks.md 在 superpowers 下正常 apply | TDD 级别自动推断，无报错 |
| 无 spec-ref 时回退到 spec 摘要 | 不报错，注入摘要 |

#### Task 6.2 — 全量测试

```bash
# 单元测试
npm test
# 预期: 74 + 8~10 新测试文件全部通过

# 模板 checklist（逐项人工验证）
# 对照上述 P1-P3 的各项检查表
```

| 判定 | 标准 |
|------|------|
| ✅ Pass | `npm test` 全部通过 + 模板 checklist 全部打勾 |
| ❌ Fail | 任一单测失败 或 checklist 有未勾选项 |

#### Task 6.3 — 文档

```bash
cat README.md | grep -i superpowers
# 预期: 有 superpowers schema 说明段落
```

---

### 验收汇总

| Phase | 自动化验证 | 手动验证 | 关键命令 |
|-------|-----------|---------|---------|
| P0 | 4 task × 单元测试 | 0 | `npm test` + `openspec schemas` + `openspec init` |
| P1 | 0 (全部模板) | 6 task × checklist | `cat .claude/commands/opsx/*.md` |
| P2 | Task 2.1 单测 | 3 task × checklist | `npm test` + `cat verify.md` |
| P3 | 0 (全部模板) | 5 task × checklist | `cat abort/rewind/unarchive/explore.md` |
| P4 | 3 task × 单测 | 2 task × CLI 集成 | `npm test` + `openspec archive --dry-run` |
| P5 | Task 5.3 单测 | 3 task × 行为测试 | 技能移走/中断模拟/`openspec metrics` |
| P6 | 全量回归 | 模板 checklist 汇总 | `npm test` |

> **验收原则**：代码类 → `npm test` 一把过；模板类 → 打开生成文件逐项打勾。两者都绿才算 Phase 完成。
