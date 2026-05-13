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
