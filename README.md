# Imbrace CLI

> CLI tool for interacting with the Imbrace CRM platform from the terminal. Designed for both developers and coding agents (Claude, Cursor, Copilot, etc.).

## Installation

```bash
# Install dependencies and register the `imbrace` command globally
cd cli
npm install
npm run build
npm link
```

> The API server must be running before using any CLI commands.

## Start the API Server

```bash
cd api
bun install
bun run dev    # runs on http://localhost:3456
```

---

## Authentication

Login is required before using any `data-board` commands. The CLI will prompt automatically if not logged in.

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

Credentials are saved to `~/.config/imbrace/config.json`.

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

The `create` command is interactive — after entering the board name, you'll be prompted to add extra fields as freestyle key-value pairs (e.g. `description`, `email`, or any custom property). All collected fields are sent in a single request body:

```
Board name: Sales Pipeline
Thêm field? Yes
  Field name: description
  Field value: Track all active deals
Thêm field? Yes
  Field name: email
  Field value: owner@example.com
Thêm field? No
→ Board created
```

The body sent to the API is freestyle — only `name` is required, everything else is passed through as-is.

**Step 3 — Add schema fields to a board** (optional, for typed columns)

```bash
# Field types: ShortText, LongText, Number, Dropdown, Date, Checkbox
imbrace data-board create-field <boardId> --name "Company" --type ShortText --json
imbrace data-board create-field <boardId> --name "Revenue" --type Number --json
imbrace data-board create-field <boardId> --name "Status" --type Dropdown --json
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

## For Coding Agents

To set up a board with complex data, follow this sequence:

```bash
# 1. Verify login
imbrace whoami --json

# 2. Create a board (--json skips interactive field prompts)
imbrace data-board create --name "Leads" --json
# → note the board _id from response

# 3. Add schema fields (typed columns for items)
imbrace data-board create-field <boardId> --name "Company" --type ShortText --json
imbrace data-board create-field <boardId> --name "Contact" --type ShortText --json
imbrace data-board create-field <boardId> --name "Deal Value" --type Number --json
imbrace data-board create-field <boardId> --name "Stage" --type Dropdown --json
# → note each field _id from response

# 4. Add records
imbrace data-board create-item <boardId> --fields '[
  {"board_field_id": "<companyFieldId>", "value": "Acme Corp"},
  {"board_field_id": "<contactFieldId>", "value": "John Doe"},
  {"board_field_id": "<dealValueFieldId>", "value": "75000"},
  {"board_field_id": "<stageFieldId>", "value": "Negotiation"}
]' --json

# 5. Verify
imbrace data-board list-items --board-id <boardId> --json
```

> Always use `--json` flag so output can be parsed programmatically.  
> If you get a 401 error, run `imbrace login --api-key api_xxx...` again.

---

## Project Structure

```
imbrace-cli/
├── api/                      ← Hono REST API (proxy to Imbrace platform)
│   └── src/
│       ├── index.ts          ← Entry point, port 3456
│       ├── middleware/auth.ts ← Auth via @imbrace/sdk
│       └── routes/
│           ├── auth.ts       ← POST /auth/login
│           └── data-board.ts ← CRUD /data-board/*
│
├── cli/                      ← oclif CLI
│   └── src/
│       ├── base-command.ts   ← Auto-prompts login if not authenticated
│       ├── config.ts         ← Credential store
│       ├── http.ts           ← HTTP client
│       └── commands/
│           ├── login.ts
│           ├── logout.ts
│           ├── whoami.ts
│           └── data-board/
│               ├── list.ts
│               ├── create.ts
│               ├── create-field.ts
│               ├── create-item.ts
│               ├── list-items.ts
│               ├── update-item.ts
│               ├── delete-item.ts
│               └── export-csv.ts
│
└── llms.txt                  ← Reference for coding agents
```

## Adding a New Service

1. Create `api/src/routes/<service>.ts`
2. Mount in `api/src/index.ts` with `authMiddleware`
3. Create `cli/src/commands/<service>/*.ts`
4. Add topic in `cli/package.json` under `oclif.topics`

bi_18e38f97-eee5-4c7d-945c-ce19750a7754 api_108f337f-a4a8-445e-8e24-9c6bf96fb72b brd_e78f21f3-b982-42d4-9f64-5c5682703386

ai-agent,
