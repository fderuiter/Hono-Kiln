.PHONY: install dev db-migrate db-push db-seed

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
