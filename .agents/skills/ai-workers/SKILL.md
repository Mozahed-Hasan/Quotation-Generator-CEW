---
name: ai-workers
description: Orchestrates tasks using a Master Architect (Gemini) and Worker model (Qwen 3.8 27B / Groq) via MCP to minimize credits and maximize speed.
---

# AI Worker Orchestration Skill

Use this skill whenever processing features, bug fixes, refactoring, or code generation.

## How it works:
1. **Gemini (Orchestrator)**: Plans the task, manages files, runs tests, and applies code edits.
2. **Qwen 3.8 27B (`qwen_chat` MCP)**: Writes complex code snippets, functions, mathematical algorithms, and state management logic.
3. **Groq (`groq_chat` MCP)**: Writes fast text, documentation, and boilerplate JSON/schemas.

## Execution Pattern:
- For complex function implementation: Call `qwen_chat` with the prompt and parameters.
- For documentation or routine summaries: Call `groq_chat`.
- Review output, apply edits using `edit_file`, and verify with `npm run build`.
