# OpenSpec × Superpowers 融合方案

## 1. 融合概述

OpenSpec 和 Superpowers 分别代表了 AI 辅助开发的两大支柱：

| 维度 | OpenSpec | Superpowers |
|------|----------|-------------|
| **定位** | 规约层（What to build） | 执行层（How to build it right） |
| **核心产出** | Specs、Artifacts、Changes | Skills、Plans、Quality Gates |
| **工作粒度** | Change 级别（feature/bug） | Task 级别（具体实现步骤） |
| **纪律类型** | 规约纪律（对齐先于实现） | 工程纪律（TDD、验证、审查） |
| **生命周期** | propose → apply → archive | brainstorm → plan → execute → finish |

**融合目标**：将 Superpowers 的工程纪律（TDD、审查、验证）按需分层嵌入 OpenSpec 的规约驱动工作流，形成一套从"需求对齐"到"高质量交付"的完整闭环。

---

## 2. 融合架构总览

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                        融合后工作流（OpenSpec + Superpowers）                     │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌──────────────┐                                                               │
│   │  /opsx:explore │  ← 分层融合：自由探索 + 可选 brainstorming                 │
│   │  需求探索      │     姿态保持自由，复杂决策时可选结构化子流程                 │
│   └──────┬───────┘                                                               │
│          │                                                                       │
│          ▼                                                                       │
│   ┌──────────────┐                                                               │
│   │ /opsx:propose │  ← OpenSpec:创建 Change + Artifacts                          │
│   │  创建变更      │                                                               │
│   └──────┬───────┘                                                               │
│          │                                                                       │
│          ▼                                                                       │
│   ┌────────────────────────────────────┐                                         │
│   │  design.md                          │  ← Superpowers:writing-plans            │
│   │  技术方案 + 自适应粒度实施计划       │     按复杂度: Simple/Compact/Full       │
│   └──────┬─────────────────────────────┘                                         │
│          │                                                                       │
│          ▼                                                                       │
│   ┌──────────────┐    /opsx:abort                                               │
│   │ /opsx:apply   │  ← Superpowers:TDD + subagent-driven-dev                    │
│   │  逐项实现      │     按 task 类型选择 TDD 级别 + 按复杂度选择执行模式         │
│   └──┬──────┬────┘                                                               │
│      │      │                                                                    │
│      │      └──────────────────────────────────→  openspec/changes/aborted/       │
│      │                                              (代码保留，可恢复)             │
│      ▼                                                                           │
│   ┌──────────────┐                                                               │
│   │ /opsx:verify  │  ← 双层验证: 测试验证[Superpowers] + 一致性审计[OpenSpec]     │
│   │  验证实现      │     局部正确 → 工程正确                                     │
│   └──┬──────┬────┘                                                               │
│      │      │                                                                    │
│      │      └────────── /opsx:rewind ──→  回到指定 task，继续 apply               │
│      ▼                                                                           │
│   ┌────────────────────────────────────┐                                         │
│   │  Code Review                        │  ← Superpowers:requesting-code-review  │
│   │  自适应审查（简单自审/复杂两阶段）   │     按变更复杂度选择审查深度            │
│   └──────┬─────────────────────────────┘                                         │
│          │                                                                       │
│          ▼                                                                       │
│   ┌──────────────┐                                                               │
│   │ /opsx:archive │  ← Superpowers:finishing-a-development-branch               │
│   │  归档完成      │     合并 specs + 清理 worktree + 完成闭环                    │
│   └──────┬───────┘                                                               │
│          │                                                                       │
│          │    /opsx:unarchive（撤销归档，delta specs 回退，change 回到活跃状态）    │
│          └──────────────────────────────────→  回到 /opsx:apply                   │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2.5 融合的通用原则（修正粗暴替换的元规则）

在详细分析每个融合点之前，先定义避免粗暴替换的通用原则：

| 原则 | 含义 | 反模式（原方案犯的错误） |
|------|------|------------------------|
| **按需增强，非强制替换** | Superpowers 的 discipline 是使能器（enabler），不是门（gate） | 把可选的流程变成 mandatory 的硬门 |
| **复杂度自适应** | 简单变更走轻量路径，复杂变更才启用 full discipline | 简单变更（改配置）也走 full TDD + subagent + review |
| **AI 提议，用户决策** | AI 识别何时需要 discipline，但由用户决定是否启用 | 自动强制执行，不给用户选择 |
| **保持 OpenSpec 的 fluid 本质** | 随时可以跳过、调整、回退任何 discipline | 一旦进入 discipline 流程就无法退出 |

---

## 3. 八大融合点详解（修正版）

### 3.1 Brainstorming ↔ Explore（需求探索阶段）

**核心原则：Explore 的姿态不能被替换，只能被选择性增强。**

OpenSpec 的 `/opsx:explore` 是一种**姿态（stance）**——无固定步骤、无强制产出、允许发散、不施压。Superpowers 的 `brainstorming` 是一种**刚性流程（HARD-GATE）**——必须提出 2-3 种方案、必须获得用户批准。直接替换会让 explore 丧失核心价值。

**正确融合方式：分层融合模型（Layered Fusion）**

| 层级 | 名称 | 主导方 | 作用 |
|------|------|--------|------|
| **Layer 1** | Explore 姿态层 | OpenSpec | 保持完全自由：无固定步骤、不强制产出、允许 tangents |
| **Layer 2** | Brainstorming 子流程 | Superpowers | **可选触发**：当探索涉及复杂决策时，AI **提议**用户进入 brainstorming 模式 |
| **Layer 3** | 产出标准化接口 | 双方约定 | Explore 结束后，无论是否经过 brainstorming，产出格式统一，可被 propose 消费 |

**何时触发 brainstorming 子流程？**

不是每次 explore 都触发。仅在以下情况 AI 主动提议：
- 用户明确要求"比较几个选项"、"帮我分析"、"怎么设计比较好"
- AI 检测到问题涉及多方案 trade-offs
- 用户同意后才执行：*"这个话题涉及多个可行方向，要不要我系统性地列出几种方案对比一下？"*

**Layer 3：产出标准化——`exploration.md` 作为软依赖**

explore 结束后，propose 需要上下文才能生成 proposal。融合方案通过 `exploration.md` 解决传递问题：

```markdown
<!-- exploration.md 模板 —— 灵活而非强制 -->
# Exploration: <主题>

## Key Insights
- [发现 1]
- [发现 2]

## Options Considered [可选]
| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| A | ... | ... | ... |
| B | ... | ... | ... |

## Recommendation [可选]
[推荐方向及理由]

## Open Questions [可选]
- [待澄清问题]
```

**传给 propose 的机制：**
1. 如果 `exploration.md` 存在，propose **自动读取**其内容作为 proposal 的输入上下文
2. 如果不存在，propose 从当前**对话历史**中提取上下文（保持现有行为）
3. `exploration.md` 是**软依赖**——不是强制要求，只是如果存在就让 propose 更精准

**exploration.md 的完整生命周期：**

| 阶段 | 行为 | 说明 |
|------|------|------|
| **Explore** | 生成 `exploration.md`（仅复杂探索时） | 写入 change 文件夹 |
| **Propose** | 自动读取 `exploration.md` 作为上下文 | 若不存在则回退到对话历史 |
| **Apply/Verify** | 不做特殊处理 | exploration.md 不影响执行阶段 |
| **Archive** | 随 change 一起归档 | 保留决策历史，供未来检索 |
| **未来 Explore** | 可搜索历史 exploration.md | 可配置：`config.yaml` 中 `exploration.search_history: true/false` |

> **设计意图**：exploration.md 的价值不仅在当前 change——当未来有人问"为什么选了方案 A 而不是方案 B"时，归档的 exploration.md 就是最完整的决策记录。这一点在技术选型类决策中尤其关键。

**融合后行为对比：**

| 场景 | 原 explore | 融合后 explore |
|------|------------|----------------|
| 简单探索："这行代码为什么报错" | 自由讨论后直接 propose | 不变，仍然自由讨论后直接 propose |
| 复杂探索："如何优化页面加载" | 自由讨论 | 自由讨论 → AI 提议 brainstorming → 用户同意后执行结构化对比 → 可选生成 exploration.md |
| 产出传递 | 无标准格式，靠对话上下文 | exploration.md 提供标准化上下文，propose 可自动消费 |

```text
场景 A（简单探索，不触发 brainstorming）：
You: /opsx:explore "为什么这里报错 TypeError?"
AI:  [自由分析代码] 因为你传了 null 而不是数组...
You: /opsx:propose fix-null-handling   ← 直接跳转，无阻碍

场景 B（复杂探索，触发 brainstorming）：
You: /opsx:explore "如何优化页面加载性能"
AI:  [自由分析代码库]
     我发现有几个方向可以考虑...
     这个话题涉及多个可行方向，要不要我系统性地列出几种方案对比一下？

You: 好
AI:  [执行 brainstorming 子流程]
     方案 A: 图片懒加载（低风险，中收益）
     方案 B: 代码分割（中风险，高收益）
     方案 C: SSR 迁移（高风险，最高收益）
     推荐：A + B 组合

     要不要我把这些记录到 exploration.md，方便后续创建 proposal？

You: 好
AI:  已生成 exploration.md。运行 /opsx:propose optimize-page-load 开始创建变更。
```

---

### 3.2 Writing Plans ↔ Design Artifact（设计阶段）

**原方案问题**：强制把 writing-plans 的完整格式嵌入 design.md，对于简单变更（改一个配置、更新文档）会产生过度工程化的 plan，违背 OpenSpec "easy not complex" 原则。

**修正融合方式：按需增强，Plan 粒度自适应**

| 变更复杂度 | design.md 中的 Plan 形式 | tasks.md 形式 | 示例 |
|------------|--------------------------|---------------|------|
| **简单**（配置/文档/单行修复，1-2 task） | **不添加 Plan 章节** | 轻量 checklist，无 TDD 子步骤 | 改 API endpoint、更新 README |
| **中等**（新组件/功能，3-5 task） | **Compact Plan**：文件列表 + task 映射 | 标准 checklist，关键 task 标注测试文件 | 新增 ThemeToggle 组件 |
| **复杂**（架构变更/重构，5+ task） | **Full Plan**：writing-plans 完整格式 | 每个 task 展开 RED→GREEN→REFACTOR | 重写认证系统 |

**复杂度由 AI 根据以下信号自动判断：**
- 涉及文件数量
- 是否存在架构决策
- 是否需要新增测试基础设施
- 变更是否跨越多个 domain

**中等复杂度 design.md 示例：**
```markdown
# Design: Add Dark Mode

## Technical Approach
...（原有内容）

## Implementation Plan [中等复杂度]

| Task | 文件 | 测试 | 说明 |
|------|------|------|------|
| 1.1 | `src/contexts/ThemeContext.tsx` | `test/contexts/ThemeContext.test.ts` | 创建 Context |
| 1.2 | `src/styles/globals.css` | — | 添加 CSS 变量 |
| 2.1 | `src/components/ThemeToggle.tsx` | `test/components/ThemeToggle.test.ts` | 创建组件 |
```

**复杂变更才使用 writing-plans 完整格式：**
```markdown
## Implementation Plan [复杂]

### Task 1.1: Create ThemeContext
**Files:**
- Create: `src/contexts/ThemeContext.tsx`
- Test: `test/contexts/ThemeContext.test.ts`

Steps:
- [ ] RED: Write failing test...
- [ ] Verify RED: `npm test` → FAIL...
- [ ] GREEN: Write minimal implementation...
- [ ] Verify GREEN: `npm test` → PASS...
- [ ] REFACTOR: Extract helper if needed...
- [ ] Commit...
```

---

### 3.3 TDD ↔ Apply（实现阶段）

**原方案问题**：把 TDD 的"always"规则套在所有 task 上。但 OpenSpec 处理的 task 类型多样：文档更新、配置变更、纯 CSS 调整、已有测试覆盖的简单修改——这些不适合或不需要完整 TDD 循环。

**修正融合方式：按 task 类型分类应用 TDD**

| Task 类型 | TDD 要求 | 原因 |
|-----------|----------|------|
| **新增功能/模块**（新建文件、新增逻辑） | **强制 TDD** | 无现有代码，test-first 确保正确性 |
| **修改现有逻辑**（改函数行为、加边界处理） | **强制 TDD** | 需要 regression test 防止破坏 |
| **行为保持重构**（提取函数、重命名、移动代码） | **Lite TDD** | 现有测试保持通过即证明安全；无需新写 RED test |
| **行为变更重构**（改算法、换数据结构） | **强制 TDD** | 行为可能变化，需要新测试保护 |
| **Bug 修复** | **强制 TDD** | 先写 failing test 复现 bug，再修复 |
| **文档/注释更新** | **跳过 TDD** | 无代码行为变化 |
| **配置文件变更** | **跳过 TDD** | 配置验证通过即足够 |
| **纯样式/CSS 调整** | **可选 TDD**（视觉回归测试如存在则使用） | 通常靠视觉验证 |
| **依赖升级** | **跳过 TDD** | 运行现有测试验证兼容性即可 |

**TDD 强度级别（由 AI 根据 task 类型自动选择）：**

| 级别 | 适用场景 | 行为 |
|------|----------|------|
| **Full TDD** | 新增/修改逻辑、行为变更重构、Bug 修复 | RED → Verify RED → GREEN → Verify GREEN → REFACTOR |
| **Lite TDD** | 简单修改、已有良好测试覆盖、行为保持重构 | 写 test → 确认 fail → 改代码 → 确认 pass（跳过 explicit refactor 步骤） |
| **Skip TDD** | 文档/配置/样式 | 直接修改，运行相关测试验证无破坏 |

**融合后 task 状态跟踪（以 Full TDD 为例）：**
```markdown
# Tasks

## 1. Theme Infrastructure
- [ ] 1.1 Create ThemeContext with light/dark state [TDD: Full]
  - [ ] RED: Write failing test
  - [ ] Verify RED: Confirm test fails correctly
  - [ ] GREEN: Write minimal implementation
  - [ ] Verify GREEN: Confirm test passes
  - [ ] REFACTOR: Clean up if needed

- [ ] 1.2 Update README with theme docs [TDD: Skip]
  - [ ] Direct edit: Add theme section to README
  - [ ] Verify: Preview markdown rendering
```

**融合后 `/opsx:apply` 行为（不同 TDD 级别）：**

```text
场景 A（Full TDD —— 新增逻辑）：
AI:  Working on 1.1: Create ThemeContext... [TDD: Full]
     [RED] Writing failing test...
     ✓ Test fails as expected: "ThemeContext is not defined"
     [GREEN] Writing minimal implementation...
     ✓ Test passes
     Task 1.1 complete! ✅

场景 B（Skip TDD —— 文档更新）：
AI:  Working on 1.2: Update README... [TDD: Skip]
     [Direct] Adding theme documentation...
     ✓ README updated
     Task 1.2 complete! ✅
```

---

### 3.4 Subagent-Driven Dev ↔ Apply Execution Model

**原方案问题**：每个 task 都派遣独立 subagent + 两阶段审查。对于简单 task（更新一行配置），subagent overhead 太大；对于紧密耦合的 tasks（改函数签名后改所有调用点），拆成独立 subagent 反而破坏上下文连续性。

**修正融合方式：按 task 复杂度选择执行模式**

| 执行模式 | 适用场景 | 机制 |
|----------|----------|------|
| **Inline（内联）** | 简单 task（单文件、<10 行变更） | 当前 AI 会话直接执行，无 subagent |
| **Batch Subagent（批量）** | 中等 task 组（3-5 个相关 task） | 一个 subagent 处理一批相关 tasks |
| **Per-Task Subagent（逐 task）** | 复杂 task（多文件协调、架构变更） | 每个 task 独立 subagent + 两阶段审查 |

**复杂度判断信号：**
- **Inline**：单文件修改、纯配置/文档、已有明确模式的重复操作
- **Batch**：同一组件内的多个 tasks（如"创建组件 + 样式 + 基础测试"）
- **Per-Task**：跨 domain 修改、需要架构判断、涉及安全/性能敏感代码

**审查机制也按复杂度分层：**

| 模式 | 审查机制 |
|------|----------|
| Inline | AI 自审（self-review）+ 用户可见 diff |
| Batch | Batch 完成后一次 Spec Review + Code Quality Review |
| Per-Task | 每个 task 后两阶段审查（Spec + Quality） |

**融合后执行流程（以 Batch 模式为例）：**
```text
Batch: Tasks 1.1 - 1.3 (Theme Infrastructure)
  │
  ├──→ Dispatch Batch Implementer Subagent
  │      └── 实现 Task 1.1 + 1.2 + 1.3
  │      └── 自审、测试、提交
  │
  ├──→ Dispatch Batch Spec Reviewer
  │      └── 确认整个 batch 符合 design.md
  │      └── ❌ 不符 → 修复 → 重新审查
  │      └── ✅ 通过
  │
  ├──→ Dispatch Batch Code Quality Reviewer
  │      └── 检查 batch 内代码质量
  │      └── ❌ 不通过 → 修复 → 重新审查
  │      └── ✅ 通过
  │
  └──→ Mark batch complete (3 tasks)
```

---

### 3.5 双层验证体系：Superpowers 测试验证 + OpenSpec 一致性审计

**核心问题：TDD 保证"局部正确"，但不保证"工程正确"**

TDD 的 RED→GREEN→REFACTOR 确保：**每个函数在给定输入下产生正确输出**。但 TDD 无法回答以下问题：

- 是否实现了 specs 中约定的**所有需求**？
- 是否有**遗漏的场景**未覆盖？
- 是否有**超出规范的多余实现**？
- 实现是否与 design.md 中的**架构决策一致**？
- 是否有**隐性行为变更**未在 delta specs 中声明？

**这就是一致性验证（OpenSpec 主导）的价值——它是 AI Coding 时代的关键质量闸门。**

**双层验证模型：**

| 层级 | 主导方 | 验证内容 | 解决的问题 |
|------|--------|----------|------------|
| **Layer 1：测试验证** | Superpowers:TDD | 每个函数/组件在测试下的行为正确性 | "局部正确"——代码运行结果是否符合预期 |
| **Layer 2：一致性审计** | OpenSpec:Verify | 实现与 specs、tasks、design 的语义一致性 | "工程正确"——是否满足所有既定规范与任务约定 |

**一致性审计的具体内容：**

| 审计维度 | 检查项 |
|----------|--------|
| **Spec 覆盖度** | specs 中的每条 Requirement 是否都有对应实现？ |
| **Scenario 完整性** | 每个 Scenario 的 Given/When/Then 是否都已在代码中体现？ |
| **Task 对齐度** | tasks.md 中的 checkbox 是否准确反映了实际完成状态？ |
| **Design 一致性** | 实现是否遵循 design.md 中的架构决策？ |
| **范围边界** | 是否存在超出 proposal scope 的多余实现？ |
| **隐式变更** | 是否修改了未在 delta specs 中声明的已有行为？ |

**分级提示，非强制阻塞：**

| 验证结果 | 对 archive 的影响 |
|----------|-------------------|
| **✅ Pass** | 直接 archive |
| **⚠️ Warning** | 提示风险，用户确认后可 archive |
| **❌ Critical** | 强烈建议修复，用户可强制 archive |

**融合后 `verify` 行为：**

```text
You: /opsx:verify

AI:  Running dual-layer verification...

     ╔═══════════════════════════════════════════════════════╗
     ║  Layer 1: Test Verification [Superpowers]             ║
     ╠═══════════════════════════════════════════════════════╣
     [Test Suite]    ✓ 12/12 tests pass
     [Coverage]      ✓ 85% line coverage
     ╚═══════════════════════════════════════════════════════╝

     ╔═══════════════════════════════════════════════════════╗
     ║  Layer 2: Consistency Audit [OpenSpec]                ║
     ╠═══════════════════════════════════════════════════════╣
     [Spec Coverage] ✓ All 6 requirements implemented
     [Scenarios]     ✓ 8/8 scenarios covered
                     ⚠ Scenario "Session timeout after inactivity"
                       implemented but no test found
     [Task Alignment]✓ All 8 tasks match implementation
     [Design Coherence] ✓ Architecture decisions reflected
                     ⚠ Design mentions "CSS variables" but
                       implementation uses Tailwind classes
     [Scope Boundary]✓ No scope creep detected
     [Implicit Changes] ✓ No unreported behavior changes
     ╚═══════════════════════════════════════════════════════╝

     SUMMARY
     ─────────────────────────────
     Test layer:    ✅ Pass
     Audit layer:   ⚠️ Warning (2)
     Ready to archive: Yes (with warnings)

     Recommendations:
     1. Add test for session timeout scenario
     2. Update design.md to reflect Tailwind usage, or refactor to CSS variables
```

**为什么一致性审计不能被 TDD 替代：**

| TDD 能回答 | TDD 不能回答 |
|------------|--------------|
| `calculateTotal([1,2,3])` 返回 `6` | 是否遗漏了 `calculateTotal([])` 的边界场景 |
| 新增函数行为正确 | 新增函数是否影响了已有函数的隐式契约 |
| 测试覆盖的代码路径正确 | 是否实现了 specs 中声明的全部需求 |
| 单元测试通过 | 组件集成后的行为是否与 specs 一致 |

> **关键洞察**：TDD 验证的是"代码是否按预期运行"，一致性审计验证的是"运行的代码是否满足工程约定"。没有后者，前面的 TDD 只能保证局部正确，而非工程正确。

---

### 3.6 Code Review ↔ Archive Gate

**原方案问题**：把 code review 作为 archive 的强制门。但个人项目、快速修复、文档变更不需要 formal review。强制 review 会降低小型变更的流转效率。

**修正融合方式：review 是推荐项，高风险/复杂变更才强制**

| 变更类型 | Review 要求 | 触发条件 |
|----------|-------------|----------|
| **简单**（文档/配置/单行修复） | **跳过 review** | 无 |
| **中等**（新组件/功能，<5 文件） | **AI 自审**（自动生成 review.md，无独立 reviewer） | 自动 |
| **复杂**（架构变更/多 domain/安全敏感） | **两阶段审查**（Spec Reviewer + Code Quality Reviewer） | AI 检测复杂度后提议 |

**review.md 的两种形式：**

```markdown
# 形式 A：AI 自审（中等变更，自动生成）
# Code Review: add-dark-mode

## Self-Review by Implementer
- [x] All tasks implemented per tasks.md
- [x] No console.log or debug code left
- [x] Error handling added where needed

## AI Quick Scan
- [x] No obvious anti-patterns
- [x] Tests cover happy path and edge cases

## Verdict: ✅ Ready for archive
```

```markdown
# 形式 B：两阶段审查（复杂变更，独立 reviewers）
# Code Review: add-dark-mode

## Spec Compliance Review
Reviewer: AI Spec Agent
- [x] All design decisions implemented
- [x] No scope creep
- Issues: None

## Code Quality Review
Reviewer: AI Quality Agent
- [x] No magic numbers
- [x] Error handling adequate
- [x] Naming conventions consistent
- [x] Edge cases covered
- Issues: Minor — Consider extracting theme constants

## Verdict: ✅ Approved for archive
```

---

### 3.7 Git Worktrees ↔ Parallel Changes

**融合方式**：将 Superpowers 的 `using-git-worktrees` 与 OpenSpec 的并行 changes 结合。

| OpenSpec | Superpowers | 融合后 |
|----------|-------------|--------|
| 支持多个并行 changes | 每个 feature 使用独立 worktree | 每个 change 自动创建独立 worktree |
| changes 文件夹隔离 | git worktree 提供代码隔离 | 双重隔离：文件夹 + git worktree |

**融合后行为**：
```text
You: /opsx:new add-dark-mode

AI:  Created change: add-dark-mode
     Created git worktree: ../openspec-worktrees/add-dark-mode
     Checked out branch: changes/add-dark-mode

You: /opsx:new fix-login-bug

AI:  Created change: fix-login-bug
     Created git worktree: ../openspec-worktrees/fix-login-bug
     Checked out branch: changes/fix-login-bug

You: /opsx:apply add-dark-mode  ← 在 worktree 中执行
You: /opsx:apply fix-login-bug  ← 在另一个 worktree 中执行
```

### 3.7.1 并行 Change 的冲突解决

当多个并行 change 修改同一文件或同一 spec 时，需要明确的冲突处理机制。

**冲突检测时机：**

| 检测点 | 检测内容 | 行为 |
|--------|----------|------|
| **Apply 阶段** | 扫描所有活跃 change，检测文件修改交集 | 仅提示，不阻塞——worktree 已隔离，代码级冲突延迟到 archive 时处理 |
| **Archive 阶段** | 合并 delta specs 前检测语义冲突 | 自动检测 spec 交集，有冲突时进入解决流程 |
| **Archive 后** | 未归档的活跃 change 检测到其依赖的 spec 已变更 | 提示需要 rebase worktree |
| **Verify → Archive 之间**（时间窗竞态） | 本 change verify 通过后，是否有其他 change 在此期间 archive 并修改了同一 spec 文件 | archive 阶段合并 delta specs 前做**增量 re-verify**：仅重新扫描被其他 change 在此窗口内修改过的 spec 维度；若结果降级则提示用户 |

**冲突类型与解决策略：**

| 冲突类型 | 解决策略 | 示例 |
|----------|----------|------|
| **无交集**（两个 change 修改不同文件） | 自动并行，无需处理 | Change A 改 auth，Change B 改 payment |
| **文件交集但行级无冲突**（改同一文件不同区域） | 自动合并 | 两个 change 在同一个 spec.md 中添加不同的 requirement |
| **Spec 语义冲突**（两个 change 修改同一 requirement） | 提示用户，手动协调 | Change A 改 "密码最少6位" → "最少8位"，Change B 改 "密码最少6位" → "最少12位" |
| **代码语义冲突**（两个 change 改同一函数） | 先 archive 的成功，后 archive 的提示 rebase | Change A 重构 `login()`，Change B 在 `login()` 加新参数 |
| **Requirement ID 碰撞**（两个 change 使用相同的 requirement ID 但定义不同） | 提示用户，要求 rename 其中一个 | Change A 添加 `REQ-Auth-1: Password 8+ chars`，Change B 添加 `REQ-Auth-1: Password must support special chars`——行级无冲突，但同一 ID 下有不同语义，自动合并不安全 |

**Archive 时冲突解决流程：**

```text
You: /opsx:archive add-oauth2-login

AI:  Checking for conflicts with active changes...
     发现 1 个潜在冲突:

     ⚠ Change "fix-session-bug" 也修改了 openspec/specs/auth/spec.md
       两者的修改区域不同（行级无冲突），将自动合并。

     继续 archive？[Y/n]
```

**Worktree rebase 提示：**

```text
AI:  add-oauth2-login 已 archive。

     注意：活跃 change "fix-session-bug" 的基础 specs 已变更。
     建议在继续 apply 前运行:
       cd ../openspec-worktrees/fix-session-bug
       git rebase changes/add-oauth2-login
```

### 3.7.2 Change 依赖关系

当一个复杂功能被拆成多个有顺序依赖的 change 时，需要声明依赖关系。

**在 `.openspec.yaml` 中声明依赖：**

```yaml
# openspec/changes/add-google-provider/.openspec.yaml
schema: superpowers
depends_on:
  - add-oauth2-model    # 必须先完成 OAuth 基础模型
```

**依赖感知行为：**

| 阶段 | 行为 |
|------|------|
| **Apply** | 检查依赖 change 是否已 archive，未完成则提示并阻塞 |
| **Verify** | 交叉验证：依赖 change 的 specs 是否与本 change 的实现一致 |
| **Archive** | 检查是否有其他活跃 change 依赖本 change，提示影响 |

```text
You: /opsx:apply add-google-provider

AI:  ⚠ Change "add-google-provider" 依赖 "add-oauth2-model"
     但 "add-oauth2-model" 尚未 archive。

     请先完成依赖 change，或通过 /opsx:apply --skip-dep-check 强制继续。
```

**依赖图可视化（可选）：**

```text
add-oauth2-model
    ├── add-google-provider
    └── add-github-provider
```

**循环依赖检测：**

在 propose 阶段和 `.openspec.yaml` 写入时，自动对依赖图做环路检测（DFS）。发现循环立即报错：

```text
You: /opsx:propose add-session-refresh

AI:  ❌ 依赖错误：检测到循环依赖
     add-session-refresh → add-oauth2-model → add-session-refresh
     
     请修改 depends_on 字段解除循环。
```

| 检测时机 | 行为 |
|----------|------|
| **Propose 阶段** | 写入 `.openspec.yaml` 前校验依赖图，存在环路则拒绝创建 |
| **Apply 阶段** | 二次校验（防止 propose 后手动编辑引入环路） |
| **Config 变更** | 修改 `depends_on` 后自动触发校验 |

---

### 3.8 Code Simplification ↔ Iterative Refinement

**融合方式**：将 Superpowers 的 `simplify` skill 嵌入 OpenSpec 的 fluid iteration 中。

| OpenSpec | Superpowers | 融合后 |
|----------|-------------|--------|
| 实施中可随时修正 artifacts | 代码修改后自动简化优化 | apply 完成后自动触发 simplify |
| fluid 允许回溯 | simplify 保持功能不变 | 每次 task 完成后自动 simplify |

**融合后行为**：
```text
AI:  Task 2.3 complete! ✅

     [Simplify] Checking for optimization opportunities...
     - Removed nested ternary in ThemeToggle.tsx
     - Extracted duplicate logic to helper function
     - Improved variable naming for clarity

     Simplified 3 files. All tests still pass. ✅
```

**Simplify 撤销机制：**

每次 simplify 操作形成独立的 git commit（`simplify(task-N.M)`），用户可随时撤销：

```text
AI:  [Simplify] 3 files simplified. Tests pass.
     Commit: a1b2c3d simplify(task-2.3)

     如果这些改动不是你想要的，运行:
       git revert a1b2c3d
```

同时 AI 在 simplify 后主动展示变更摘要，并在用户反馈不满时自动 revert：

```text
You: 这个提取不太对，undo 刚才的 simplify

AI:  已执行 git revert a1b2c3d，恢复 simplify 前的代码。✅
     继续下一个 task...
```

---

## 4. 融合后 Schema 设计

为支持 Superpowers 融合，创建新的 `superpowers` Schema：

```yaml
# openspec/schemas/superpowers/schema.yaml
name: superpowers
version: 1
description: OpenSpec with Superpowers engineering disciplines

artifacts:
  - id: proposal
    generates: proposal.md
    requires: []
    instruction: |
      Create a proposal following Superpowers:brainstorming principles.
      Include: intent, scope, approach, and applicable skills list.

  - id: exploration
    generates: exploration.md
    requires: []
    optional: true
    instruction: |
      Optional artifact for recording exploration findings.
      Only generated when brainstorming was triggered during explore.
      Flexible template: key insights, options considered, recommendation, open questions.
      If absent, propose falls back to conversation context.

  - id: specs
    generates: specs/**/*.md
    requires: [proposal]
    instruction: |
      Create delta specs with RFC 2119 keywords.
      Include testable scenarios for TDD.

  - id: design
    generates: design.md
    requires: [proposal, specs]
    instruction: |
      Create technical design AND implementation plan.
      Plan granularity auto-detected by AI:
      - Simple changes: no Plan section needed
      - Medium changes: Compact Plan (file list + task mapping)
      - Complex changes: Full Plan (writing-plans format with RED→GREEN steps)

  - id: tasks
    generates: tasks.md
    requires: [design]
    instruction: |
      Create implementation checklist.
      Each task annotated with TDD level:
      - [TDD: Full] for new/modified logic, behavior-changing refactoring, bug fixes
      - [TDD: Lite] for simple changes with existing test coverage, behavior-preserving refactoring
      - [TDD: Skip] for docs/config/style changes

  - id: review
    generates: review.md
    requires: [tasks]
    optional: true
    instruction: |
      Code review record.
      - Simple changes: AI self-review only
      - Complex changes: two-stage review (spec + quality)
      - Optional for trivial changes

apply:
  requires: [tasks]
  tracks: tasks.md
  instruction: |
    Execute tasks with adaptive discipline:
    - Task type determines TDD level (Full / Lite / Skip)
    - Complexity determines execution mode:
      * Inline: simple tasks (single file, <10 lines)
      * Batch subagent: related task groups (3-5 tasks)
      * Per-task subagent: complex tasks (multi-file, architecture)
    - Simplify auto-applied after each task

verify:
  requires: [tasks]
  instruction: |
    Run verification across three dimensions:
    - Completeness: tasks done, requirements implemented
    - Correctness: matches spec intent
    - Coherence: design reflected in code
    Result affects archive prompt level, not a hard gate:
    - Pass: direct archive
    - Warning: prompt user, allow override
    - Critical: strongly recommend fix, user can force

archive:
  requires: [tasks]
  instruction: |
    Archive the change. Worktree cleanup only if worktree mode enabled.
    Review record (review.md) included if generated.
```

---

## 5. 融合后 Slash Commands 映射（修正版）

| OpenSpec Command | Superpowers Skill | 融合后 Command | 行为 |
|------------------|-------------------|----------------|------|
| `/opsx:explore` | `brainstorming` | `/opsx:explore` | 自由探索 + **可选** brainstorming 子流程 + exploration.md 软依赖 |
| `/opsx:propose` | — | `/opsx:propose` | 创建 change + artifacts（自动读取 exploration.md 若存在） |
| `/opsx:ff`（propose 的子步骤） | `writing-plans` | `/opsx:ff` | 快捷生成 design + **自适应粒度** plan（Simple/Medium/Complex），等价于 propose 完成后单独执行 design 与 plan 生成 |
| `/opsx:apply` | `TDD` + `subagent-driven-dev` | `/opsx:apply` | 按 task **类型和复杂度**选择 TDD 级别 + 执行模式 |
| `/opsx:verify` | `verification-before-completion` | `/opsx:verify` | **分级提示**（Pass/Warning/Critical），非强制阻塞 |
| `/opsx:archive` | `finishing-a-dev-branch` | `/opsx:archive` | 归档 + 合并 specs + 清理 worktree |
| *(新增)* | `simplify` | `/opsx:simplify` | 简化最近修改的代码 |
| *(新增)* | `requesting-code-review` | `/opsx:review` | 触发审查（简单=自审，复杂=两阶段） |
| *(新增)* | — | `/opsx:abort <change>` | 放弃 change，清理 worktree，不合并 specs |
| *(新增)* | — | `/opsx:rewind <change>` | 回退到 change 的某个 task，保留已完成 task 的代码 |

### 5.1 回滚与中止流程

当 change 需要中途放弃或回退时，提供清晰的中止和回滚路径。

**中止进行中的 Change：**

```text
You: /opsx:abort add-oauth2-login

AI:  ⚠ 确认中止 change "add-oauth2-login"？
     已完成进度: 3/6 tasks

     中止后：
     - 已实现的代码备份至 git branch: aborted/add-oauth2-login
     - Delta specs 不会被合并
     - Worktree 将被清理
     - Artifacts 移动至 openspec/changes/aborted/

     继续？[Y/n]

You: Y

AI:  Change "add-oauth2-login" 已中止。
     ✓ Git branch 备份为 refs/heads/aborted/add-oauth2-login（不丢失已实现的代码）
     ✓ Worktree 已移除
     ✓ Change 文件夹（artifacts）移动至 openspec/changes/aborted/

     恢复方法：git checkout aborted/add-oauth2-login 找回代码
             从 aborted/ 目录找回 artifacts
```

**Abort 数据安全保证：**

abort 操作分两步确保代码和 artifacts 都不丢失：

| 步骤 | 操作 | 效果 |
|------|------|------|
| 1 | Push worktree branch → `refs/heads/aborted/<change-name>` | 已实现的代码以 git 历史完整保留 |
| 2 | Move change folder → `openspec/changes/aborted/` | OpenSpec artifacts 保留 |

> 只有用户显式执行 `git branch -D aborted/<change-name>` 或删除 `aborted/` 目录才会永久清除数据。OpenSpec 自身不做不可逆删除。

**部分回滚（回到某个 task）：**

```text
You: /opsx:rewind add-oauth2-login --to 1.4

AI:  ⚠ 将回退到 Task 1.4。
     以下 task 的修改将被撤销: 1.5, 1.6

     撤销方式: git revert（保留变更历史）
     继续？[Y/n]

You: Y

AI:  ✓ 已回退到 Task 1.4。
     Task 1.5 (Add login button) 和 Task 1.6 (Update docs) 已撤销。
     ✓ tasks.md 已更新：Task 1.5, 1.6 的 checkbox 重置为 [ ]
     从 Task 1.4 继续 /opsx:apply。
```

**Archive 后撤销：**

```text
# 场景：archive 后发现严重问题，需要回滚已合并的 delta specs

You: /opsx:unarchive add-oauth2-login

AI:  ⚠ 将撤销 "add-oauth2-login" 的 archive。
     影响：
     - 从 openspec/specs/auth/spec.md 中移除合并的 delta specs
     - Change 移动回 openspec/changes/（活跃状态）
     - 代码不回滚（需手动 git revert）

     继续？[Y/n]
```

**回滚安全性矩阵：**

| 操作 | 代码影响 | Spec 影响 | 可恢复性 |
|------|----------|-----------|----------|
| `/opsx:abort` | Git branch 备份为 `refs/heads/aborted/<change>`；artifacts 移动至 `aborted/` | 不合并，不修改主 specs | 可恢复（`git checkout aborted/<change>` + artifacts 从 `aborted/` 找回） |
| `/opsx:rewind --to N` | git revert 撤销部分 commit；tasks.md checkbox 自动重置 | 不修改 specs | 可恢复（git revert the revert） |
| `/opsx:unarchive` | 不自动回滚代码 | 从主 specs 中移除 delta | 可恢复（重新 archive） |
| `git revert`（手动） | 手动回滚代码 | 不影响 specs（已有 version） | 标准 git 恢复 |

> **设计原则**：所有中止和回滚操作都是**非破坏性的**——代码通过 git branch 备份或 git revert 保留完整历史，artifacts 保留在 `aborted/` 目录。OpenSpec 自身不做不可逆删除。

---

## 6. 融合后目录结构

```text
openspec/
├── config.yaml
│   └── [可配置融合强度: core | enhanced | strict]
├── schemas/
│   └── superpowers/
│       ├── schema.yaml
│       └── templates/
│           ├── proposal.md
│           ├── exploration.md      # ← 可选，仅复杂探索时生成
│           ├── specs.md
│           ├── design.md
│           ├── tasks.md
│           └── review.md           # ← 可选，简单变更可跳过
├── specs/
│   └── <domain>/
│       └── spec.md
└── changes/
    ├── <change-name>/
    │   ├── proposal.md
    │   ├── exploration.md          # ← 可选 artifact
    │   ├── design.md
    │   │   └── [Plan 章节: 可选，按复杂度自适应]
    │   ├── tasks.md
    │   │   └── [TDD 级别标注: Full / Lite / Skip]
    │   ├── review.md               # ← 可选 artifact
    │   ├── .openspec.yaml
    │   └── specs/
    │       └── <domain>/
    │           └── spec.md
    ├── archive/
    │   └── <date>-<change-name>/   # ← 已归档的 change
    └── aborted/
        └── <change-name>/          # ← 已中止的 change（代码保留，可恢复）
```

### 融合强度配置（`config.yaml`）

```yaml
schema: superpowers

# 融合强度控制
discipline:
  level: enhanced        # core | enhanced | strict
  # core: 最小侵入，仅基本 TDD + 可选 review
  # enhanced: 自适应 discipline（推荐默认值）
  # strict: 全量 Superpowers 纪律（适合高风险项目）

  tdd:
    default: adaptive    # adaptive | always | never
    # adaptive: 按 task 类型自动选择 Full/Lite/Skip
    # always: 所有 task 强制 Full TDD
    # never: 跳过 TDD，直接实现

  subagent:
    mode: adaptive       # adaptive | always | never
    # adaptive: 按复杂度选择 Inline/Batch/Per-Task
    # always: 每个 task 独立 subagent
    # never: 全部内联执行

  worktree:
    enabled: true        # true | false

  # 探索阶段配置
  exploration:
    search_history: false   # archive 后是否索引历史 exploration.md

context: |
  ...
```

**三级 discipline 的行为差异（详细版）：**

| 维度 | core（最小侵入） | enhanced（自适应，推荐） | strict（全量纪律） |
|------|------------------|-------------------------|-------------------|
| **TDD 策略** | `tdd.default: never`，仅新增逻辑建议写测试 | `tdd.default: adaptive`，AI 按 task 类型自动选 Full/Lite/Skip | `tdd.default: always`，所有 task 强制 Full TDD |
| **Subagent** | `subagent.mode: never`，全部 Inline 执行 | `subagent.mode: adaptive`，按复杂度选 Inline/Batch/Per-Task | `subagent.mode: always`，每个 task 独立 subagent + 两阶段审查 |
| **Verify** | 仅 Layer 1（测试验证），跳过一致性审计 | 双层验证，Warning 级提示，用户可跳过 | 双层验证，Warning 升级为 Error 且要求确认才能 archive |
| **Review** | 跳过，不生成 review.md | 中等+变更自动 AI 自审；复杂变更两阶段审查 | 所有变更强制两阶段审查，不通过无法 archive |
| **Simplify** | 关闭，仅提示可手动执行 | 每次 task 完成后自动执行 | 每次 task 完成后自动执行 + 需用户确认才继续 |
| **Worktree** | `enabled: false`，仅文件夹隔离 | `enabled: true`，失败时优雅降级 | `enabled: true`，失败时报错停止 |
| **Exploration** | 自由探索，不生成 exploration.md | 复杂探索可选生成 exploration.md | 所有探索必须生成 exploration.md |
| **适用场景** | 个人项目、原型、实验性代码 | **大多数生产项目（推荐默认）** | 高风险项目（安全、合规、金融、基础设施） |

> **设计原则**：`enhanced` 是唯一推荐的默认值。`core` 和 `strict` 存在的意义是提供"退路"和"上限"——用户知道最简能简到什么程度，最严能严到什么程度。这降低了选择焦虑。

---

## 7. 融合价值总结

### 对 OpenSpec 的增强

| 方面 | 增强效果 |
|------|----------|
| **执行纪律** | "disciplined fluid"——自适应 TDD（Full/Lite/Skip），按 task 类型自动选择 |
| **质量保证** | 双层验证体系：测试验证 + 一致性审计，分级提示非强制阻塞 |
| **可审计性** | 新增 `exploration.md` 和 `review.md`，完整记录决策和审查过程 |
| **工程成熟度** | 从规约对齐延伸到工程实践对齐 |

### 对 Superpowers 的增强

| 方面 | 增强效果 |
|------|----------|
| **上下文管理** | OpenSpec 的 specs/changes 结构为 Superpowers 提供天然的上下文边界 |
| **多工具兼容** | OpenSpec 的 25+ AI 工具集成让 Superpowers 的 skills 覆盖更多平台 |
| **归档与演化** | archive 机制将 Superpowers 的 plan/execution 结果沉淀为可演化的 specs |
| **并行工作** | changes 文件夹 + git worktree 天然支持 Superpowers 的并行 subagent 执行 |

### 融合后的核心闭环（修正版）

```text
Explore  [分层融合]              → 自由探索 + 可选 brainstorming 子流程
   ↓                                                                exploration.md [软依赖]
Propose  [OpenSpec]              → 创建 change + artifacts（自动消费 exploration.md）
   ↓
Design   [自适应 Plan]           → 技术方案 + 按复杂度自适应的 Implementation Plan
   ↓                                                                Simple | Compact | Full
Apply    [自适应 Discipline]     → 按 task 类型选择 TDD 级别 + 按复杂度选择执行模式
   │                                                                Full TDD | Lite TDD | Skip
   │                                                                Inline | Batch | Per-Task Subagent
   ├────────────────────────────────→ /opsx:abort  →  change → aborted/（可恢复）
   ↓
Verify   [双层验证]              → 测试验证 [Superpowers] + 一致性审计 [OpenSpec]
   │                                                                局部正确 → 工程正确
   ├────────────────────────────────→ /opsx:rewind  →  回到指定 task 继续 apply
   ↓
Review   [自适应审查]            → 简单=自审 / 复杂=两阶段审查 / 可跳过
   ↓
Archive  [finishing-branch]      → 合并 specs + 清理 worktree
   │
   ├────────────────────────────────→ /opsx:unarchive → delta specs 回退，change 回到活跃状态
   ↓
Next Change ←────────────────────→ 基于更新的 specs 继续
```

**Verify 双层验证详解——从"局部正确"到"工程正确"的关键跃迁：**

```text
┌─────────────────────────────────────────────────────────────┐
│                      Verify 双层验证                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: 测试验证 [Superpowers:TDD]                        │
│  ─────────────────────────────────────                      │
│  问题："这个函数在给定输入下输出是否正确？"                  │
│  方法：RED → GREEN → REFACTOR                               │
│  产出：所有测试通过 ✅                                       │
│                                                             │
│  局限：只能证明"已测代码运行正确"                           │
│        无法发现遗漏需求、隐式变更、范围蔓延                  │
│                                                             │
│                          ↓                                  │
│                    【关键跃迁】                              │
│                          ↓                                  │
│                                                             │
│  Layer 2: 一致性审计 [OpenSpec:Verify]                      │
│  ─────────────────────────────────────                      │
│  问题："实现是否满足所有既定规范与任务约定？"                │
│  方法：对照 specs/tasks/design 逐项核查                      │
│  产出：Spec 覆盖度 / Scenario 完整性 / Design 一致性         │
│                                                             │
│  价值：发现 TDD 无法发现的工程语义偏差                       │
│        • 遗漏的需求场景                                     │
│        • 超出规范的多余实现                                 │
│        • 隐性行为变更                                       │
│        • 架构决策偏离                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

> **核心洞察**：没有 Layer 2，Layer 1 只能保证"代码按预期运行"；有了 Layer 2，才能确保"运行的代码满足工程约定"。这是从**局部正确**到**工程正确**的跃迁，是 AI Coding 时代不可替代的质量闸门。

这个修正版融合方案的核心改进：

1. **尊重 OpenSpec 的 fluid 本质**：所有 Superpowers 的 discipline 都是使能器（enabler），不是门（gate）
2. **按需增强而非强制替换**：简单变更走轻量路径，复杂变更才启用 full discipline
3. **AI 提议，用户决策**：AI 识别何时需要 discipline，但由用户决定是否启用
4. **可配置**：通过 `config.yaml` 的 `discipline.level` 控制融合强度（core / enhanced / strict），三级行为差异明确
5. **双层验证体系**：TDD 保证局部正确 + OpenSpec 一致性审计保证工程正确
6. **保持可审计性**：即使轻量路径，关键决策和审查仍有记录（exploration.md、review.md 可选生成）
7. **完整的变更生命周期**：正向流程（propose → apply → archive）+ 逆向操作（abort / rewind / unarchive），所有操作非破坏性
8. **并行安全**：change 依赖声明（`depends_on`）+ 冲突检测与解决（Section 3.7.1），worktree 双重隔离
9. **可度量**：6 项融合质量指标自动采集，从"感觉好用"到"数据证明好用"
10. **团队协作预留**：OWNERS 机制、Human Review 集成、依赖链通知（V2 规划）

最终形成一套**有纪律但不僵化**的 AI 辅助开发工作流。

### 7.1 融合成功度量指标

判断融合方案是否实际有效的可量化指标：

| 指标 | 定义 | 目标值 | 测量方式 |
|------|------|--------|----------|
| **Spec 覆盖率** | specs 中每条 requirement 在实现中的覆盖率 | ≥ 95% | `/opsx:verify` Layer 2 自动统计 |
| **变更流转效率** | 从 propose 到 archive 的平均轮次/时间 | 简单变更 ≤ 3 轮，复杂变更 ≤ 8 轮 | 通过 change 文件夹的 `.openspec.yaml` 中的时间戳计算 |
| **缺陷逃逸率** | archive 后发现的 bug 数量（特别是 Layer 2 应捕获但未捕获的） | 0 | 后续 change 中标记为 bug fix 且与近期 archive 关联的数量 |
| **过度工程化占比** | 简单变更走了复杂流程的比例 | 0% | AI 判断为"简单"但走了 Full TDD + Per-Task subagent 的变更占比 |
| **回滚率** | archive 后需要回滚的 change 占比 | ≤ 5% | 使用了 abort/rewind 或被 revert 的 change |
| **用户介入次数** | 用户在 apply 过程中需要手动 override 的次数 | 简单变更 0，复杂变更 ≤ 2 | 计数用户显式的 override 指令 |

> 这些指标在 V1 中通过 AI 在 verify 和 archive 阶段自动采集，不增加用户额外操作。V2 可提供 `openspec metrics` 仪表板。

---

## 8. 风险与挑战

### 8.1 双层验证的额外耗时

| 问题 | 影响 | 缓解措施 |
|------|------|----------|
| Layer 2 一致性审计需要 AI 扫描 codebase 并逐条比对 specs，对大项目可能耗时 | 增加 verify 阶段等待时间 | 一致性审计可**增量执行**——仅扫描变更涉及的文件，而非整个代码库 |
| 复杂 change 的两阶段审查 + subagent 循环可能产生大量 token 消耗 | 成本上升 | Per-Task Subagent 仅在 strict 模式下强制启用，enhanced 模式下用 Batch 降低开销 |

### 8.2 Worktree 的平台兼容性

| 问题 | 影响 | 缓解措施 |
|------|------|----------|
| Windows 上某些 git 版本对 worktree 支持不佳 | `openspec init` 或 `opsx:new` 可能失败 | worktree 默认启用但**优雅降级**——失败时自动回退到 folder-only 模式并提示用户 |
| 每个 worktree 占用额外磁盘空间（完整 checkout） | 磁盘空间压力 | 使用 `git worktree` 的 `--no-checkout` 或 sparse-checkout 减少空间占用 |

### 8.3 配置复杂度增加

| 问题 | 影响 | 缓解措施 |
|------|------|----------|
| `discipline.level` + `tdd.default` + `subagent.mode` + `worktree.enabled` 等多层配置可能让新手困惑 | 学习曲线变陡 | 提供**预设模板**（`core` / `enhanced` / `strict` 一键切换），隐藏底层配置；`enhanced` 作为唯一推荐默认值 |
| AI 自适应判断可能出错（如把复杂变更判断为简单） | discipline 不足或过度 | 允许用户在 `/opsx:apply` 时临时 override TDD 级别或执行模式 |

### 8.4 自动化简化（Simplify）的边界风险

| 问题 | 影响 | 缓解措施 |
|------|------|----------|
| simplify 自动修改代码后，可能破坏未在测试覆盖的隐式行为 | 引入难以发现的 regression | simplify 仅限**当前 session 修改的文件**；修改前运行全量测试，失败则回滚 |
| 用户可能不理解 simplify 做了什么改动 | 信任危机 | 每次 simplify 后展示**简洁的变更摘要**（如"提取了3处重复逻辑"），并提供 diff 查看选项；每次 simplify 形成独立 commit，支持 `git revert` 一键撤销 |

### 8.5 Config 热变更导致 Change 内部行为不一致

| 问题 | 影响 | 缓解措施 |
|------|------|----------|
| 用户在 apply 过程中修改 `config.yaml`（如 `enhanced` → `strict`），同一 change 的前半部分 task 按旧配置执行，后半部分按新配置执行 | 同一 change 内部 discipline 不一致，可能前半部分 TDD: Lite、后半部分 TDD: Full | apply 开始时**快照 config**，整个 change 使用一致的 discipline 配置；若检测到 apply 中途 config 变更，提示用户并询问是否切换 |

---

## 9. 团队协作模型

OpenSpec + Superpowers 融合方案在团队环境下的运行方式。

### 9.1 角色与职责

| 角色 | 职责 | 对应 OpenSpec 操作 |
|------|------|-------------------|
| **Change Owner** | 创建、推进 change 从 explore 到 archive | `/opsx:explore /opsx:propose /opsx:apply` |
| **Spec Reviewer**（可选） | 审查 spec 变更的语义正确性 | `/opsx:review` 中的 Spec Review |
| **Code Reviewer**（可选） | 审查实现代码的质量 | `/opsx:review` 中的 Code Quality Review |
| **Spec Maintainer** | 管理 `openspec/specs/` 的合并与冲突解决 | archive 时的 spec 合并决策 |

> **当前版本聚焦单人场景**，AI 自动承担 Spec Reviewer 和 Code Reviewer 角色。团队协作模式为可选增强——当项目配置了 human reviewer 时，AI 审查变为预审环节，最终由 human 确认。

### 9.2 Spec 归属与变更协调

**Spec 文件归属：**

```yaml
# openspec/specs/auth/OWNERS.yaml
owners:
  - "@team-auth"
reviewers:
  - "@team-platform"
```

当 change 的 delta specs 涉及有 OWNERS 的 spec 文件时，archive 前自动通知对应团队。

**变更协调机制：**

| 场景 | 机制 |
|------|------|
| 多人同时 propose change | 无冲突：changes 文件夹按名称隔离；有交集：archive 时按 Section 3.7.1 的冲突解决流程处理 |
| Change 依赖链跨 owner | `depends_on` 字段感知；被依赖 change archive 后自动通知下游 |
| Spec 合并冲突 | archive 阶段自动检测；trivial 自动合并，semantic 提示 owner 手动协调 |

### 9.3 Human Review 集成（可选）

当 `config.yaml` 中配置了 human reviewer 时，AI 审查变为预审：

```yaml
# openspec/config.yaml
review:
  ai_pre_review: true       # AI 先预审，通过后进入 human review
  human_required_for:
    - security              # 安全敏感变更强制 human review
    - schema_change         # 数据库 schema 变更强制 human review
  human_reviewers:
    auth: ["@team-auth"]
```

**两阶段审查 + Human Gate（strict 模式可选）：**

```text
You: /opsx:review add-oauth2-login

AI:  [AI Spec Review] ✅
     [AI Code Quality Review] ✅

     Human review required: @team-auth
     已通过 GitHub PR 请求审查 → #1234
```

### 9.4 当前版本定位

- **V1（当前）**：单人开发 + AI 自动审查。Section 9.1-9.3 为预留设计，不在 V1 实现范围内。
- **V2（规划）**：多人协作 + Human Review 集成 + OWNERS 机制。

---

## 10. 向后兼容性

### 10.1 现有 core profile 用户迁移路径

```text
当前用户状态              迁移动作                    迁移后状态
─────────────────────────────────────────────────────────────────────────────
openspec init (core)      openspec config profile     可选切换到 enhanced
                          → 选择 enhanced
                          → openspec update

/opsx:propose → apply     无变化                      行为完全一致
→ archive

无 exploration.md         首次复杂 explore 时         可选 artifact
                          AI 提议生成 exploration.md

无 review.md              archive 前自动自审          简单变更跳过
                                                    复杂变更生成 review.md
```

### 10.2 平滑升级策略

| 升级方式 | 命令 | 效果 |
|----------|------|------|
| **保持现状** | 不执行任何操作 | 继续使用 core profile，融合功能不启用 |
| **一键增强** | `openspec config profile enhanced && openspec update` | 启用所有自适应融合功能，保持现有 workflow 不变 |
| **严格模式** | `openspec config profile strict && openspec update` | 全量启用 Superpowers 纪律，适合高风险项目 |
| **细粒度控制** | 编辑 `openspec/config.yaml` 的 `discipline` 节 | 自定义每个 discipline 的启用策略 |

### 10.3 现有 changes 兼容性

- 已创建的 changes（如 `openspec/changes/add-dark-mode/`）**无需修改**，可继续使用 `/opsx:apply`
- 现有 changes 的 tasks.md 中**无 TDD 级别标注**时，AI 按 task 内容自动推断（向后兼容）
- 归档流程不变，archive 时自动应用新的 verify 双层验证

---

## 11. 端到端用户案例：新增 OAuth2 认证系统

**背景**：一个已有用户系统的 Web 应用，需要新增 OAuth2 登录支持。

### Step 1: Explore（复杂探索，触发 brainstorming）

```text
You: /opsx:explore "如何为现有用户系统添加 OAuth2 登录？"

AI:  [分析现有 auth 代码]
     当前系统使用密码哈希 + session cookie...
     这个话题涉及多个可行方向，要不要我系统性地列出几种方案对比一下？

You: 好

AI:  [执行 brainstorming 子流程]
     方案 A: Passport.js（成熟，多 provider 支持）
     方案 B: Auth0 SDK（托管，减少自建）
     方案 C: 自建 OAuth2 流程（灵活，工作量大）
     推荐：A（项目已有 Node.js 后端）

     已生成 exploration.md。运行 /opsx:propose add-oauth2-login 开始创建变更。
```

### Step 2: Propose + FF（创建 change，生成所有 artifacts）

```text
You: /opsx:propose add-oauth2-login

AI:  创建 change: add-oauth2-login
     [读取 exploration.md 作为上下文]

     ✓ proposal.md    — 新增 OAuth2 登录，使用 Passport.js
     ✓ specs/auth/spec.md
       ADDED: OAuth2 Login Requirement
       ADDED: Session Bridging Requirement
     ✓ design.md [Full Plan]
       — 技术方案 + 6 个 task 的详细实施计划
     ✓ tasks.md
       1.1 Install passport-google-oauth20 [TDD: Skip]
       1.2 Create OAuthUser model [TDD: Full]
       1.3 Create /auth/google callback [TDD: Full]
       1.4 Bridge OAuth users to existing session [TDD: Full]
       1.5 Add login button to frontend [TDD: Lite]
       1.6 Update auth spec docs [TDD: Skip]

     变更已创建，运行 /opsx:apply 开始实现。
```

### Step 3: Apply（自适应 discipline 执行）

```text
You: /opsx:apply

AI:  Batch 1: Tasks 1.1 - 1.3 (OAuth Infrastructure) [Batch Subagent]
     1.1 Install passport-google-oauth20 [TDD: Skip]
        → Direct: npm install + config update
     1.2 Create OAuthUser model [TDD: Full]
        → RED: test OAuthUser.create() with Google profile
        → GREEN: implement OAuthUser model
        → REFACTOR: extract common fields to base model
     1.3 Create /auth/google callback [TDD: Full]
        → RED: test callback handler
        → GREEN: implement handler
        → Verify: all tests pass ✅
     [Batch Spec Review + Code Quality Review] ✅

     Batch 2: Tasks 1.4 - 1.5 (Integration + UI) [Inline]
     1.4 Bridge OAuth users [TDD: Full]
        → RED → GREEN → REFACTOR
     1.5 Add login button [TDD: Lite]
        → 写组件测试 → 实现按钮 → 确认通过
     [AI Self-Review] ✅

     Task 1.6 Update docs [TDD: Skip]
        → Direct edit

     [Simplify] Auto-applied:
     - Extracted duplicate auth middleware setup
     - Renamed `handleGoogleCallback` → `handleOAuthCallback`
```

### Step 4: Verify（双层验证）

```text
You: /opsx:verify

AI:  ╔ Layer 1: Test Verification ═══════════════════╗
     [Test Suite]    ✓ 18/18 tests pass
     [Coverage]      ✓ 82% line coverage
     ╚═══════════════════════════════════════════════╝

     ╔ Layer 2: Consistency Audit ═══════════════════╗
     [Spec Coverage] ✓ 2 requirements implemented
     [Scenarios]     ✓ 4/4 scenarios covered
     [Task Alignment]✓ 6/6 tasks match implementation
     [Design Coherence] ✓ Passport.js used as designed
     [Scope Boundary]✓ No scope creep
     [Implicit Changes] ⚠ Modified session handling
                       (not in delta specs — added now)
     ╚═══════════════════════════════════════════════╝

     Result: ✅ Pass (1 auto-corrected)
```

### Step 5: Review + Archive

```text
You: /opsx:archive

AI:  [Review: 复杂变更 → 两阶段审查]
     Spec Reviewer:    ✅ 所有 design 决策已实现
     Quality Reviewer: ✅ 无 magic numbers，错误处理完善
                       Minor: OAuth client ID 应移入环境变量

     Archiving add-oauth2-login...
     ✓ Delta specs merged into openspec/specs/auth/spec.md
     ✓ Moved to openspec/changes/archive/2025-01-24-add-oauth2-login/
     ✓ Worktree cleaned up

     下一个变更可基于更新后的 specs 继续构建。
```
