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

## Profiles (multi-account, AWS-style)

One CLI install can manage multiple accounts / environments — work + personal, cloud + sandbox, even fully self-hosted Imbrace instances. Each "profile" is a named credential set mapping 1:1 to the SDK `ImbraceClientConfig`.

```bash
# Create profiles
imbrace profile create work     --api-key api_aaa... --env stable
imbrace profile create sandbox  --api-key api_bbb... --env sandbox
imbrace profile create selfhost --api-key api_xxx... --base-url https://imbrace.acme.com --org-id org_acme

# List + switch
imbrace profile list                       # shows active marker (*)
imbrace profile use sandbox                # switch active
imbrace profile show selfhost              # full details

# Per-call override
imbrace workflow list --profile sandbox
IMBRACE_PROFILE=sandbox imbrace workflow list     # via env var

# Manage
imbrace profile rename old new
imbrace profile delete sandbox --yes
```

**Resolution order** (highest priority first):
1. `--profile <name>` flag
2. `IMBRACE_PROFILE` env var
3. `active_profile` saved in config
4. `"default"` fallback

**Per-profile config** — every SDK field is exposed:

| Profile field | SDK option | Use |
|---|---|---|
| `--api-key` / login `--email` `--password` | `apiKey` / `accessToken` | Credential |
| `--env` (`stable` / `sandbox` / `develop` / `prodv2`) | `env` | Pick preset gateway |
| `--base-url <url>` | `baseUrl` | Override gateway entirely (self-host) |
| `--org-id <id>` | `organizationId` | `x-organization-id` header |
| `--timeout <ms>` | `timeout` | Request timeout (default 30000) |
| `--check-health` | `checkHealth` | Ping `/global/health` on init |
| `--services '<json>'` | `services` | Per-microservice URL override |

Legacy pre-v0.6 configs are auto-migrated into a `default` profile on first run — existing users see no change.

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

**CRUD**

```bash
imbrace ai-agent list --json
imbrace ai-agent get <agentId> --json
imbrace ai-agent create --name "Sales Bot" --json
imbrace ai-agent update <agentId> --name "New Name" --json
imbrace ai-agent delete <agentId> --yes --json
```

**Discovery (LLM providers + Knowledge Hub)**

```bash
# LLM providers + models
imbrace ai-agent list-providers --json                            # 3 providers
imbrace ai-agent list-models --provider-id system --json          # models per provider

# Knowledge Hub folders + files
imbrace ai-agent list-folders [--search support] --json
imbrace ai-agent list-files --folder-id <folderId> --json
```

**Full create — all settings populated**

```bash
imbrace ai-agent create \
  --name "Customer Support Specialist" \
  --description "Senior AI customer support agent for an e-commerce company" \
  --instructions "You are a senior customer support specialist..." \
  --personality "Friendly and professional senior customer support agent" \
  --core-task "Answer product inquiries, help track orders" \
  --tone "Polite, professional, warm" \
  --response-length "medium" \
  --banned-words "stupid, idiot" \
  --category "Support" \
  --provider-id "e2629292-7e9f-4d55-ba18-6827747eab33" \
  --model "gpt-4o-mini" \
  --temperature 0.3 \
  --folder-ids "69bb82faa2cc764639bc6bdb" \
  --board-ids "brd_e5450d76-84d4-4c34-8b13-3d0f1873b53b" \
  --json
```

**Available flags** (`create` + `update` accept the same set; `update` preserves unchanged fields via PUT-merge)

| Flag | Maps to | Notes |
|---|---|---|
| **Identity** | | |
| `--name` / `-n` | `name` + `title` | Required for create |
| `--description` / `-d` | `description` + `short_description` | Shown under title in UI |
| `--instructions` / `-i` | `instructions` | System prompt |
| **Model** | | |
| `--model` | `model_id` | Default `Default` (system provider). Discover via `list-models`. |
| `--provider-id` | `provider_id` | UUID, default `system`. **Use UUID — not the MongoDB `_id`.** |
| `--mode` | `mode` | `standard` / `advanced` |
| `--temperature` | `temperature` | 0.0–2.0, default 0.1 |
| **Behavior Settings** | | |
| `--personality` | `personality_role` | |
| `--core-task` | `core_task` | |
| `--tone` | `tone_and_style` | |
| `--response-length` | `response_length` | `short` / `medium` / `long` |
| `--banned-words` | `banned_words` | Comma-separated, word-level filter on output |
| `--category` | `category` | `Support` / `Sales` / `Marketing` / `Team` / `Other` |
| `--guardrail-id` | `guardrail_id` | Attach a guardrail |
| `--preload-information` | `preload_information` | Static info auto-injected into context |
| **Knowledge Support** | | |
| `--folder-ids` | `folder_ids` | Comma-separated KH folder IDs |
| `--default-folder-id` | `default_folder_id` | |
| `--knowledge-hubs` | `knowledge_hubs` | Comma-separated KH IDs |
| `--board-ids` | `board_ids` | Comma-separated data board IDs (Document Models) |
| `--file-ids` | `file_ids` | Comma-separated file IDs |
| **Runtime toggles** (boolean, support `--no-X`) | | |
| `--show-thinking` | `show_thinking_process` | Default false |
| `--streaming` | `streaming` | Default true |
| `--use-memory` | `use_memory` | Default true |
| **Output** | | |
| `--yes` / `-y` | — | Skip confirm on delete |
| `--json` | — | Machine-readable output |
| `--id-only` | — | Print only the new agent ID (pipe-friendly) |
| `-h` / `--help` | — | Show usage on any command |

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
| `ROUTER` | Multi-condition switch (replaces legacy BRANCH) | ✅ `node add-raw` |
| `LOOP_ON_ITEMS` | Loop over an array | ✅ `node add-raw` |
| `CODE` | Inline JavaScript | ✅ `node add-raw` |

**Flow CRUD + run history**
```bash
imbrace workflow list [--folder-id <id|NULL>]        # filter by category folder
imbrace workflow get <id>
imbrace workflow create --name "X" [--folder-id <id>]
imbrace workflow move <flowId> --folder-id <id|NULL> # NULL = unfile
imbrace workflow delete <id> --yes
imbrace workflow runs                                # recent runs
imbrace workflow run-detail <runId>
```

**Build nodes**
```bash
# Discover integrations
imbrace workflow piece list [--search slack]
imbrace workflow piece detail <pieceName> [--only actions|triggers]

# Manage nodes
imbrace workflow node list <flowId>
imbrace workflow node add <flowId> --type trigger --piece <name> --trigger-name <id> --input '{...}'
imbrace workflow node add <flowId> --type action --piece <name> --action-name <id> --after <parent> --input '{...}'
imbrace workflow node update <flowId> <nodeName> --input '{...}'
imbrace workflow node delete <flowId> <nodeName> --yes
imbrace workflow node add-raw <flowId> --op-file <path>   # advanced types: ROUTER, LOOP_ON_ITEMS, CODE
```

**Connections (OAuth/API keys for external services)**
```bash
imbrace workflow conn list
imbrace workflow conn get <connId>
imbrace workflow conn create --piece slack --type SECRET_TEXT --value "xoxb-..." [--display-name <X>]
imbrace workflow conn delete <connId> --yes
```

**Lifecycle**
```bash
imbrace workflow publish <flowId>     # lock current draft as production
imbrace workflow enable <flowId>      # auto-trigger on (requires publish first)
imbrace workflow disable <flowId>     # stop auto-trigger
imbrace workflow run <flowId> --payload '{...}' [--sync]
```

**Folders (organize flows — UI calls them "Categories")**
```bash
imbrace workflow folder list / get <id> / create --name / update <id> --name / delete <id> --yes
```

The platform auto-creates 4 system folders that show up as Categories in the UI:

| UI Category | Purpose | Folder name in API |
|---|---|---|
| Channel Workflow | Messaging / channel automation | `Channel Workflow` |
| Board Automation | Triggered by data-board events | `Board Automation` |
| AI Agent Skills | Skills callable by AI agents | `AI Agent Capabilities` |
| Others | Everything else | `Others` |

Use `workflow folder list` to discover their IDs, then `workflow create --folder-id <id>` or `workflow move <flowId> --folder-id <id>` to place a flow in a category. Pass `--folder-id NULL` to unfile.

**MCP servers (Model Context Protocol — let AI agents call Activepieces tools)**
```bash
imbrace workflow mcp list / get <id> / create --name / delete <id> --yes
imbrace workflow mcp rotate-token <mcpId> --yes        # token shown once at create + rotate
```

**Variable syntax inside node `input`**

- `{{trigger.body.X}}` — field `X` from webhook payload
- `{{trigger.X}}` — top-level trigger field (for piece triggers)
- `{{step_1.output.Y}}` — output field `Y` from step_1
- `{{connections.<id>.access_token}}` — connection field

**Known issue:** `workflow run --sync` may time out at ~30s even when the flow finishes faster. Workaround: use `workflow runs` + `run-detail <runId>` to fetch the result.

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

**Tip — one-shot setup for an AI agent:**
```bash
imbrace docs > /tmp/imbrace-llms.txt   # ~30 KB reference, bundled with the package
# then feed /tmp/imbrace-llms.txt into your agent's context (Claude Code, Cursor, ...)
```
The `imbrace docs` command prints the full `llms.txt` shipped inside the npm package — no network or repo clone needed.

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
            │   ├── delete.ts
            │   ├── list-providers.ts        ← LLM providers discovery
            │   ├── list-models.ts           ← Models per provider
            │   ├── list-folders.ts          ← Knowledge Hub folders
            │   └── list-files.ts            ← Files in a KH folder
            └── workflow/
                ├── list.ts
                ├── get.ts
                ├── create.ts
                ├── delete.ts
                ├── runs.ts
                ├── run-detail.ts
                ├── publish.ts               ← Lifecycle
                ├── enable.ts
                ├── disable.ts
                ├── run.ts                    ← Trigger flow [--sync]
                ├── piece/
                │   ├── list.ts
                │   └── detail.ts
                ├── node/
                │   ├── add.ts
                │   ├── update.ts
                │   ├── delete.ts
                │   ├── list.ts
                │   └── add-raw.ts           ← ROUTER / LOOP_ON_ITEMS / CODE
                ├── conn/                     ← Connections (OAuth/API keys)
                │   ├── list.ts
                │   ├── get.ts
                │   ├── create.ts
                │   └── delete.ts
                ├── folder/                   ← Organize flows
                │   ├── list.ts
                │   ├── get.ts
                │   ├── create.ts
                │   ├── update.ts
                │   └── delete.ts
                └── mcp/                      ← Model Context Protocol servers
                    ├── list.ts
                    ├── get.ts
                    ├── create.ts
                    ├── delete.ts
                    └── rotate-token.ts
```

---

## Adding a New Service

1. Create `api/src/routes/<service>.ts`
2. Mount in `api/src/index.ts` with `authMiddleware`
3. Create `cli/src/commands/<service>/*.ts`
4. Add topic in `cli/package.json` under `oclif.topics`
5. Rebuild CLI: `cd cli && npm run build` (or re-run `./install.sh`)
