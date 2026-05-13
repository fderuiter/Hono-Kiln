# Hono-Kiln

## Kiln CLI

Generate a new API module scaffold:

```sh
bun kiln generate module <name>
```

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
