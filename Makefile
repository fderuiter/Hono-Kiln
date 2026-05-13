.PHONY: install dev

install:
	bun install

dev:
	bun run --filter @hono-kiln/api dev
