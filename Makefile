.PHONY: install dev db-migrate db-push db-seed

install:
	bun install

dev:
	bun run --filter @hono-kiln/api dev

db-migrate:
	cd packages/api && bunx drizzle-kit generate

db-push:
	cd packages/api && bunx drizzle-kit push

db-seed:
	cd packages/api && bun run db:seed
