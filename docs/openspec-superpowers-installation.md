# OpenSpec Superpowers 安装指南

**文档导航**：  
→ 想**了解设计思路**？阅读 [设计规格](./openspec-superpowers-fusion.md)  
→ 想**安装部署**？你在看的正是安装指南  
→ 想**学习使用**？阅读 [使用手册](./openspec-superpowers-usage-guide.md)  
→ 想**了解实施过程**？阅读 [实施方案](./openspec-superpowers-implementation-plan.md)

## 目录

- [1. 环境要求](#1-环境要求)
- [2. 安装 OpenSpec CLI](#2-安装-openspec-cli)
- [3. 安装 Superpowers 技能](#3-安装-superpowers-技能)
- [4. 离线安装](#4-离线安装)
- [5. 初始化项目](#5-初始化项目)
- [6. 验证安装](#6-验证安装)
- [7. 多工具配置](#7-多工具配置)
- [8. 升级](#8-升级)
- [9. 卸载](#9-卸载)
- [10. 常见问题](#10-常见问题)

---

## 1. 环境要求

| 依赖 | 最低版本 | 说明 |
|------|----------|------|
| **Node.js** | 20.19.0+ | OpenSpec CLI 运行环境 |
| **Git** | 2.30+ | 版本控制和 worktree 功能 |
| **AI 工具** | 最新版 | Claude Code / Cursor / Windsurf 等 |

**检查环境**：
```bash
node --version    # ≥ v20.19.0
git --version     # ≥ 2.30.0
```

**兼容平台**：
- macOS 12+ (Intel / Apple Silicon)
- Windows 10/11 (PowerShell / Git Bash / WSL2)
- Linux (Ubuntu 20.04+, Debian 11+, RHEL 8+)

---

## 2. 安装 OpenSpec CLI

### 方式一：npm 全局安装（推荐）

```bash
npm install -g @fission-ai/openspec@latest
```

**验证**：
```bash
openspec --version    # 输出: 1.3.1 或更高
```

### 方式二：使用其他包管理器

```bash
# pnpm
pnpm add -g @fission-ai/openspec@latest

# yarn
yarn global add @fission-ai/openspec@latest

# bun
bun add -g @fission-ai/openspec@latest
```

### 方式三：nix（社区维护）

```bash
# 添加 nixpkgs 频道后
nix-env -iA nixpkgs.openspec
```

---

## 3. 安装 Superpowers 技能

Superpowers 是一组 AI 工程纪律技能，OpenSpec Enhanced/Strict profile 会编排调用它们。

### 3.1 自动安装（推荐）

在 Claude Code 中输入以下命令自动安装：

```
/skill:install test-driven-development
/skill:install verification-before-completion
/skill:install simplify
/skill:install brainstorming
/skill:install writing-plans
/skill:install requesting-code-review
/skill:install subagent-driven-development
```

如果你使用 Cursor 或其他工具，对应的 skill 安装命令略有不同，请参考 [Supported Tools](supported-tools.md)。

### 3.2 手动安装

从 Superpowers 仓库下载技能文件到对应目录：

```bash
# Claude Code (macOS / Linux)
mkdir -p ~/.claude/skills/
cd ~/.claude/skills/
git clone https://github.com/anthropic/superpowers-test-driven-development.git test-driven-development
git clone https://github.com/anthropic/superpowers-verification.git verification-before-completion
git clone https://github.com/anthropic/superpowers-simplify.git simplify
# ... 其他技能类似

# Claude Code (Windows PowerShell)
mkdir $env:USERPROFILE\.claude\skills\ -Force
cd $env:USERPROFILE\.claude\skills\
git clone https://github.com/anthropic/superpowers-test-driven-development.git test-driven-development
# ... 其他技能类似
```

### 3.3 技能对照表

| 技能名 | 用途 | 被哪些命令调用 | 降级级别 |
|--------|------|---------------|----------|
| `test-driven-development` | RED→GREEN→REFACTOR 循环 | apply（TDD: Full/Lite） | 降级为手动 Lite TDD |
| `verification-before-completion` | 运行测试套件 + 覆盖率 | verify（Layer 1） | 手动运行测试 |
| `simplify` | 代码精炼和重构 | apply（Post-checkpoint） | 跳过低风险 |
| `brainstorming` | 系统化方案对比 | explore（可选提议） | 手动分析 |
| `writing-plans` | 结构化设计文档 | ff（Complex 级别） | 手动创建 design.md |
| `requesting-code-review` | 独立代码审查 | review（Complex 级别） | 扩展 AI 自审 |
| `subagent-driven-development` | 子代理并行实现 | apply（per-task/adaptive） | 串行实现 |

> **注意**：使用 `core` profile 不需要安装任何 Superpowers 技能。使用 `enhanced` profile 缺失技能时会优雅降级。使用 `strict` profile 缺失技能时会报错。

---

## 4. 离线安装

适用于无法访问互联网的内网开发环境。

### 4.1 准备离线包

在联网机器上准备：

```bash
# 1. 克隆 OpenSpec 源码
git clone https://github.com/jisuobuyu/OpenSpec.git
cd OpenSpec
git checkout dev

# 2. 安装依赖并构建
npm install
npm run build

# 3. 打包 OpenSpec（包含构建产物）
cd ..
tar -czf openspec-offline.tar.gz OpenSpec/

# 4. 打包 Superpowers 技能
cd ~/.claude/skills/
tar -czf superpowers-skills.tar.gz \
  test-driven-development \
  verification-before-completion \
  simplify \
  brainstorming \
  writing-plans \
  requesting-code-review \
  subagent-driven-development
```

将 `openspec-offline.tar.gz` 和 `superpowers-skills.tar.gz` 复制到离线机器。

### 4.2 离线安装 OpenSpec CLI

在离线机器上：

```bash
# 1. 解压
tar -xzf openspec-offline.tar.gz

# 2. 从本地目录全局安装（不需要网络）
cd OpenSpec
npm install -g .

# 3. 验证
openspec --version
```

> **原理**：`npm install -g .` 从当前目录安装，不访问 npm registry。所有依赖已在联网机器上通过 `npm install` 预装。

### 4.3 离线安装 Superpowers 技能

```bash
# 解压到 Claude Code 技能目录
mkdir -p ~/.claude/skills/
tar -xzf superpowers-skills.tar.gz -C ~/.claude/skills/
```

验证技能是否正确安装：

```bash
ls ~/.claude/skills/
# 应看到：test-driven-development  verification-before-completion  simplify  brainstorming  writing-plans  requesting-code-review  subagent-driven-development

ls ~/.claude/skills/test-driven-development/SKILL.md
# 应存在
```

### 4.4 离线环境初始化项目

```bash
cd your-project
openspec init --profile enhanced --tools claude
```

`openspec init` 是纯本地操作——读取内置模板、生成 `.md` 文件到 `.claude/` 目录，不需要网络。

### 4.5 离线环境下各命令的依赖情况

| 操作 | 需要网络？ | 说明 |
|------|-----------|------|
| `openspec init` | 否 | 纯本地模板生成 |
| `openspec update` | 否 | 重新生成指令文件 |
| `/opsx:apply` | 否 | 所有 Skill 调用为本地文件读取 |
| `/opsx:verify` | 否 | L1 测试本地运行，L2 审计本地文件 |
| `/opsx:review` | 否 | AI 自审或调用本地 skill |
| `openspec status` | 否 | 纯本地制品扫描 |
| `openspec archive` | 否 | 本地文件移动和 spec 合并 |
| `npm test`（TDD 技能内） | 否 | 本地测试运行 |

> **完全离线可用**：OpenSpec + Superpowers 融合方案的所有功能均可在离线环境下正常工作。唯一需要网络的是初次 `git clone` 和 `npm install`（已在联网机器上完成）。

---

## 5. 初始化项目

### 5.1 基础初始化（Core profile）

```bash
cd your-project
openspec init
```

生成 `core` profile——5 个基础命令：`propose` `explore` `apply` `sync` `archive`。

### 5.2 增强初始化（推荐）

```bash
cd your-project
openspec init --profile enhanced --tools claude
```

生成 `enhanced` profile——14 个命令 + 14 个技能定义。

**参数说明**：

| 参数 | 值 | 说明 |
|------|-----|------|
| `--profile` | `core` / `enhanced` / `strict` / `custom` | 工作流 profile（默认 core） |
| `--tools` | 工具名列表，逗号分隔 | 目标 AI 工具（如 `claude,cursor`），`all` 全部，`none` 跳过 |

**支持的 `--tools` 值**：
```
claude, cursor, windsurf, codex, codebuddy, continue, coder,
github-copilot, roocode, trae, qwen, kimi, factory, gemini,
amazon-q, antigravity, auggie, bob, cline, costrict, crush,
iflow, junie, kilocode, kiro, opencode, pi, qoder, lingma
```

### 5.3 Strict profile（受监管环境）

```bash
cd your-project
openspec init --profile strict --tools claude
```

与 enhanced 生成相同数量文件，但运行时行为更严格（技能缺失报错，不降级）。

### 5.4 配置 discipline

初始化后，编辑 `openspec/config.yaml`：

```yaml
schema: superpowers
discipline:
  level: enhanced       # core | enhanced | strict
  tdd:
    default: adaptive   # full | lite | skip | adaptive
  subagent:
    mode: adaptive      # off | per-task | adaptive
  worktree:
    enabled: true       # 使用 git worktree 隔离
  exploration:
    search_history: false
```

### 5.5 仅生成特定交付物

```bash
# 仅生成技能文件
openspec init --profile enhanced --delivery skills --tools claude

# 仅生成命令文件
openspec init --profile enhanced --delivery commands --tools claude
```

### 5.6 已有项目更新

如果是已有 OpenSpec 项目，升级到 Superpowers：

```bash
# 更新全局配置的 profile
openspec config set profile enhanced

# 重新生成 AI 指令文件
openspec update
```

---

## 6. 验证安装

### 6.1 检查生成文件

```bash
# 检查命令文件数量
ls .claude/commands/opsx/ | wc -l
# core: 5, enhanced/strict: 14

# 检查技能文件数量
ls .claude/skills/ | grep openspec | wc -l
# core: 5, enhanced/strict: 14
```

### 6.2 检查 schema 可用

```bash
openspec schemas
```

**预期输出**：
```
Available schemas:
  spec-driven
    Default OpenSpec workflow - proposal → specs → design → tasks
    Artifacts: proposal → specs → design → tasks

  superpowers
    OpenSpec x Superpowers fusion - engineering discipline orchestrated by AI skills
    Artifacts: proposal → exploration → specs → design → tasks → review
```

### 6.3 测试创建一个变更

```bash
# 创建变更目录
openspec new change test-feature

# 检查状态
openspec status --change test-feature

# 查看 schema 模板
openspec templates --schema superpowers
```

### 6.4 测试 slash 命令

在 AI 工具中输入以下命令验证：
```
/opsx:explore "测试 superpowers 工作流"
```

AI 应进入探索模式，并可以读取你的项目上下文。

---

## 7. 多工具配置

如果同时使用多个 AI 工具（如 Claude Code + Cursor）：

```bash
openspec init --profile enhanced --tools claude,cursor
```

生成的文件结构：
```
.claude/
├── commands/opsx/     # Claude Code 命令 (14 个)
└── skills/            # Claude Code 技能 (14 个)

.cursor/
├── commands/opsx/     # Cursor 命令 (14 个)
└── skills/            # Cursor 技能 (14 个)
```

> **注意**：每次执行 `openspec update` 会同步所有已配置工具的指令文件。

---

## 8. 升级

### 8.1 升级 OpenSpec CLI

```bash
npm install -g @fission-ai/openspec@latest
```

### 8.2 升级项目指令文件

```bash
cd your-project
openspec update
```

`openspec update` 会：
- 重新生成所有 `.claude/commands/opsx/*.md` 文件
- 重新生成所有 `.claude/skills/openspec-*/SKILL.md` 文件
- 保留 `openspec/config.yaml` 不变
- 检测版本漂移并提示

### 8.3 升级 Superpowers 技能

```bash
# Claude Code
cd ~/.claude/skills/test-driven-development && git pull
cd ~/.claude/skills/verification-before-completion && git pull
# ... 其他技能类似
```

### 8.4 切换 profile

```bash
# 从 core 升级到 enhanced
openspec config set profile enhanced
openspec update

# 从 enhanced 降级到 core
openspec config set profile core
openspec update    # 会提示清理多余文件
```

---

## 9. 卸载

### 9.1 从项目中移除 OpenSpec

```bash
# 删除 OpenSpec 目录和所有制品
rm -rf openspec/

# 删除 AI 工具指令文件
rm -rf .claude/commands/opsx/
rm -rf .claude/skills/openspec-*/
```

### 9.2 卸载全局 CLI

```bash
npm uninstall -g @fission-ai/openspec
```

### 9.3 清理全局配置（可选）

```bash
# macOS / Linux
rm -rf ~/.config/openspec/
rm -rf ~/.local/share/openspec/

# Windows
rmdir /s %APPDATA%\openspec
rmdir /s %LOCALAPPDATA%\openspec
```

### 9.4 移除 Superpowers 技能（可选）

```bash
# 如果不再需要其他项目使用
rm -rf ~/.claude/skills/test-driven-development
rm -rf ~/.claude/skills/verification-before-completion
# ... 其他技能
```

---

## 10. 常见问题

### Q1: `openspec init` 报错 "command not found"

**原因**：Node.js 全局 bin 目录不在 PATH 中。

**解决**：
```bash
# 查看 npm 全局安装路径
npm config get prefix

# 将 bin 目录添加到 PATH（macOS / Linux）
echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Q2: Windows 上 worktree 创建失败 (EPERM)

**原因**：Windows 文件锁定（IDE、杀毒软件、文件管理器占用）。

**解决**：
```bash
# 方案 1：关闭占用目录的进程后重试
# 方案 2：配置使用 folder-only 模式
# 编辑 openspec/config.yaml:
discipline:
  worktree:
    enabled: false
```

### Q3: Enhanced profile 只有 9 个命令，不是 14 个

**原因**：`openspec update` 时部分 workflow 模板未被识别。

**解决**：
```bash
# 确认 CLI 版本（需要 1.3.1+）
openspec --version

# 强制重新生成
openspec update --force
```

### Q4: `/opsx:apply` 不调用 TDD 技能

**原因**：`discipline.level` 为 `core` 或技能未安装。

**检查**：
```bash
# 1. 检查 discipline 配置
cat openspec/config.yaml | grep -A 3 "discipline:"

# 2. 检查技能是否存在
ls ~/.claude/skills/test-driven-development/SKILL.md
```

**解决**：
- 确保 `discipline.level: enhanced` 或 `strict`
- 安装缺失的 Superpowers 技能（参见 [3. 安装 Superpowers 技能](#3-安装-superpowers-技能)）

### Q5: `openspec status --deps` 报告循环依赖

**原因**：两个变更互相声明了 `depends_on`。

**解决**：
1. 编辑 `.openspec.yaml`，移除循环的 `depends_on` 声明
2. 或者合并两个紧密耦合的变更

### Q6: 归档时冲突检测报错，如何处理？

**解决**：
- **File intersection**：协调修改顺序，先归档一个再处理另一个
- **Spec semantic conflict**：沟通确认需求归属，拆分到不同 requirements
- **Requirement ID collision**：重命名 requirement 使其 ID 唯一

### Q7: 如何在 CI/CD 中使用？

```yaml
# GitHub Actions 示例
- name: Setup OpenSpec
  run: |
    npm install -g @fission-ai/openspec@latest
    openspec init --profile strict --tools none

- name: Validate changes
  run: |
    openspec validate --all --strict --json

- name: Check dependencies
  run: |
    openspec status --deps --json

- name: Show metrics
  run: |
    openspec metrics --json
```

### Q8: 支持哪些语言？

OpenSpec 本身是语言无关的——它管理的是规格文件（Markdown + YAML）。Superpowers 技能（TDD、verify）会自动检测项目语言并适配（Node.js/npm、Python/pytest、Rust/cargo 等）。
