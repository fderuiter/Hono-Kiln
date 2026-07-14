.PHONY: install dev db-migrate db-push db-seed inngest

install:
	bun install

dev:
	bun run --filter @hono-kiln/api dev

db-migrate:
	cd packages/api && bun x drizzle-kit generate

db-push:
	cd packages/api && bun x drizzle-kit push

db-seed:
	cd packages/api && bun run db:seed

inngest:
	bunx inngest-cli dev -u http://localhost:3000/api/inngest
