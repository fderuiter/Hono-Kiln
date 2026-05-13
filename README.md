# Hono Kiln 🔥

> **A production-ready Hono API starter with batteries included.**  
> Authentication, database, auto-generated modules, live API docs — all in one opinionated template.

---

## ⚡ 5-Second Start

```sh
git clone https://github.com/fderuiter/Hono-Kiln.git my-api
cd my-api
bun install
bun run --filter @hono-kiln/api dev
# → API running at http://localhost:3000
# → Swagger UI at http://localhost:3000/docs
```

That's it. Your API is live, documented, and ready to extend.

---

## Architecture

```
hono-kiln/
├── packages/
│   └── api/                  # Hono API (Cloudflare Workers compatible)
│       ├── app.ts            # App entry — routes + OpenAPI + Swagger UI
│       ├── index.ts          # Bun server entry point
│       ├── auth/             # Lucia session-based authentication
│       ├── db/               # Drizzle ORM + LibSQL (SQLite-compatible)
│       └── modules/
│           ├── health/       # /health, /health/live, /health/ready
│           └── root/         # / welcome route
├── scripts/
│   └── generate.ts           # Kiln CLI — scaffold new modules instantly
└── Makefile                  # Convenience commands
```

### Request lifecycle

```
HTTP request
     │
     ▼
 Auth middleware (Lucia session cookie)
     │
     ├─► / ──────────────────► root routes
     ├─► /health ─────────────► health routes
     ├─► /openapi.json ────────► auto-generated OpenAPI 3.0 spec
     └─► /docs ────────────────► Swagger UI
```

---

## Feature Matrix

| Feature | Stack | Notes |
|---|---|---|
| **HTTP framework** | [Hono](https://hono.dev) | Ultra-fast, edge-compatible |
| **Runtime** | [Bun](https://bun.sh) | Dev & test runner |
| **Deployment target** | Cloudflare Workers | PR preview deployments included |
| **Database** | LibSQL (Turso) | SQLite-compatible, edge-ready |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team) | Type-safe, zero-overhead |
| **Authentication** | [Lucia](https://lucia-auth.com) | Session-based auth out of the box |
| **API documentation** | [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi) + [@hono/swagger-ui](https://github.com/honojs/middleware/tree/main/packages/swagger-ui) | Live Swagger UI at `/docs` |
| **Schema validation** | [Zod](https://zod.dev) | Request/response types inferred automatically |
| **Module scaffolding** | Kiln CLI | One command generates routes, schema, repository & tests |
| **Testing** | Bun test | Co-located tests per module |
| **Linting** | oxlint | Fast Rust-based linter |
| **Secret scanning** | TruffleHog | Runs on every PR |
| **Releases** | semantic-release | Auto-versioning from Conventional Commits |
| **CI / CD** | GitHub Actions | PR gatekeeper + preview deployments + automated releases |

---

## API Documentation

Every route is documented automatically. Start the server and visit:

```
http://localhost:3000/docs           # Swagger UI
http://localhost:3000/openapi.json   # Raw OpenAPI 3.0 spec
```

Routes are defined with `@hono/zod-openapi`, giving you:

- **Compile-time type safety** — request and response shapes are inferred from Zod schemas.
- **Zero-config docs** — the spec is generated at runtime; no separate YAML/JSON to maintain.
- **Auto-validation** — invalid requests return structured 422 errors.

---

## Kiln CLI

Scaffold a complete new module in one command:

```sh
bun kiln generate module <name>
```

This creates `packages/api/modules/<name>/` with four files:

| File | Purpose |
|---|---|
| `schema.ts` | Zod-ready entity constants |
| `repository.ts` | Data access function |
| `routes.ts` | Hono route handlers |
| `routes.test.ts` | Co-located Bun tests |

The module is also automatically mounted in `app.ts` at `/<name>`.

### Example

```sh
bun kiln generate module products
```

Generates `packages/api/modules/products/` and mounts it at `/products`.

---

## Database

Start a local LibSQL server:

```sh
docker compose up -d
```

Generate a migration from the Drizzle schema:

```sh
make db-migrate
```

Push the schema directly to the local LibSQL server:

```sh
make db-push
```

The API defaults to `http://127.0.0.1:8080` when `DATABASE_URL` is not set.

---

## Testing

```sh
bun install          # install deps
bun test             # run all tests across all packages
bun test packages/api  # run API tests only
```

---

## CI / CD

### PR Gatekeeper

On every pull request targeting `main`, the **PR Gatekeeper** workflow runs:

- **Tests** – `bun test` across all packages
- **Lint** – `oxlint` on the full source tree
- **Secret scan** – TruffleHog scans the commits changed by the PR

No secrets are required for this workflow.

### PR Preview Deployments

On every pull request, the **PR Preview Deployment** workflow deploys a
temporary Cloudflare Worker named `hono-kiln-pr-<number>` and posts the
preview URL as a PR comment. The worker is deleted when the PR is closed.

> **Note:** When the required secrets are not configured the deployment jobs
> are automatically skipped, so the workflow will pass without deploying
> anything. This is the expected behaviour for forks and template instances.

Required repository secrets:

| Secret | Description |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with *Workers Scripts: Edit* permission |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

### Automated Releases

When a commit is pushed (or merged) to `main`, the **Release** workflow runs
[semantic-release](https://semantic-release.gitbook.io) to:

1. Determine the next version from [Conventional Commits](https://www.conventionalcommits.org)
2. Bump the version in `package.json`
3. Generate / update `CHANGELOG.md`
4. Create a GitHub Release with auto-generated release notes

Required repository secret:

| Secret | Description |
|---|---|
| `GITHUB_TOKEN` | Automatically provided by GitHub Actions – no manual setup needed |

