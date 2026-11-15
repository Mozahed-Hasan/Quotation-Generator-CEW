# AI Worker Orchestration (Architect + Workers Pattern)

To minimize Gemini quota and credit consumption while accelerating task completion, follow this hybrid architecture:

## 1. Hierarchy & Roles:
- **Master Architect (Gemini / Antigravity)**:
  - Responsible for: Understanding user instructions, reading the codebase, creating high-level execution plans, auditing code, and performing final file edits (`edit_file`, `write_file`, `run_command`).
  - Ensures all user rules are strictly respected: 100% English UI (no Bangla in buttons/labels), zero emojis, consistent white/slate theme.
  - Verifies builds (`npm run build`) and manages server daemons.

- **Primary Code Worker - Qwen 3.8 27B (`qwen_chat` MCP tool)**:
  - Call `qwen_chat` for drafting complex algorithms, React component snippets, SQL queries, regex, data processing logic, and mathematical routines.
  - Generates in ~300ms on Groq's LPU at zero cost.

- **Fast Text & Schema Worker - Groq (`groq_chat` MCP tool)**:
  - Call `groq_chat` for drafting documentation, boilerplate templates, JSON schemas, mock data, and rapid text synthesis.

## 2. Standard Execution Flow:
1. **Plan (Gemini)**: Outline what needs to be changed across files.
2. **Delegate (Workers)**: Offload code drafting to `qwen_chat` or text drafting to `groq_chat`.
3. **Verify & Integrate (Gemini)**: Review worker output, ensure strict compliance with project styling and rules, and apply the edits into the workspace files.
