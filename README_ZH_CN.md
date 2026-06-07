[English](./README.md) · **简体中文**

# AI 试卷生成器

> 把与 AI 模型的一段对话，变成可直接打印的试卷。

AI 试卷生成器是一款面向教师与教育工作者的本地优先桌面应用（基于 [Tauri](https://tauri.app/) 构建）。用自然语言描述你想要的试卷，助手会分析需求、确认理解，然后生成结构化、经 schema 校验的题目，并实时排版成可分页打印的试卷。

<!-- screenshot: 在此处放置应用截图或短 GIF -->

## 功能特性

- **对话式两阶段生成** —— 助手先分析你的需求并确认理解，再生成题目。生成的题目**绝不会自动应用**：你在结果卡中审阅后手动应用，并可一键撤销。
- **7 种题型，强校验** —— 单选、多选、判断、填空、简答、论述、计算。每条 AI 回复在进入试卷前都先经 [Zod](https://zod.dev/) 校验，格式错误时自动纠错（最多重试 3 次）。
- **联网搜索联动** —— 可选让模型在出题前发起联网搜索（Tavily、Exa 或 Firecrawl）。搜索结果会回灌进本轮上下文（最多 3 次搜索），使题目能基于最新来源。
- **实时分页预览 + 打印 / 导出** —— 试卷按物理纸张（A4 等）实时分页排版，支持教师版（显示答案）与学生版（保留答题区、隐藏答案）。
- **富文本题干** —— 题干支持 Markdown、KaTeX 数学公式、GFM 表格与代码高亮。
- **自带模型端点** —— 兼容任意 OpenAI 协议端点（OpenAI、DeepSeek、Ollama、中转站、本地模型）。可配置 base URL、模型、temperature 与 max tokens。
- **本地优先、隐私友好** —— 试卷与会话存储在你自己的磁盘；API Key 保存在系统钥匙串（keychain）中，不以明文落盘。
- **中英双语界面** —— English 与简体中文（i18next）。
- **多试卷与聊天历史** —— 管理多份试卷，每份试卷拥有各自独立的多会话聊天历史。

## 技术栈

- **前端：** React 19 · TypeScript · Vite 7 · Tailwind CSS v4 · Zustand · Zod · i18next
- **渲染：** react-markdown · rehype-katex · rehype-highlight · remark-gfm / remark-math · lucide-react
- **后端（Rust / Tauri 2）：** reqwest · tokio（SSE 流式 + 取消）· serde · 系统钥匙串

## 快速开始

### 前置要求

- **Node.js** 20.19+ 或 22.12+（Vite 7 要求）
- **Rust**（stable），通过 [rustup](https://rustup.rs/) 安装
- 各平台的 Tauri 系统依赖 —— 参见 [Tauri 前置依赖指南](https://tauri.app/start/prerequisites/)

### 安装

```bash
npm install
```

### 开发

```bash
npm run tauri dev    # 运行完整桌面应用
npm run dev          # 或仅运行 Web 前端（Vite）
```

### 构建

```bash
npm run tauri build  # 产出各平台安装包 / 可执行文件
```

### 测试与类型检查

```bash
npm test             # 运行测试套件（Vitest）
npm run typecheck    # TypeScript 类型检查（tsc --noEmit）
```

## 配置

1. 首次启动时，选择一个用于存储试卷与会话的**数据目录**。
2. 打开**设置**（`Ctrl` / `Cmd` + `,`），配置模型：**API Key**、**base URL** 与**模型**名称。
3. *（可选）* 开启**联网搜索**，并为所选 provider（Tavily / Exa / Firecrawl）填入 API Key。

API Key 保存在操作系统的钥匙串中。

## 项目结构

```
src/                 React 前端
  components/          按域划分的 UI —— paper / assistant / settings / layout
  stores/              Zustand 状态 —— paper / assistant / config / export
  lib/                 exam（领域逻辑）· api（AI 协议）· storage · types
  i18n/                en / zh 语言包
src-tauri/           Rust 后端（Tauri 2）
  src/                 openai.rs（流式）· web_search.rs · keychain.rs · storage.rs
```

## 许可证

暂未指定。
