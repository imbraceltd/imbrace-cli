# Imbrace CLI

> CLI tool for interacting with the Imbrace CRM platform from the terminal. Designed for both developers and coding agents (Claude, Cursor, Copilot, etc.).

## Quick Install

```bash
# 1. Start the API server (in one terminal, keep running)
cd api
bun install
bun run dev    # runs on http://localhost:3456

# 2. Install the CLI (in another terminal — one-shot)
./install.sh
```

`install.sh` runs `npm install`, `npm run build`, `npm link`, and then symlinks `imbrace` into `/opt/homebrew/bin` (Apple Silicon) or `/usr/local/bin` so the command is available even from shells that don't load nvm — for example conda's `(base)` env.

---

## Authentication

```bash
# API Key (recommended for coding agents and CI/CD)
imbrace login --api-key api_xxx...

# Email + Password
imbrace login --email user@example.com --password mypass

# Check current login
imbrace whoami --json

# Logout
imbrace logout
```

Credentials are stored via the `conf` package — exact path depends on OS:

| OS | Path |
|---|---|
| macOS | `~/Library/Preferences/imbrace-nodejs/config.json` |
| Linux | `~/.config/imbrace-nodejs/config.json` |
| Windows | `%APPDATA%\imbrace-nodejs\Config\config.json` |

---

## Commands

### Data Board

A board is a CRM pipeline — leads, deals, tasks, or any structured data.

**Step 1 — List boards** (get Board IDs)

```bash
imbrace data-board list --json
```

**Step 2 — Create a board**

```bash
imbrace data-board create --name "Sales Pipeline" --json
```

The `create` command is interactive (without `--json`) — after entering the board name you can attach freestyle key-value pairs (e.g. `description`, `email`, or any custom property). With `--json`, only `--name` is required.

**Step 3 — Add schema fields to a board**

```bash
# Valid field types (16):
#   ShortText, LongText, Number, Date, Email, Phone, Currency,
#   SingleSelection, MultipleSelection, Checkbox,
#   Assignee, MultipleAssignee, Link, Notes, Origin, Priority
# DO NOT use `Dropdown` — backend rejects it (use `SingleSelection` instead).

imbrace data-board create-field <boardId> --name "Company" --type ShortText --json
imbrace data-board create-field <boardId> --name "Revenue" --type Number --json
imbrace data-board create-field <boardId> --name "Status"  --type SingleSelection --json
```

**Step 4 — Create items (records)**

```bash
imbrace data-board create-item <boardId> --fields '[
  {"board_field_id": "<fieldId1>", "value": "Acme Corp"},
  {"board_field_id": "<fieldId2>", "value": "50000"},
  {"board_field_id": "<fieldId3>", "value": "Active"}
]' --json
```

**Step 5 — List / search items**

```bash
# List all items (paginated)
imbrace data-board list-items --board-id <boardId> --limit 20 --skip 0 --json

# Full-text search
imbrace data-board list-items --board-id <boardId> --q "Acme" --json
```

**Update an item**

```bash
imbrace data-board update-item <boardId> <itemId> --data '[
  {"key": "<fieldId>", "value": "Acme Corp — Closed Won"}
]' --json
```

**Delete an item**

```bash
imbrace data-board delete-item <boardId> <itemId> --yes --json
```

**Export to CSV**

```bash
imbrace data-board export-csv --board-id <boardId> --out ./board.csv
```

---

### AI Agent

An AI agent is a configured assistant (LLM + prompt + behavior) that appears as a card on `cloud.imbrace.co/ai-agent`. Creating one atomically provisions the assistant, a web channel for the chat widget, and the use-case template.

> **All content (name, description, instructions, behavior fields) must be in English.** The slug for `workflow_name` is derived from the name; Vietnamese diacritics get stripped and produce unreadable slugs.

**List / get / delete**

```bash
imbrace ai-agent list --json
imbrace ai-agent get <agentId> --json
imbrace ai-agent delete <agentId> --yes --json
```

**Minimal create**

```bash
imbrace ai-agent create --name "Sales Bot" --json
```

**Full create — all Behavior Settings populated**

```bash
imbrace ai-agent create \
  --name "Customer Support Specialist" \
  --description "Senior AI customer support agent for an e-commerce company" \
  --instructions "You are a senior customer support specialist. Help customers with product questions, order tracking, and complaints. Escalate to a human for refunds over \$500, suspected fraud, or legal threats." \
  --personality "Friendly and professional senior customer support agent" \
  --core-task "Answer product inquiries, help track orders, resolve complaints, recommend products" \
  --tone "Polite, professional, warm. Empathetic when frustrated. Concise and direct." \
  --response-length "medium" \
  --banned-words "stupid, idiot, shut up, guarantee, promise" \
  --category "Support" \
  --model gpt-4o \
  --json
```

**Update**

```bash
imbrace ai-agent update <agentId> --name "New Name" --json
imbrace ai-agent update <agentId> --instructions "Updated prompt" --json
```

**Available flags**

| Flag | Maps to | Notes |
|---|---|---|
| `--name` / `-n` | `name` + `title` | Required for create |
| `--description` / `-d` | `description` + `short_description` | Shown under title |
| `--instructions` / `-i` | `instructions` | System prompt |
| `--model` | `model_id` | Default `gpt-4o` |
| `--personality` | `personality_role` | Behavior Settings tab |
| `--core-task` | `core_task` | Behavior Settings tab |
| `--tone` | `tone_and_style` | Behavior Settings tab |
| `--response-length` | `response_length` | `short` / `medium` / `long` |
| `--banned-words` | `banned_words` | Comma-separated |
| `--category` | `category` | Default `Support` |
| `--guardrail-id` | `guardrail_id` | Attach a guardrail |
| `--yes` / `-y` | — | Skip confirm on delete |
| `--json` | — | Machine-readable output |

---

### Workflow

A workflow (Activepieces) is a chain of nodes: a trigger fires, then actions run in sequence. Use it for automation — e.g. "Slack message arrives → ask AI → reply to thread".

**Anatomy:** A workflow has 6 layers — `Flow` (container) → `Version` (snapshot) → `Nodes` (trigger + actions) → `Connections` (credentials) → `Runs` (history) → `Pieces` (catalog of 126 integrations).

**Node types:**

| Type | Role | CLI support |
|---|---|---|
| `PIECE_TRIGGER` | "When does the flow run" — Slack message, webhook, cron, ... | ✅ `node add --type trigger` |
| `PIECE` | "What runs after" — send Slack, ask AI, HTTP call, ... | ✅ `node add --type action` |
| `EMPTY` | Placeholder before trigger is set | ✅ Read-only |
| `BRANCH` | If/else logic | ❌ Use UI builder |
| `ROUTER` | Multi-condition switch | ❌ Use UI builder |
| `LOOP_ON_ITEMS` | Loop over an array | ❌ Use UI builder |
| `CODE` | Inline JavaScript | ❌ Use UI builder |

**Sprint 1 — Flow CRUD** ✅
```bash
imbrace workflow list --json
imbrace workflow get <flowId> --json
imbrace workflow create --name "My Flow" --json
imbrace workflow delete <flowId> --yes --json

# Run history
imbrace workflow runs --json
imbrace workflow run-detail <runId> --json
```

**Sprint 2 — Build nodes** ✅
```bash
# Discover available integrations
imbrace workflow piece list --search slack --json
imbrace workflow piece detail slack --only actions --json

# Add nodes
imbrace workflow node add <flowId> \
  --type trigger --piece webhook --trigger-name catch_webhook \
  --input '{"authType":"none","authFields":{}}' --json

imbrace workflow node add <flowId> \
  --type action --piece ai-connector --action-name ask --after trigger \
  --input '{"prompt":"{{trigger.body.message}}","modelName":"gpt-4o"}' --json

# Manage nodes
imbrace workflow node list <flowId> --json
imbrace workflow node update <flowId> step_1 --input '{...}' --json
imbrace workflow node delete <flowId> step_1 --yes --json
```

**Sprint 3 — Connections, lifecycle, run** ⏳ (not yet implemented)
```bash
# Planned commands — coming soon
imbrace workflow conn list / create / delete
imbrace workflow publish / enable / disable <flowId>
imbrace workflow run <flowId> --payload '{...}' [--sync]
```

**Variable syntax inside node `input`**

- `{{trigger.body.X}}` — field `X` from webhook payload
- `{{trigger.X}}` — top-level trigger field (for piece triggers)
- `{{step_1.output.Y}}` — output field `Y` from step_1
- `{{connections.<id>.access_token}}` — connection field

---

## For Coding Agents

Set up a CRM pipeline with sample data:

```bash
# 1. Verify login
imbrace whoami --json

# 2. Create a board (--json skips interactive field prompts)
imbrace data-board create --name "Leads" --json
# → note the board _id from response

# 3. Add schema fields
imbrace data-board create-field <boardId> --name "Company"    --type ShortText        --json
imbrace data-board create-field <boardId> --name "Contact"    --type ShortText        --json
imbrace data-board create-field <boardId> --name "Deal Value" --type Number           --json
imbrace data-board create-field <boardId> --name "Stage"      --type SingleSelection  --json
# → note each field _id from response

# 4. Add records
imbrace data-board create-item <boardId> --fields '[
  {"board_field_id": "<companyFieldId>",   "value": "Acme Corp"},
  {"board_field_id": "<contactFieldId>",   "value": "John Doe"},
  {"board_field_id": "<dealValueFieldId>", "value": "75000"},
  {"board_field_id": "<stageFieldId>",     "value": "Negotiation"}
]' --json

# 5. Verify
imbrace data-board list-items --board-id <boardId> --json
```

> Always use `--json` flag so output can be parsed programmatically.
> If a command returns 401, run `imbrace login --api-key api_xxx...` again.

For complete CLI reference for coding agents, see [`llms.txt`](./llms.txt).

---

## Project Structure

```
imbrace-cli/
├── README.md                ← This file
├── llms.txt                 ← Reference for coding agents (Claude/Cursor/...)
├── install.sh               ← One-shot installer (npm link + cross-shell PATH)
├── report/                  ← Reports (BUG_REPORT, SDK_REPORT, PROMPT_GUIDE)
│
├── api/                     ← Hono REST API (proxy to Imbrace platform)
│   └── src/
│       ├── index.ts         ← Entry point, port 3456
│       ├── middleware/auth.ts  ← Auth via @imbrace/sdk
│       └── routes/
│           ├── auth.ts      ← POST /auth/login
│           ├── data-board.ts ← CRUD /data-board/*
│           ├── ai-agent.ts  ← CRUD /ai-agent/* (uses client.agent.createUseCase)
│           └── workflow.ts  ← CRUD /workflow/*, /workflow/piece/*, /workflow/:id/nodes/*
│
└── cli/                     ← oclif CLI
    └── src/
        ├── base-command.ts  ← Auto-prompts login if not authenticated
        ├── config.ts        ← Credential store (via `conf` package)
        ├── http.ts          ← HTTP client → API server
        └── commands/
            ├── login.ts
            ├── logout.ts
            ├── whoami.ts
            ├── data-board/
            │   ├── list.ts
            │   ├── create.ts
            │   ├── create-field.ts
            │   ├── create-item.ts
            │   ├── list-items.ts
            │   ├── update-item.ts
            │   ├── delete-item.ts
            │   └── export-csv.ts
            ├── ai-agent/
            │   ├── list.ts
            │   ├── get.ts
            │   ├── create.ts
            │   ├── update.ts
            │   └── delete.ts
            └── workflow/
                ├── list.ts
                ├── get.ts
                ├── create.ts
                ├── delete.ts
                ├── runs.ts
                ├── run-detail.ts
                ├── piece/
                │   ├── list.ts
                │   └── detail.ts
                └── node/
                    ├── add.ts
                    ├── update.ts
                    ├── delete.ts
                    └── list.ts
```

---

## Adding a New Service

1. Create `api/src/routes/<service>.ts`
2. Mount in `api/src/index.ts` with `authMiddleware`
3. Create `cli/src/commands/<service>/*.ts`
4. Add topic in `cli/package.json` under `oclif.topics`
5. Rebuild CLI: `cd cli && npm run build` (or re-run `./install.sh`)
