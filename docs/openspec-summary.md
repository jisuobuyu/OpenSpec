# OpenSpec 全面总结

## 1. 简介与定位

OpenSpec 是一个 **AI 原生（AI-native）的规约驱动开发框架**，它为人类开发者与 AI 编程助手之间建立了一个轻量级的"规约层"，让双方在写代码之前就达成共识。

- **核心理念**：在动手写代码之前，先对齐需求、设计和技术方案
- **产品形态**：一个基于 Node.js 的 CLI 工具（`@fission-ai/openspec`），同时为多种 AI 工具生成 Skill 和 Slash Command
- **适用场景**：从个人项目到企业级代码库，特别擅长已有代码库（brownfield）的增量开发

> 对比：比 GitHub Spec Kit 更轻量灵活，比 AWS Kiro 更开放（不绑定 IDE 和模型）。

---

## 2. 核心设计理念

OpenSpec 的设计哲学可以概括为四句话：

| 原则 | 含义 |
|------|------|
| **fluid not rigid** | 没有僵化的阶段门，随时可以在任意步骤间切换和迭代 |
| **iterative not waterfall** | 边做边学，边学边改，允许在实施过程中修正早期文档 |
| **easy not complex** | 秒级初始化，最小仪式，仅在需要时才进行定制 |
| **brownfield-first** | 优先支持对已有代码库的修改，而非只适用于从零搭建新系统 |

---

## 3. 核心概念体系

### 3.1 双区结构：`specs/` vs `changes/`

```text
openspec/
├── specs/              ← 单一事实来源（Source of Truth）
│   └── <domain>/
│       └── spec.md     ← 描述系统当前行为的规约
│
└── changes/            ← 拟议的修改（每个 change 一个文件夹）
    └── <change-name>/
        ├── proposal.md
        ├── design.md
        ├── tasks.md
        └── specs/      ← Delta Specs（差异规约）
```

- **`specs/`**：系统当前行为的权威描述，按领域（domain）组织，如 `auth/`、`payments/`、`ui/`
- **`changes/`**：每个变更独立一个文件夹，包含完整上下文，支持**并行开发**多个变更而不冲突

### 3.2 四种 Artifact（产物）

每个 `change/` 文件夹内包含指导工作的文档产物：

| Artifact | 文件名 | 核心问题 | 内容 |
|----------|--------|----------|------|
| **Proposal** | `proposal.md` | 为什么做？范围是什么？ | Intent、Scope、Approach |
| **Specs** | `specs/<domain>/spec.md` | 改什么？ | Delta Specs（ADDED / MODIFIED / REMOVED） |
| **Design** | `design.md` | 怎么做？ | 技术方案、架构决策、数据流 |
| **Tasks** | `tasks.md` | 具体步骤？ | 带复选框的实现清单 |

Artifacts 之间的依赖关系构成一个有向无环图（DAG）：

```text
proposal ──→ specs ──→ design ──→ tasks ──→ implement
   ↑            ↑          ↑                    │
   └────────────┴──────────┴────────────────────┘
            实施中可随时回溯修正
```

### 3.3 Delta Specs（差异规约）—— 棕色开发的核心

Delta Specs 是 OpenSpec 的关键创新，它描述**相对于当前 specs 的变化**，而非重写完整规约：

```markdown
## ADDED Requirements
### Requirement: Two-Factor Authentication
...

## MODIFIED Requirements
### Requirement: Session Expiration
（Previously: 30 minutes）
...

## REMOVED Requirements
### Requirement: Remember Me
```

Archive 时的合并规则：
- **ADDED** → 追加到主规约
- **MODIFIED** → 替换现有条目
- **REMOVED** → 从主规约中删除

### 3.4 Schema（工作流模式）

Schema 定义了 Artifact 的类型及其依赖关系，用 YAML 描述：

```yaml
# schemas/spec-driven/schema.yaml
name: spec-driven
artifacts:
  - id: proposal
    generates: proposal.md
    requires: []
  - id: specs
    generates: specs/**/*.md
    requires: [proposal]
  - id: design
    generates: design.md
    requires: [proposal]
  - id: tasks
    generates: tasks.md
    requires: [specs, design]
```

依赖关系是**使能器（enablers）**而非**强制门（gates）**——你可以跳过不需要的 artifact，也可以任意顺序创建。

---

## 4. 工作流程

### 4.1 默认快捷路径（core profile）

新安装默认使用 `core` profile，提供最精简的命令集：

```text
/opsx:propose  ──→  /opsx:apply  ──→  /opsx:archive
```

- **`/opsx:propose`**：一步创建 change 并生成所有 planning artifacts
- **`/opsx:explore`**：在创建 change 之前探索问题、比较方案
- **`/opsx:apply`**：按 tasks.md 逐项实现并打勾
- **`/opsx:archive`**：归档变更，将 delta specs 合并到主规约

### 4.2 扩展工作流（expanded workflow）

通过 `openspec config profile` + `openspec update` 启用更细粒度的命令：

```text
/opsx:new  ──→  /opsx:ff 或 /opsx:continue  ──→  /opsx:apply
                                                        │
                                              /opsx:verify
                                                        │
                                              /opsx:archive
```

扩展命令说明：

| 命令 | 作用 | 适用场景 |
|------|------|----------|
| `/opsx:new` | 创建 change 空壳 | 想分步控制 artifact 创建 |
| `/opsx:ff` | 快速生成所有 planning artifacts | 需求清晰，想一步到位 |
| `/opsx:continue` | 逐个创建下一个可用 artifact | 探索性工作，需要逐步审查 |
| `/opsx:verify` | 三维验证实现质量 | 归档前检查 |
| `/opsx:sync` | 手动合并 delta specs 到主规约 | 长周期变更或并行变更 |
| `/opsx:bulk-archive` | 批量归档多个已完成变更 | 并行开发流 |
| `/opsx:onboard` | 交互式教程 | 新用户上手 |

### 4.3 验证（Verify）的三维检查

`/opsx:verify` 从三个维度验证实现质量：

| 维度 | 检查内容 |
|------|----------|
| **Completeness（完整性）** | 所有 task 已完成、所有需求已实现、所有场景已覆盖 |
| **Correctness（正确性）** | 实现符合 spec 意图、边界情况已处理 |
| **Coherence（一致性）** | 设计决策在代码结构中得到体现、命名规范一致 |

### 4.4 归档（Archive）机制

归档是变更生命周期的终点：

1. **合并 Delta Specs**：将 ADDED/MODIFIED/REMOVED 应用到 `openspec/specs/`
2. **移动文件夹**：将 change 移动到 `openspec/changes/archive/YYYY-MM-DD-<name>/`
3. **保留审计轨迹**：完整保留 proposal、design、tasks 等上下文

---

## 5. 命令体系

### 5.1 AI 斜杠命令（Slash Commands）

在 AI 编程助手（Claude Code、Cursor、Windsurf 等）的聊天界面中使用：

- 格式：`/opsx:propose`、`/opsx:apply`、`/opsx:archive`
- 不同工具的语法略有差异（Claude Code 用 `:`，Cursor/Windsurf 用 `-`）
- 通过 `openspec init` 时自动生成对应工具的技能文件和命令文件

### 5.2 CLI 命令（Terminal Commands）

人类在终端中使用，部分命令支持 `--json` 输出供 AI Agent 消费：

| 类别 | 命令 | 用途 |
|------|------|------|
| **初始化** | `openspec init` | 初始化项目，配置 AI 工具集成 |
| | `openspec update` | 升级后重新生成 AI 指令文件 |
| **浏览** | `openspec list` | 列出 changes / specs |
| | `openspec view` | 交互式仪表板 |
| | `openspec show` | 查看 change 或 spec 详情 |
| **验证** | `openspec validate` | 检查结构和格式问题 |
| **生命周期** | `openspec archive` | 归档已完成变更 |
| **工作流** | `openspec status` | 查看 artifact 完成状态 |
| | `openspec instructions` | 获取创建 artifact 的富指令 |
| | `openspec templates` | 查看模板路径 |
| | `openspec schemas` | 列出可用 schema |
| **Schema** | `openspec schema init` | 创建自定义工作流 |
| | `openspec schema fork` | 复刻已有 schema |
| | `openspec schema validate` | 验证 schema 结构 |
| **配置** | `openspec config profile` | 配置工作流 profile |

---

## 6. 工具集成能力

OpenSpec 支持 **25+ 种 AI 编程助手**，包括但不限于：

- **Claude Code**、Cursor、Windsurf、GitHub Copilot、Gemini CLI
- **Cline**、Continue、Kiro、Kilo Code、RooCode
- **Codex**、Amazon Q、Trae、Qwen Code、Opencode

`openspec init` 会自动为选中的工具生成：

- **Skills**：`{tool}/skills/openspec-*/SKILL.md`，AI 自动检测和使用
- **Commands**：工具特定的命令文件（如 `.cursor/commands/opsx-propose.md`）

支持非交互式初始化（CI/CD 友好）：

```bash
openspec init --tools claude,cursor
openspec init --tools all
```

---

## 7. 架构设计

### 7.1 Artifact Graph 引擎

源码位于 `src/core/artifact-graph/`，是 OPSX 工作流的核心引擎：

- **`schema.ts`**：加载并验证 `schema.yaml`（Zod 校验、检查重复 ID、验证依赖引用、检测循环依赖）
- **`graph.ts`**：`ArtifactGraph` 类，提供拓扑排序（Kahn 算法）、获取就绪 artifact、检测阻塞状态
- **`state.ts`**：基于文件系统存在性检测 artifact 状态（BLOCKED → READY → DONE）
- **`resolver.ts`**：Schema 解析优先级（CLI flag > change metadata > project config > default）
- **`instruction-loader.ts`**：为 AI Agent 生成富指令（模板 + 上下文 + 依赖内容）

### 7.2 CLI 架构

源码位于 `src/cli/index.ts`，基于 **Commander.js**：

- 统一入口 `openspec`，通过 `preAction`/`postAction` hooks 处理全局选项和遥测
- 命令分为：Setup、Browsing、Validation、Lifecycle、Workflow、Schema、Config、Utility 八大类
- 支持 `--json` 输出模式，方便 AI Agent 消费结构化数据

### 7.3 命令生成系统

源码位于 `src/core/command-generation/`：

- **Registry 模式**：`CommandAdapterRegistry` 为每个工具提供适配器
- **Adapter 层**：`src/core/command-generation/adapters/` 包含 25+ 个工具适配器，处理不同工具的文件路径和格式差异
- **Generator**：将 workflow 模板转换为工具特定的命令文件

---

## 8. 自定义能力

OpenSpec 提供三级自定义：

### 8.1 项目配置（Project Config）

`openspec/config.yaml`：

```yaml
schema: spec-driven
context: |
  Tech stack: TypeScript, React, Node.js
rules:
  proposal:
    - Include rollback plan
  specs:
    - Use Given/When/Then format
```

- `context`：注入到所有 artifact 的 AI 指令中（帮助 AI 理解项目上下文）
- `rules`：按 artifact ID 注入特定规则

### 8.2 自定义 Schema

创建完全自定义的工作流：

```bash
# 从零创建
openspec schema init research-first

# 复刻已有 schema
openspec schema fork spec-driven my-workflow
```

自定义 Schema 包含：
- `schema.yaml`：定义 artifact 类型和依赖 DAG
- `templates/*.md`：每个 artifact 的 Markdown 模板

### 8.3 全局覆盖

用户级 schema 存放在 `~/.local/share/openspec/schemas/`，可跨项目共享。

---

## 9. 项目文件结构

```text
openspec/
├── config.yaml           # 项目配置（schema、context、rules）
├── schemas/              # 自定义工作流模式
│   └── my-workflow/
│       ├── schema.yaml
│       └── templates/
├── specs/                # 主规约（source of truth）
│   └── <domain>/
│       └── spec.md
└── changes/              # 活跃变更
    ├── <change-name>/
    │   ├── proposal.md
    │   ├── design.md
    │   ├── tasks.md
    │   ├── .openspec.yaml    # 变更元数据
    │   └── specs/
    │       └── <domain>/
    │           └── spec.md   # Delta spec
    └── archive/            # 已归档变更
        └── YYYY-MM-DD-<name>/
```

---

## 10. 规约格式规范

### 10.1 Spec 结构

```markdown
# Auth Specification

## Purpose
Authentication and session management.

## Requirements

### Requirement: User Authentication
The system SHALL issue a JWT token upon successful login.

#### Scenario: Valid credentials
- GIVEN a user with valid credentials
- WHEN the user submits login form
- THEN a JWT token is returned
- AND the user is redirected to dashboard
```

### 10.2 关键字（RFC 2119）

| 关键字 | 含义 |
|--------|------|
| **MUST / SHALL** | 绝对要求 |
| **SHOULD** | 推荐，但允许例外 |
| **MAY** | 可选 |

### 10.3 Progressive Rigor（渐进式严格）

- **Lite spec（默认）**：简短的行为优先需求、明确范围和非目标、少量验收检查
- **Full spec（高风险场景）**：跨团队变更、API/契约变更、安全隐私相关、歧义可能导致昂贵返工的场景

---

## 11. 最佳实践

1. **保持变更聚焦**：一个逻辑工作单元对应一个 change，避免"加功能 X 同时重构 Y"
2. **需求不清时用 `/opsx:explore`**：在创建 artifact 前先探索问题空间
3. **归档前用 `/opsx:verify`**：在关闭变更前捕获实现与规约的不一致
4. **命名要清晰**：如 `add-dark-mode`、`fix-login-redirect`，避免 `feature-1`、`update`
5. **何时更新 vs 何时新建**：
   - **更新**：意图相同、执行 refined、范围收窄、学习驱动的修正
   - **新建**：意图根本改变、范围爆炸、原变更可以独立标记为"完成"

---

## 12. 与其他方案的对比

| 维度 | OpenSpec | GitHub Spec Kit | AWS Kiro | 无规约 |
|------|----------|-----------------|----------|--------|
| 重量 | 轻量 | 重量级 | 中等 | - |
| 阶段门 | 无（fluid） | 有（rigid） | 有 | - |
| IDE 绑定 | 无 | 无 | 是（锁定） | - |
| 模型绑定 | 无 | 无 | Claude 限定 | - |
| 工具支持 | 25+ | 有限 | 有限 | - |
| 适用场景 | brownfield + greenfield | greenfield 为主 | greenfield | 任意 |

---

## 13. 总结

OpenSpec 的核心价值在于：**在 AI 辅助编程的时代，为"人类意图"和"AI 实现"之间建立一座轻量但坚固的桥梁。**

它通过：
- **Delta Specs** 解决已有代码库的规约难题
- **Artifact DAG** 提供灵活而非线性的工作流
- **Schema 引擎** 让团队可以定制自己的工作方式
- **多工具集成** 确保不锁定在单一 AI 助手

最终形成一条"virtuous cycle"：

```text
Specs 描述当前行为
  ↓
Changes 以 Deltas 提出修改
  ↓
Implementation 将变更落地
  ↓
Archive 合并 Deltas 到 Specs
  ↓
Specs 更新为新的行为描述
  ↓
下一个 Change 基于更新的 Specs 构建...
```
