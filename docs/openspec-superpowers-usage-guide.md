# OpenSpec Superpowers 使用手册

> 基于 OpenSpec v1.3.1 + Superpowers 融合方案，覆盖 P0-P6 全部功能。

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
openspec init --profile enhanced --tools claude
```

这会在 `.claude/` 下生成 **14 个命令**和 **14 个技能**：

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
    ├── ...（14 个技能目录）
```

### 配置 discipline 级别

编辑 `openspec/config.yaml`：

```yaml
schema: superpowers
discipline:
  level: enhanced       # core | enhanced | strict
  tdd:
    default: adaptive   # full | lite | skip | adaptive
  subagent:
    mode: adaptive      # off | per-task | adaptive
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

   核心工作流 (5):  propose   explore   apply   sync   archive
   增强工作流 (9):  new   continue   ff   verify   review   simplify
                   abort   rewind   unarchive
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
│  职责：告诉 AI 何时调用哪个技能                               │
│  Skill({skill: "test-driven-development"})                 │
│              │                                              │
│              ▼                                              │
│  执行层（Superpowers 技能）                                  │
│  ~/.claude/skills/<name>/SKILL.md                          │
│  职责：告诉 AI 如何执行（TDD 步骤/审查维度/精炼规则）         │
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
  "读取 tasks.md，解析 [TDD: Full] 标注"
  "[TDD: Full] → Skill({skill: 'test-driven-development'})"
      │
      ▼
AI 使用 Skill 工具调用外部技能               ← Claude Code 内置能力
      │
      ▼
test-driven-development 技能被激活
  提供 RED→GREEN→REFACTOR 具体指令
  AI 按指令：写测试 → 验证失败 → 写代码 → 验证通过 → 重构
      │
      ▼
控制权回到 apply 模板（Post-checkpoint）
  - 更新 tasks.md checkbox: [ ] → [x]
  - Skill({skill: "simplify"}) → 精炼变更文件
  - git commit -m "simplify(1.1): refine code"
  - 读取下一个 task，返回外循环入口
```

### 3.3 以一次 TDD 任务为例

`tasks.md` 中的任务：

```markdown
- [ ] 1.1 [TDD: Full] [Spec: REQ-auth-login] 实现邮箱登录接口
```

AI 执行的三阶段：

```
Phase A: Pre-context（OpenSpec 编排）
  ├─ 解析 [TDD: Full] → 确定调用 test-driven-development 技能
  ├─ 解析 [Spec: REQ-auth-login] → 搜索 specs/auth/spec.md
  ├─ 提取 "### Requirement: 用户可通过邮箱登录" + 所有 Scenario
  └─ 将需求块作为上下文注入

Phase B: Skill Execution（Superpowers 执行）
  ├─ Skill("test-driven-development") 指令指导：
  │   1. RED:   写一个会失败的测试，聚焦需求 Scenario
  │   2. Verify: 运行测试，确认失败原因符合预期
  │   3. GREEN: 写最小量代码使测试通过
  │   4. Verify: 运行全量测试，确认全部通过
  │   5. REFACTOR: 改进代码结构，保持测试绿色
  └─ AI 在技能指导下写出测试和实现代码

Phase C: Post-checkpoint（OpenSpec 编排）
  ├─ 更新 tasks.md: - [x] 1.1 实现邮箱登录接口
  ├─ Skill("simplify") → 检查变更文件的复用/重复/命名一致性
  ├─ git commit -m "simplify(1.1): refine code from task 1.1"
  ├─ 更新 .openspec.yaml: last_checkpoint: "1.1"
  └─ 读取下一个 task，返回 Phase A
```

### 3.4 技能可用性检测

每次调用技能前，AI 会检查技能目录是否存在：

```
检查 ~/.claude/skills/test-driven-development/SKILL.md

┌──────────┬──────────────────────────────────────────┐
│ Profile  │ 技能缺失时的行为                           │
├──────────┼──────────────────────────────────────────┤
│ core     │ 不调用任何技能，AI 按模板指令直接实现       │
│ enhanced │ 降级为内置简化版 + 提示:                   │
│          │ "[Skill check] xxx ✗ (降级为内置 Lite)"   │
│ strict   │ 报错，拒绝继续:                            │
│          │ "[Skill check] xxx ✗ — 请安装后重试"       │
└──────────┴──────────────────────────────────────────┘
```

### 3.5 命令→技能映射表

| 命令 | 调用的技能 | 触发条件 |
|------|-----------|----------|
| `/opsx:apply` | `test-driven-development` | `[TDD: Full]` 或 `[TDD: Lite]` 标注 |
| `/opsx:apply` | `simplify` | 每个 task 完成后的 Post-checkpoint |
| `/opsx:apply` | `subagent-driven-development` | `discipline.subagent.mode: per-task` 或 `adaptive`+复杂 task |
| `/opsx:verify` | `verification-before-completion` | Layer 1 执行验证阶段 |
| `/opsx:ff` | `writing-plans` | 检测到 Complex 级别变更（10+ 文件/跨 domain） |
| `/opsx:review` | `requesting-code-review` | 检测到 Complex 级别变更（15+ 文件/架构变更） |
| `/opsx:explore` | `brainstorming` | AI 提议，用户可选（不自动调用） |
| `/opsx:simplify` | `simplify` | 手动调用或 apply Post-checkpoint 自动触发 |

### 3.6 模板是桥接点

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

### 3.1 `/opsx:propose` — 创建提案

**作用**：创建一个新的变更提案，生成 `proposal.md`。

**示例**：
```
/opsx:propose "添加用户认证功能，支持邮箱+OAuth登录"
```

**生成文件**：
```
openspec/changes/add-user-auth/
├── .openspec.yaml
└── proposal.md     ← 生成：Why / What Changes / Capabilities / Impact
```

**后续步骤**：AI 会提示你继续创建规格和设计 (`/opsx:continue`)。

---

### 3.2 `/opsx:explore` — 探索模式

**作用**：进入自由探索模式，用于调研问题、比较方案、理清思路。**不写代码**。

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

### 3.3 `/opsx:apply` — 实现任务

**作用**：按照 `tasks.md` 中的任务清单逐个实现。作为**外循环控制器**，每次只处理一个任务。

**示例**：
```
/opsx:apply add-user-auth
```

**工作流程（每个任务三阶段）**：

```
┌─────────────────────────────────────────────────────┐
│               Apply 外循环（每次一个 Task）            │
├─────────────────────────────────────────────────────┤
│  Phase A: Pre-context                               │
│  ├─ 解析 [TDD: Full/Lite/Skip] 标注                 │
│  ├─ 解析 [Spec: REQ-xxx] 标注，精确注入需求块        │
│  └─ 判断 subagent 模式                              │
│                                                     │
│  Phase B: Skill Execution                           │
│  ├─ [TDD: Full] → Skill("test-driven-development")  │
│  ├─ [TDD: Lite] → Skill + skip-refactor             │
│  └─ [TDD: Skip] → 直接实现                          │
│                                                     │
│  Phase C: Post-checkpoint                           │
│  ├─ 更新 tasks.md checkbox: [ ] → [x]              │
│  ├─ Skill("simplify") → 精炼代码                    │
│  ├─ git commit -m "simplify(1.1): ..."             │
│  └─ 更新 .openspec.yaml: last_checkpoint            │
└─────────────────────────────────────────────────────┘
```

**tasks.md 标注语法**：

```markdown
## 1. 认证核心

- [ ] 1.1 [TDD: Full] [Spec: REQ-auth-login] 实现邮箱登录接口
- [ ] 1.2 [TDD: Lite] 添加密码哈希工具
- [ ] 1.3 [TDD: Skip] 更新 README 认证说明

## 2. OAuth 集成

- [ ] 2.1 [TDD: Full] [Spec: REQ-oauth-google] 实现 Google OAuth 回调
- [ ] 2.2 [TDD: Full] [Spec: REQ-oauth-github] 实现 GitHub OAuth 回调
```

| 标注 | 作用 |
|------|------|
| `[TDD: Full]` | 完整 RED→GREEN→REFACTOR 循环 |
| `[TDD: Lite]` | 先写测试再实现，跳过 refactor |
| `[TDD: Skip]` | 不强制测试优先 |
| `[Spec: REQ-xxx]` | 精确注入对应需求块作为上下文 |
| `[Spec: REQ-001, REQ-003]` | 多引用，注入多个需求 |

---

### 3.4 `/opsx:sync` — 同步规格

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

### 3.5 `/opsx:archive` — 归档变更

**作用**：完成变更闭环——验证、同步规格、冲突检测、清理 worktree、移动变更到归档目录。

**示例**：
```
/opsx:archive add-user-auth
```

**执行步骤**：

```
1. 检查制品完成状态
2. 检查任务完成状态
3. ⚠ 冲突检测（并行 change 扫瞄）         ← P4 新增
4. 若未验证 → 提示运行 /opsx:verify
5. 同步 delta specs → 主 specs
6. 移动 openspec/changes/<name> → archive/YYYY-MM-DD-<name>
7. 清理 git worktree
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
2. `Skill("simplify")` → 检查重用、消除重复、命名一致性
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

数据存储在 `openspec/.metrics.yaml`，每次 archive 自动采集。

---

## 8. 配置参考

### 8.1 `openspec/config.yaml` 完整示例

```yaml
schema: superpowers

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
  level: enhanced
  tdd:
    default: adaptive
  subagent: 
    mode: adaptive
  worktree:
    enabled: true
  exploration:
    search_history: false
```

### 8.2 Profile 对比

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
openspec init --profile enhanced --tools claude

# 2. 探索阶段（可选）
/opsx:explore "添加数据导出功能，支持 CSV 和 JSON 格式"

# 3. 探索结束后生成记录（可选）
# AI 提议 → 选择生成 exploration.md

# 4. 快速创建所有制品
/opsx:ff "添加数据导出功能"

# 5. 开始实现
/opsx:apply add-data-export

# AI 自动：
#   Task 1.1 [TDD: Full] → Skill("test-driven-development")
#   → git commit -m "simplify(1.1): ..."
#   Task 1.2 [TDD: Lite] → Skill + skip-refactor
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
#   每个 [TDD: Full] task → Skill("test-driven-development")
#   技能缺失 → 报错（不降级）
#   不允许 Skip TDD
```

### 示例 5：变更间依赖

**`.openspec.yaml` 中声明依赖**：

```yaml
# openspec/changes/add-api-gateway/.openspec.yaml
schema: superpowers
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
| `openspec init --profile enhanced` | 初始化增强工作流 |
| `openspec status --deps` | 查看依赖树+循环检测 |
| `openspec archive <name>` | 归档（含冲突检测） |
| `openspec metrics` | 查看工程度量 |
| `openspec metrics --json` | JSON 格式输出度量 |
