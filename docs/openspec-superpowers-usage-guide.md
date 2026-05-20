# OpenSpec Superpowers 使用手册

> 基于 OpenSpec v1.3.1 + Superpowers 融合方案，覆盖 P0-P6 全部功能。

**文档导航**：
→ 想**了解设计思路**？阅读 [设计规格](./openspec-superpowers-fusion.md)
→ 想**安装部署**？阅读 [安装指南](./openspec-superpowers-installation.md)
→ 想**学习使用**？你在看的正是使用手册
→ 想**了解实施过程**？阅读 [实施方案](./openspec-superpowers-implementation-plan.md)

## 目录

- [1. 项目初始化](#1-项目初始化)
- [2. 工作流概览](#2-工作流概览)
- [3. 技能协作机制](#3-技能协作机制)
- [4. 核心工作流详解](#4-核心工作流详解)
- [4. 增强工作流详解](#4-增强工作流详解)
- [5. 生命周期管理](#5-生命周期管理)
- [6. 并行安全](#6-并行安全)
- [7. 工程度量](#7-工程度量)
- [8. 配置参考](#8-配置参考)
- [9. 典型工作流示例](#9-典型工作流示例)

---

## 1. 项目初始化

### 基础初始化

```bash
cd your-project
openspec init
```

这会在 `.claude/` 下生成 **14 个命令**和 **18 个技能**（14 个 OpenSpec 工作流技能 + 4 个 Superpowers 捆绑技能）：

```
.claude/
├── commands/opsx/
│   ├── apply.md        # 实现任务
│   ├── archive.md      # 归档变更
│   ├── propose.md      # 创建提案
│   ├── explore.md      # 探索模式
│   ├── sync.md         # 同步规格
│   ├── new.md          # 新建变更
│   ├── continue.md     # 继续创建制品
│   ├── ff.md           # 快速前进
│   ├── verify.md       # 双层验证
│   ├── review.md       # 代码审查
│   ├── simplify.md     # 代码精炼
│   ├── abort.md        # 中止变更
│   ├── rewind.md       # 回退任务
│   └── unarchive.md    # 恢复归档
└── skills/
    ├── openspec-apply-change/
    ├── openspec-archive-change/
    ├── ...（14 个 OpenSpec 工作流技能）
    ├── subagent-driven-development/   # ← 捆绑的 Superpowers 技能
    ├── systematic-debugging/          #    （由 openspec init 自动安装）
    ├── test-driven-development/
    └── using-git-worktrees/
```

`openspec init` 会自动从 OpenSpec 安装包拷贝 4 个 Superpowers 捆绑技能到 `.claude/skills/`：
- **subagent-driven-development**: 每个 task 的执行增强（工作树隔离 + 两阶段审查 + 系统调试）
- **systematic-debugging**: 四阶段调试方法（root cause → pattern → hypothesis → fix）
- **test-driven-development**: TDD 参考（6 步已嵌入 tasks.md，skill 作为参考）
- **using-git-worktrees**: 子代理工作树隔离

### 配置 discipline 级别

编辑 `openspec/config.yaml`：

```yaml
schema: specpower-driven
discipline:
  level: strict        # core | enhanced | strict
  subagent:
    mode: per-task
  worktree:
    enabled: true
  exploration:
    search_history: false
```

| 级别 | 行为 |
|------|------|
| `core` | 无技能调用，手动实现 |
| `enhanced` | 调用 Superpowers 技能，缺失时优雅降级 |
| `strict` | 调用 Superpowers 技能，缺失时报错 |

---

## 2. 工作流概览

```
                    ┌──────────────────────────────────────────────┐
                    │              完整工作流生命周期               │
                    └──────────────────────────────────────────────┘

   探索 ──→ 提案 ──→ 规格 ──→ 设计 ──→ 任务 ──→ 实现 ──→ 验证 ──→ 审查 ──→ 归档
    │        │                                          │                    │
    │        │                                          ├── 中止 ──────────→ │
    │        │                                          └── 回退 ──────────→ │
    │        │                                                               │
    └────────┴───────────────────────────────────────────────────── 恢复归档 ←┘

   核心工作流 (8):  explore   propose   new/continue/ff   apply   verify   review   sync   archive
   增强工作流 (6):  simplify   abort   rewind   unarchive   sync   review
```

---

## 3. 技能协作机制

### 3.1 三层架构

Superpowers 技能不是 OpenSpec 的内置功能——它们是独立的 Claude Code 技能，安装在 `~/.claude/skills/` 下。OpenSpec 通过**模板指令**间接编排调用它们。

```
┌─────────────────────────────────────────────────────────────┐
│                    三层协作架构                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  编排层（OpenSpec 模板）                                     │
│  .claude/commands/opsx/*.md                                │
│  职责：定义 TDD 合约（6 步内嵌）+ 调度 subagent 执行增强        │
│              │                                              │
│              ▼                                              │
│  执行层（tasks.md + Subagent 技能）                          │
│  tasks.md TDD 子步骤（强约束）+ Skill("subagent-driven-     │
│  development")（执行增强：工作树隔离 + 两阶段审查）            │
│              │                                              │
│              ▼                                              │
│  数据层（OpenSpec CLI）                                     │
│  openspec status / archive / metrics ...                   │
│  职责：管理制品、追踪状态、检测冲突、采集度量                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 完整调用链

以用户输入 `/opsx:apply add-user-auth` 为例：

```
用户: /opsx:apply add-user-auth
      │
      ▼
AI 读取 .claude/commands/opsx/apply.md     ← 模板指令文件
      │
      ▼
模板告诉 AI：
  "你是 OpenSpec apply 外循环控制器"
  "读取 tasks.md，每个 task 内嵌 6 个 TDD 子步骤"
  "Layer 1 (TDD 约束) + Layer 2 (subagent 增强)"
      │
      ▼
AI 使用 Skill 工具调用外部技能               ← Claude Code 内置能力
      │
      ▼
Subagent 包裹 TDD 执行
  B1 (TDD 强制): RED → Verify RED → GREEN → Verify GREEN → REFACTOR → SIMPLIFY
  B2 (执行增强): Skill("subagent-driven-development") 提供工作树隔离 + 两阶段审查
      │
      ▼
控制权回到 apply 模板（Post-checkpoint）
  - C0: 验证 6 个子 checkbox 全部 [x]
  - 更新 tasks.md: - [x] 1.1 ...
  - git commit -m "feat(1.1): <description>"
  - 更新 .openspec.yaml checkpoint
  - 读取下一个 task，返回外循环入口
```

### 3.3 以一次 TDD 任务为例

`tasks.md` 中的任务：

```markdown
- [ ] 1.1 [Spec: REQ-auth-login] 实现邮箱登录接口
  - [ ] RED: Write failing test for this
  - [ ] Verify RED: Confirm test fails correctly
  - [ ] GREEN: Write minimal code to pass
  - [ ] Verify GREEN: Confirm pass + no regressions
  - [ ] REFACTOR: Clean up, keep tests green
  - [ ] SIMPLIFY: Review changed files
```

AI 执行的三阶段：

```
Phase A: Pre-context（OpenSpec 编排）
  ├─ 读取 tasks.md 中的 6 个嵌入式 TDD 子步骤
  ├─ 解析 [Spec: REQ-auth-login] → 搜索 specs/auth/spec.md
  ├─ 提取 "### Requirement: 用户可通过邮箱登录" + 所有 Scenario
  └─ 将需求块作为上下文注入

Phase B: Task Execution（两层模型）
  ├─ B1. TDD 周期（强约束）：RED → Verify RED → GREEN → Verify GREEN → REFACTOR → SIMPLIFY
  ├─ B2. Subagent 增强（加强）：Skill("subagent-driven-development") 包裹 B1
  └─ Subagent 不可用 → 降级为本地 B2-fallback（TDD + spec check + debugging）

Phase C: Post-checkpoint（OpenSpec 编排）
  ├─ C0: 验证 6 个子 checkbox 全部 [x]
  ├─ 更新 tasks.md: - [x] 1.1 实现邮箱登录接口
  ├─ git commit -m "feat(1.1): 实现邮箱登录接口"
  ├─ 更新 .openspec.yaml: last_checkpoint: "1.1"
  └─ 读取下一个 task，返回 Phase A
```

### 3.4 技能可用性检测

每次调用技能前，AI 会检查技能目录是否存在：

```
检查 .claude/skills/subagent-driven-development/SKILL.md 或 ~/.claude/skills/subagent-driven-development/SKILL.md

┌──────────┬──────────────────────────────────────────┐
│ Profile  │ 技能缺失时的行为                           │
├──────────┼──────────────────────────────────────────┤
│ core     │ 不调用 subagent，AI 按嵌入式 TDD 子步骤实现  │
│ enhanced │ 降级为本地 B2-fallback:                      │
│          │ "[Skill check] subagent ✗ (降级为本地执行)"  │
│ strict   │ 报错，拒绝继续:                               │
│          │ "[Skill check] subagent ✗ — 请安装后重试"    │
│          │ 解决: openspec init --tools claude            │
└──────────┴──────────────────────────────────────────┘
```

### 3.5 命令→技能映射表

| 命令 | 调用的技能 | 触发条件 |
|------|-----------|----------|
| `/opsx:apply` | 6-step embedded TDD | 每个 task（强约束，嵌入 tasks.md） |
| `/opsx:apply` | `subagent-driven-development` | 每个 task（执行增强，不可用时降级） |
| `/opsx:verify` | `verification-before-completion` | Layer 1 执行验证阶段 |
| `/opsx:ff` | `writing-plans` | 检测到 Complex 级别变更（10+ 文件/跨 domain） |
| `/opsx:review` | `requesting-code-review` | 检测到 Complex 级别变更（15+ 文件/架构变更） |
| `/opsx:explore` | `brainstorming` | AI 提议，用户可选（不自动调用） |
| `/opsx:simplify` | `simplify` | 手动调用或 apply Post-checkpoint 自动触发 |

### 3.6 C0 技能合规自检

C0 步骤检查每个 task 的 6 个嵌入式 TDD 子步骤 checkbox 是否全部 [x]。缺失子步骤 → 提示 Retry/Explain/Override。

**违规时的用户选项**：

```
⚠ Sub-step compliance failure:
   Task 1.2: Verify RED sub-step not completed.

   If you didn't watch the test fail, you don't know if it tests the right thing.

   Options:
   [1] Retry — redo the missing sub-step
   [2] Explain — provide reason why sub-step was skipped
   [3] Override — mark task done anyway (will be noted in review)
```

### 3.7 技能调用申告

每次调用 Superpowers 技能时，AI 会输出明确标记，让用户看到正在使用哪个技能：

```
[Skill] subagent-driven-development → task 1.1 (standard model, 3 files)
  [TDD] RED → Verify RED → GREEN → Verify GREEN → REFACTOR → SIMPLIFY
[Local] TDD + spec check + debugging discipline (subagent unavailable)
[Skill] verification-before-completion → running test suite + coverage
[Skill] requesting-code-review → independent review of add-user-auth
[Skill] writing-plans → generating structured design
[Skill] brainstorming → exploring trade-off spaceNo Skill] core mode — implementing directly
```

> 如果对话中没有出现 `[Skill]` 标记，说明当前 task 未触发技能调用（TDD: Skip 或 core mode）。

### 3.7 模板是桥接点

每个命令对应一个 TypeScript 模板函数，构建时生成 `.md` 文件供 AI 读取：

```
src/core/templates/workflows/
├── apply-change.ts    → .claude/commands/opsx/apply.md     (外循环 + TDD + simplify)
├── verify-change.ts   → .claude/commands/opsx/verify.md    (双层验证 + 6 维度审计)
├── review.ts          → .claude/commands/opsx/review.md    (自适应审查 + code review 技能)
├── ff-change.ts       → .claude/commands/opsx/ff.md        (writing-plans 编排)
├── explore.ts         → .claude/commands/opsx/explore.md   (brainstorming 提议)
├── simplify.ts        → .claude/commands/opsx/simplify.md  (simplify 编排)
├── abort-change.ts    → .claude/commands/opsx/abort.md     (非破坏性中止)
├── rewind-change.ts   → .claude/commands/opsx/rewind.md    (任务回退)
├── unarchive-change.ts → .claude/commands/opsx/unarchive.md (恢复归档)
└── ...
```

模板中硬编码了 `Skill({skill: "..."})` 调用指令——这是 OpenSpec 与 Superpowers 之间的唯一接口。OpenSpec 不内置任何 TDD、审查、测试逻辑，它只做编排。

---

## 4. 核心工作流详解

### 3.1 `/opsx:explore` — 探索模式（第一步）

**作用**：进入自由探索模式，用于调研问题、比较方案、理清思路。**不写代码**。

> **explore 是 proposal 的强制前置条件**（specpower-driven schema）。在创建 proposal 之前必须先完成 explore。复杂决策时可调用 brainstorming 技能进行系统化方案对比。

**示例**：
```
/opsx:explore "微服务拆分的几种方案对比"
/opsx:explore add-user-auth   # 在特定 change 上下文中探索
```

**特点**：
- 无固定步骤，自由对话
- 可用 ASCII 图表可视化架构
- 检测到多方案 trade-offs 时，**提议**调用 brainstorming 技能
- 探索结束时，提议生成 `exploration.md`

**输出示例**：
```
┌────────────────────────────────────────────┐
│           AUTH 方案对比                      │
├────────────┬──────────┬──────────┬─────────┤
│ 方案       │ 复杂度   │ 安全性   │ 维护成本 │
├────────────┼──────────┼──────────┼─────────┤
│ JWT        │ 低       │ 中       │ 低      │
│ Session    │ 中       │ 高       │ 中      │
│ OAuth 2.0  │ 高       │ 高       │ 高      │
└────────────┴──────────┴──────────┴─────────┘

推荐 JWT + OAuth 2.0 组合方案。
```

---

### 3.2 `/opsx:propose` — 创建提案

**作用**：创建变更并一键生成所有制品（explore 必须先完成）。

> **前置条件**：必须先运行 `/opsx:explore`。Propose 会自动读取 `explore.md` 获取上下文。

**示例**：
```
/opsx:propose "添加用户认证功能，支持邮箱+OAuth登录"
```

**生成文件（按 schema 依赖顺序逐个创建）**：
```
openspec/changes/add-user-auth/
├── .openspec.yaml
├── explore.md     ← 前置条件（已在 explore 阶段创建）
├── proposal.md    ← 生成：Why / What Changes / Impact
├── specs/         ← 生成：delta specs（ADDED/MODIFIED/REMOVED）
├── design.md      ← 生成：技术方案、架构决策、文件映射
└── tasks.md       ← 生成：6 步嵌入式 TDD 任务清单
```

**也可分步创建**：使用 `/opsx:new` + `/opsx:continue` 逐个创建制品，或 `/opsx:ff` 一键生成。

---

### 3.3 创建制品（new / continue / ff）

在 explore 和 propose 之后，可以使用以下命令继续创建或补充制品：

| 命令 | 用途 | 适用场景 |
|------|------|---------|
| `/opsx:ff` | 一键创建所有缺失制品直到 tasks | 快速启动，自动按依赖顺序创建 |
| `/opsx:continue` | 创建下一个制品（逐个） | 需要逐步审查每个制品 |
| `/opsx:new` | 新建变更目录骨架 | 从头开始，手动控制 |

**制品依赖顺序**（specpower-driven schema）：
```
explore → proposal → specs ──┬──→ tasks → apply
                             └──→ design ──┘
```

`/opsx:ff` 会一次性补全从 proposal 到 tasks 的所有制品。`/opsx:continue` 则逐个创建。

> apply 之前必须完成 tasks.md（包含 6 步嵌入式 TDD 子步骤）。如果 tasks 尚未创建，apply 会提示使用 continue 或 ff。

---

### 3.4 `/opsx:apply` — 实现任务

**作用**：按照 `tasks.md` 中的任务清单逐个实现。作为**外循环控制器**，每次只处理一个任务。

**示例**：
```
/opsx:apply add-user-auth
```

**执行模型：两层架构**：

- **Layer 1 — TDD 周期（强约束）**：每个 task 内嵌 6 个 TDD 子步骤，不可跳过
- **Layer 2 — Subagent 隔离（执行增强）**：包裹 TDD 周期，提供工作树隔离 + 两阶段审查

**The Iron Law**: `NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST`

**工作流程（每个任务三阶段）**：

```
┌──────────────────────────────────────────────────────┐
│               Apply 外循环（每次一个 Task）             │
├──────────────────────────────────────────────────────┤
│  Phase A: Pre-context                                │
│  ├─ A1. TDD Contract: 读取 6 个嵌入式 TDD 子步骤      │
│  ├─ A2. Spec reference: 解析 [Spec: REQ-xxx] 注入    │
│  └─ A3. Execution mode: 按复杂度选 subagent 模型      │
│                                                      │
│  Phase B: Task Execution                             │
│  ├─ B1. TDD 周期（强制）:                             │
│  │   RED → Verify RED → GREEN → Verify GREEN         │
│  │   → REFACTOR → SIMPLIFY                           │
│  ├─ B2. Subagent 包裹:                               │
│  │   Skill("subagent-driven-development")            │
│  │   → subagent 可用: 隔离执行 + 两阶段审查           │
│  │   → subagent 不可用 (降级):                        │
│  │      B2-fallback 本地执行:                         │
│  │      TDD + spec self-check + systematic-debugging │
│  │      + code quality self-review                    │
│  │      + 3-attempt rule → BLOCKED escalation         │
│                                                      │
│  Phase C: Post-checkpoint                            │
│  ├─ C0. Sub-step compliance: 验证 6 个子 checkbox    │
│  │    全部 [x]。缺失 → Retry/Explain/Override         │
│  ├─ C1. Update tasks.md: [ ] → [x]                   │
│  ├─ C2. Commit: git commit -m "feat(1.1): ..."      │
│  ├─ C3. Update .openspec.yaml: last_checkpoint       │
│  └─ C4. Read next task → return to outer loop         │
└──────────────────────────────────────────────────────┘
```

**tasks.md 标注语法**：

```markdown
## 1. 认证核心

- [ ] 1.1 [Spec: REQ-auth-login] 实现邮箱登录接口
  - [ ] RED: Write failing test for this
  - [ ] Verify RED: Confirm test fails correctly
  - [ ] GREEN: Write minimal code to pass
  - [ ] Verify GREEN: Confirm pass + no regressions
  - [ ] REFACTOR: Clean up, keep tests green
  - [ ] SIMPLIFY: Review changed files

## 2. OAuth 集成

- [ ] 2.1 [Spec: REQ-oauth-google] 实现 Google OAuth 回调
  - [ ] RED: Write failing test for this
  - [ ] Verify RED: Confirm test fails correctly
  - [ ] GREEN: Write minimal code to pass
  - [ ] Verify GREEN: Confirm pass + no regressions
  - [ ] REFACTOR: Clean up, keep tests green
  - [ ] SIMPLIFY: Review changed files
- [ ] 2.2 [Spec: REQ-oauth-github] 实现 GitHub OAuth 回调
  - [ ] RED: Write failing test for this
  - [ ] Verify RED: Confirm test fails correctly
  - [ ] GREEN: Write minimal code to pass
  - [ ] Verify GREEN: Confirm pass + no regressions
  - [ ] REFACTOR: Clean up, keep tests green
  - [ ] SIMPLIFY: Review changed files
```

| 标注 | 作用 |
|------|------|
| 6 embedded sub-steps | RED → Verify RED → GREEN → Verify GREEN → REFACTOR → SIMPLIFY（不可跳过） |
| `[Spec: REQ-xxx]` | 精确注入对应需求块（描述 + 所有 Scenario）作为上下文 |
| `[Spec: REQ-001, REQ-003]` | 多引用，注入多个需求的上下文 |

---

### 3.5 系统调试（Systematic Debugging）

当 task 执行过程中出现**任何失败**（测试失败、构建错误、Review 发现问题、意外行为），触发系统调试流程。

#### 触发时机

| 场景 | 调试路径 |
|------|---------|
| Subagent 内 implementer 遇到失败 | implementer-prompt.md "When Something Fails" 章节（四阶段 + 3-attempt） |
| Subagent 不可用，本地 B2-fallback | apply-change B2-fallback 中的 systematic-debugging 引用 |
| Review 发现问题 | implementer 先走根因分析，再修复（非随机 fix） |

#### 四阶段流程

```
Phase 1: Root Cause Investigation
  ├─ 完整阅读错误消息和堆栈
  ├─ 一致复现问题
  ├─ 检查最近的变更
  └─ 追踪数据流：逆向追溯调用栈找到源头
      └─ 复杂调用栈 → @systematic-debugging/root-cause-tracing.md

Phase 2: Pattern Analysis
  ├─ 找相似的工作代码做对比
  ├─ 列出工作 vs 失败的所有差异
  └─ 理解依赖和假设

Phase 3: Hypothesis and Testing
  ├─ 提出单一假设："我认为 X 是根因，因为 Y"
  ├─ 最小变更测试（一次一个变量）
  └─ 验证通过 → Phase 4 / 不通过 → 新假设

Phase 4: Fix and Verify
  ├─ 创建复现测试
  ├─ 单一修复（不混入其他改动）
  ├─ 验证通过
  └─ 加固：在数据流每一层加校验
      └─ @systematic-debugging/defense-in-depth.md
```

#### 3-Attempt 规则

| 修复次数 | 行为 |
|---------|------|
| 1-2 次失败 | 回到 Phase 1，用新信息重新分析 |
| **3+ 次失败** | **停止，不要尝试第 4 次**。报告 BLOCKED —— 这可能是架构问题，不是实现问题 |

#### 辅助文件

| 文件 | 用途 | 位置 |
|------|------|------|
| `root-cause-tracing.md` | 逆向追踪调用栈找到源头 | 内嵌在 implementer-prompt，B2-fallback 引用 |
| `defense-in-depth.md` | 修复后在数据流每一层加校验 | 同上 |
| `condition-based-waiting.md` | 替换任意延迟为条件轮询（修复 flaky tests） | 同上 |
| `find-polluter.sh` | 二分查找哪个测试引入了污染 | systematic-debugging/ 目录 |

> 子代理模式下，调试流程嵌入在 subagent 内部（由 subagent-driven-development 技能管理）。降级模式下，apply 控制器直接在本地执行相同流程。

---

### 3.6 `/opsx:sync` — 同步规格

**作用**：将 delta specs（变更中的规格变更）合并到主 specs 目录。

**示例**：
```
/opsx:sync add-user-auth
```

**操作类型**：
- **ADDED** → 追加到主 specs
- **MODIFIED** → 替换主 specs 中的对应内容
- **REMOVED** → 从主 specs 中移除
- **RENAMED** → 更新名称引用

---

### 3.7 `/opsx:archive` — 归档变更

**作用**：完成变更闭环——验证、同步规格、冲突检测、清理 worktree、移动变更到归档目录。

**示例**：
```
/opsx:archive add-user-auth
```

**执行步骤**：

```
1. 选择 change（未指定时交互选择）
2. 检查制品完成状态（未完成→警告+确认）
3. 检查任务完成状态（有未完成任务→警告+确认）
4. 验证检查（未运行 verify → 提示 /opsx:verify）    ← 可选运行
5. 审查检查（无 review.md → 提示 /opsx:review）      ← 可选运行
6. 冲突检测（扫描并行 change 的文件交集+spec 冲突）   ← 自动执行
7. 同步 delta specs → 主 specs
8. 归档：mv openspec/changes/<name> → archive/YYYY-MM-DD-<name>
9. 清理 git worktree
10. 显示摘要（spec 同步/审查/worktree/验证 状态）
```

**归档摘要示例**：
```
## Archive Complete

**Change:** add-user-auth → openspec/changes/archive/2026-05-18-add-user-auth/
**Specs:** ✓ Synced | **Review:** ✓ | **Worktree:** ✓
All done.
```

**CLI 等效命令**：
```bash
openspec archive add-user-auth
# 有冲突时自动检测并提示
```

---

## 4. 增强工作流详解

### 4.1 `/opsx:new` — 新建变更目录

**作用**：创建一个新的 change 目录骨架。

```
/opsx:new add-dark-mode
```

**生成**：
```
openspec/changes/add-dark-mode/
└── .openspec.yaml
```

---

### 4.2 `/opsx:continue` — 继续创建制品

**作用**：在已有 change 中继续创建下一个待完成的制品。

```
/opsx:continue add-user-auth
```

AI 自动判断下一个 ready 的制品并引导创建。

---

### 4.3 `/opsx:ff` — 快速前进

**作用**：一次性创建所有制品（提案→规格→设计→任务），跳过快照式对话。

**示例**：
```
/opsx:ff "添加导出 CSV 功能"
```

**复杂度自适应**：

| 复杂度 | 条件 | Plan 格式 |
|--------|------|-----------|
| Simple | 1-3 文件，单模块，无架构决策 | 紧凑——仅关键决策 |
| Medium | 4-10 文件，2-3 模块 | 标准 design.md |
| Complex | 10+ 文件，跨 domain | 调用 `Skill("writing-plans")` 生成详细设计 |

**输出**：
```
Change: add-csv-export
Complexity: Medium → Standard design.md

✓ Created proposal.md
✓ Created specs/csv-export/spec.md
✓ Created design.md
✓ Created tasks.md

All artifacts created! Ready for implementation.
Run /opsx:apply to start implementing.
```

---

### 4.4 `/opsx:verify` — 双层验证

**作用**：双层验证——Layer 1 执行测试 + Layer 2 6 维度一致性审计。

**示例**：
```
/opsx:verify add-user-auth
```

**输出示例**：

```
## Verification Report: add-user-auth

### Layer 1 — Execution
| Metric        | Result     |
|---------------|------------|
| Tests Passed  | 12/12      |
| Coverage      | 87%        |
| Failing Tests | 0          |

### Layer 2 — Consistency Audit
| Dimension             | Grade   | Detail                              |
|-----------------------|---------|--------------------------------------|
| Spec Coverage         | Pass    | 5/5 requirements covered            |
| Scenario Completeness | Pass    | 8 scenarios, 2 test files found     |
| Task Alignment        | Pass    | 7/7 tasks complete                  |
| Design Consistency    | Warning | 1/3 decisions unverified            |
| Scope Boundary        | Pass    | 8 files, appropriate scope          |
| Implicit Change       | Pass    | 3 symbols, all within scope         |

### Final Assessment
**Overall: Warning** — 1 warning, 5 pass. Review warnings before archiving.
```

**6 个审计维度说明**：

| # | 维度 | 检测内容 |
|---|------|----------|
| 1 | Spec Coverage | 每个需求是否有对应代码实现 |
| 2 | Scenario Completeness | 每个 Given/When/Then 是否有测试路径 |
| 3 | Task Alignment | checkbox 状态与实际代码变更是否一致 |
| 4 | Design Consistency | 架构决策是否在代码中体现 |
| 5 | Scope Boundary | 是否有多余文件或超大 scope |
| 6 | Implicit Change | 是否有未声明的隐式行为修改 |

**程序化审计（CLI）**：

```bash
# 代码驱动的审计，结果可复现 —— 不依赖 AI 判断
openspec verify --change add-user-auth

# JSON 输出
openspec verify --change add-user-auth --json
```

> `/opsx:verify`（AI 模板）和 `openspec verify`（CLI 代码）使用**相同的 6 维度审计逻辑**。前者由 AI 按模板指令执行，后者由 `consistencyAudit()` 纯函数执行。两者结果应一致——如果出现差异，说明 AI 未严格遵守模板指令。

---

### 4.5 `/opsx:review` — 代码审查

**作用**：根据变更复杂度自适应审查深度。

**示例**：
```
/opsx:review add-user-auth
```

**三种审查模式**：

| 复杂度 | 条件 | 审查方式 |
|--------|------|----------|
| Simple | < 5 文件，< 200 行 | Self-audit checklist，无 review.md |
| Medium | 5-15 文件，200-800 行 | AI 自审（Form A）→ 生成 review.md |
| Complex | 15+ 文件，800+ 行，架构变更 | 两阶段（Form B）：AI 自审 + `Skill("requesting-code-review")` |

**review.md 结构**：
```markdown
## Review Summary
## Findings
### CRITICAL
### WARNING
### SUGGESTION
## Spec Compliance
## Design Adherence
## Action Items
```

---

### 4.6 `/opsx:simplify` — 代码精炼

**作用**：精炼当前任务修改的代码，生成独立 commit。

**示例**：
```
/opsx:simplify
```

**执行**：
1. `git diff --name-only HEAD` → 获取当前任务变更文件
2. SIMPLIFY 子步骤 → 检查重用、消除重复、命名一致性
3. `git commit -m "simplify(1.2): refine code from task 1.2"` → 独立 commit

**撤销**：
```bash
git revert HEAD --no-edit   # 撤销 simplify commit，实现 commit 保持完整
```

> **注意**：此命令通常在 apply 的 Post-checkpoint 阶段自动调用，也可手动执行。

---

## 5. 生命周期管理

### 5.1 `/opsx:abort` — 中止变更

**作用**：非破坏性中止变更——备份所有工作，提供恢复路径。

**示例**：
```
/opsx:abort add-user-auth
```

**两种模式**：

**Worktree 模式**（有 git worktree）：
```bash
git branch refs/heads/aborted/add-user-auth HEAD   # 备份分支
mv openspec/changes/add-user-auth openspec/changes/aborted/add-user-auth
git worktree remove <worktree-path> --force
```

**Folder-only 模式**（无 worktree）：
```bash
# 复制源文件到 aborted/<name>/source/
for file in $(git diff --name-only HEAD); do
  mkdir -p openspec/changes/aborted/add-user-auth/source/$(dirname "$file")
  cp "$file" openspec/changes/aborted/add-user-auth/source/"$file"
done
mv openspec/changes/add-user-auth openspec/changes/aborted/add-user-auth
git checkout -- .   # 还原代码
```

**恢复方法**：
```bash
# 恢复制品
mv openspec/changes/aborted/add-user-auth openspec/changes/add-user-auth
# 恢复代码（worktree 模式）
git checkout refs/heads/aborted/add-user-auth -b add-user-auth
# 继续工作
/opsx:apply add-user-auth
```

---

### 5.2 `/opsx:rewind` — 回退任务

**作用**：回退到之前的某个任务，撤销后续实现，同步 checkbox 状态。

**示例**：
```
/opsx:rewind add-user-auth
```

**交互流程**：
```
## Rewind: add-user-auth

Current progress:
✅ 1.1: 实现邮箱登录
✅ 1.2: 添加密码哈希
✅ 1.3: 添加会话管理
[ ] 1.4: 添加频率限制

Which task to rewind TO?
[1] Keep up to 1.1 (rewind 1.2 → 1.3)
[2] Keep up to 1.2 (rewind 1.3 only)
[3] Keep up to 1.3 (no rewind needed)
```

选择 [1] 后：
```bash
# 逆序撤销 task 1.3 和 1.2 的 commits
git revert <1.3-commit> --no-edit
git revert <1.2-commit> --no-edit

# tasks.md checkbox 自动同步
- [x] 1.1 实现邮箱登录
- [ ] 1.2 添加密码哈希    ← 重置
- [ ] 1.3 添加会话管理    ← 重置
```

---

### 5.3 `/opsx:unarchive` — 恢复归档

**作用**：将已归档的变更恢复到活跃状态。

**示例**：
```
/opsx:unarchive add-user-auth
```

**执行**：
1. 列出 `openspec/changes/archive/` 中已归档的变更
2. 确认恢复（警告：代码不会自动恢复）
3. 反向操作 delta specs（ADDED→移除, MODIFIED→回滚, REMOVED→恢复, RENAMED→还原）
4. `mv openspec/changes/archive/2026-05-10-add-user-auth openspec/changes/add-user-auth`

**代码恢复（手动）**：
```bash
git reflog | grep add-user-auth           # 找原始分支/commit
git checkout <branch-name>                # 或
git cherry-pick <commit-range>            # 或
git checkout refs/heads/aborted/add-user-auth -b add-user-auth
```

---

## 6. 并行安全

### 6.1 冲突检测（自动化）

在 `/opsx:archive` 执行时自动检测：

```
⚠ Parallel change conflicts detected:
  - Conflict with "add-oauth": file-intersection — Both changes reference
    2 common file(s): src/auth/login.ts, src/utils/hash.ts
  - Conflict with "add-oauth": spec-semantic — Both changes modify
    requirement "REQ-user-can-login" (User can login)

Review these conflicts before archiving.
Continue with archive anyway? (y/N)
```

**CLI 命令**：
```bash
openspec archive add-user-auth   # 自动检测冲突
```

---

### 6.2 循环依赖检测

**CLI 命令**：
```bash
openspec status --deps
```

**输出示例**：
```
Dependency Tree:
add-user-auth
  add-oauth
    add-session
  add-rate-limit
add-oauth
  add-session
add-session (no dependencies)
add-rate-limit (no dependencies)

No circular dependencies detected across 4 active change(s).
```

**有循环时**：
```
Dependency Tree:
add-user-auth
  add-oauth
    add-user-auth    ← 循环！

⚠ Detected 1 circular dependency: add-user-auth → add-oauth → add-user-auth
```

**JSON 输出**：
```bash
openspec status --deps --json
```

---

### 6.3 增量 re-verify

归档前自动检查：如果上次 verify 后有其他 change 修改了相同 spec 并归档，触发 re-verify。

```
⚠ 2 change(s) modified the same specs after last verify:
  2026-05-15-add-session, 2026-05-16-fix-password-hash.
  Re-verify recommended.
```

---

## 7. 工程度量

### 7.1 `openspec metrics`

**作用**：查看工程纪律度量指标。

```bash
openspec metrics
```

**输出示例**：
```
Engineering Discipline Metrics
Based on 8 change(s), 12 snapshot(s)

  指标                   均值       趋势
  ─────────────────────────────────────────
  Spec 覆盖率            87%        ↑
  流转效率               72%        →
  缺陷逃逸率             0.5次/变更  ↓
  过度工程化占比         8%         ↓
  回滚率                 0.2次/变更  →
  用户介入次数           1.5次/变更  →

Latest: add-csv-export (2026-05-16T08:30:00.000Z)
```

**JSON 输出**：
```bash
openspec metrics --json
```

### 6 项指标说明

| 指标 | 含义 | 越低越好？ |
|------|------|------------|
| Spec 覆盖率 | 有代码实现追踪的需求百分比 | 否 |
| 流转效率 | 活跃时间 / 总周期时间 | 否 |
| 缺陷逃逸率 | 归档后发现的问题数/变更 | 是 |
| 过度工程化占比 | 被标记为不必要的任务百分比 | 是 |
| 回滚率 | 每个变更的回退次数 | 是 |
| 用户介入次数 | 每次变更的手动干预次数 | 是 |

### 趋势判定

```
↑ improving   ↓ declining   → stable
```

数据存储在 `openspec/.metrics.yaml`。`specCoverage` 由 `openspec verify --change` 自动采集，其余 5 项指标需手动调用 `recordMetrics` API 写入。

---

## 8. 配置参考

### 8.1 默认值清单

所有配置项都有默认值，不配置即可直接使用。以下列出全部配置项及其默认行为。

#### 项目级配置（`openspec/config.yaml`）

| 配置项 | 默认值 | 可选值 | 说明 |
|--------|--------|--------|------|
| `schema` | `spec-driven` | `spec-driven` / `superpowers` | 工作流 schema，设为 `superpowers` 启用增强工作流 |
| `context` | （空） | 任意文本 | 注入到所有制品创建指令中的项目背景 |
| `rules.<artifact>` | （空） | 字符串数组 | 按制品 ID 指定的规则，如 `rules.tasks: ["每个 task 2h 内"]` |
| `discipline.level` | `strict` | `core` / `enhanced` / `strict` | 工程纪律级别。所有级别强制执行 6 步嵌入式 TDD 子步骤 |
| `discipline.subagent.mode` | `per-task` | `per-task` | subagent 模式：每个 task 强制执行 subagent-driven-development |
| `discipline.worktree.enabled` | `true` | `true` / `false` | 是否使用 git worktree 隔离开发环境 |
| `discipline.exploration.search_history` | `false` | `true` / `false` | 是否追踪探索模式中的搜索历史 |

#### 全局配置（`~/.config/openspec/config.json`）

| 配置项 | 默认值 | 可选值 | 说明 |
|--------|--------|--------|------|
| `profile` | `core` | `core` / `enhanced` / `strict` / `custom` | 全局默认 profile，`openspec init` 时生效 |
| `delivery` | `both` | `both` / `skills` / `commands` | 生成文件类型：both 全部，skills 仅技能，commands 仅命令 |
| `featureFlags` | `{}` | key: boolean | 特性开关，控制实验性功能 |

#### 各默认值的含义

| 配置项 = 默认值 | 实际行为 |
|----------------|----------|
| `discipline.level = core` | AI 直接按模板指令实现，不调用任何 Superpowers 技能 |
| TDD 强制执行 | 所有 task 内嵌 6 个 TDD 子步骤（RED→Verify RED→GREEN→Verify GREEN→REFACTOR→SIMPLIFY） |
| `discipline.subagent.mode = per-task` | 每个 task 强制执行 subagent-driven-development |
| `discipline.worktree.enabled = true` | `openspec init` 时创建 git worktree；apply 时在 worktree 中隔离开发 |
| `profile = strict`（默认） | `openspec init` 生成 14 个命令，TDD + subagent 强制执行 |

### 8.2 完整配置示例

```yaml
# openspec/config.yaml
schema: specpower-driven

context: |
  This is a TypeScript monorepo using React + Express.
  Tests use Vitest. API follows REST conventions.

rules:
  tasks:
    - "每个任务必须在 2 小时内可完成"
    - "优先使用函数组件和 hooks"
  design:
    - "API 设计遵循 OpenAPI 3.0 规范"
    - "数据库变更必须有 migration 脚本"

discipline:
  level: strict
  subagent:
    mode: per-task
  worktree:
    enabled: true
  exploration:
    search_history: false
```

> **最小配置**：只需要 `schema: specpower-driven` 一行即可，其余全部使用默认值。

### 8.3 Profile 对比

| Profile | Workflows | 技能调用 | 适用场景 |
|---------|-----------|----------|----------|
| `core` | 5 个 | 无 | 新手、简单项目 |
| `enhanced` | 14 个 | 是，缺失降级 | 标准工程团队 |
| `strict` | 14 个 | 是，缺失报错 | 受监管行业、严格 CI |
| `custom` | 自选 | 取决于配置 | 定制化需求 |

---

## 9. 典型工作流示例

### 示例 1：标准功能开发（完整流程）

```bash
# 1. 初始化项目
openspec init

# 2. 探索阶段（可选）
/opsx:explore "添加数据导出功能，支持 CSV 和 JSON 格式"

# 3. 探索结束后生成记录（可选）
# AI 提议 → 选择生成 exploration.md

# 4. 快速创建所有制品
/opsx:ff "添加数据导出功能"

# 5. 开始实现
/opsx:apply add-data-export

# AI 自动：
#   Task 1.1: Execute 6 embedded TDD sub-steps
#   → git commit -m "simplify(1.1): ..."
#   → git commit -m "simplify(1.2): ..."
#   ...

# 6. 验证
/opsx:verify add-data-export

# 7. 代码审查（复杂变更）
/opsx:review add-data-export

# 8. 归档
/opsx:archive add-data-export

# 9. 查看度量
openspec metrics
```

### 示例 2：回退和恢复

```bash
# 实现过程中发现 Task 1.3 方向错误
/opsx:rewind add-data-export
# 选择回退到 Task 1.1，保留 1.2

# 重新实现
/opsx:apply add-data-export

# 或者完全放弃
/opsx:abort add-data-export

# 之后恢复
/opsx:unarchive add-data-export
```

### 示例 3：并行变更 + 冲突管理

```bash
# 两个开发者同时工作
/opsx:ff "重构认证模块"           # change-a
/opsx:ff "添加 OAuth 登录"         # change-b

# 归档 change-a 时自动检测
/opsx:archive change-a
# ⚠ Conflict: change-b 也修改了 src/auth/login.ts
# 需要协调后继续

# 检查依赖关系
openspec status --deps
```

### 示例 4：严格模式流水线

```bash
# 配置
# openspec/config.yaml:
#   discipline:
#     level: strict
#     tdd:
#       default: full

/opsx:apply add-payment-gateway

# AI 行为：
#   每个 task: 执行 6 个嵌入式 TDD 子步骤
#   技能缺失 → 报错（不降级）
#   不允许 Skip TDD
```

### 示例 5：变更间依赖

**`.openspec.yaml` 中声明依赖**：

```yaml
# openspec/changes/add-api-gateway/.openspec.yaml
schema: specpower-driven
created: 2026-05-16
depends_on:
  - add-auth-service
  - add-rate-limit
last_checkpoint: "2.3"
```

**Apply 前验证**：
```bash
openspec status --deps
# 显示 add-api-gateway → add-auth-service, add-rate-limit
# 若依赖未归档 → 阻塞 apply
```

---

## 命令快速索引

| 命令 | 类型 | 作用 |
|------|------|------|
| `/opsx:propose` | 核心 | 创建变更提案 |
| `/opsx:explore` | 核心 | 自由探索，不写代码 |
| `/opsx:apply` | 核心 | 逐任务实现（外循环） |
| `/opsx:sync` | 核心 | 同步 delta specs → 主 specs |
| `/opsx:archive` | 核心 | 归档变更，闭环 |
| `/opsx:new` | 增强 | 新建变更目录 |
| `/opsx:continue` | 增强 | 继续创建下一个制品 |
| `/opsx:ff` | 增强 | 一次性创建所有制品 |
| `/opsx:verify` | 增强 | 双层验证（L1 测试+L2 审计） |
| `/opsx:review` | 增强 | 复杂度自适应代码审查 |
| `/opsx:simplify` | 增强 | 精炼当前任务代码 |
| `/opsx:abort` | 生命周期 | 非破坏性中止变更 |
| `/opsx:rewind` | 生命周期 | 回退到指定任务 |
| `/opsx:unarchive` | 生命周期 | 恢复归档的变更 |

| CLI 命令 | 作用 |
|----------|------|
| `openspec init` | 默认初始化（strict profile，14 工作流，TDD 强制执行） |
| `openspec status --deps` | 查看依赖树+循环检测 |
| `openspec verify --change <name>` | 程序化 6 维度一致性审计（代码驱动，结果可复现） |
| `openspec check --change <name>` | 静态合规检查：扫描 tasks.md TDD 标注，对照 discipline 配置验证 |
| `openspec archive <name>` | 归档（含冲突检测） |
| `openspec metrics` | 查看工程度量 |
| `openspec metrics --json` | JSON 格式输出度量 |
