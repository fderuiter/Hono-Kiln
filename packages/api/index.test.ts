import { describe, expect, it } from 'bun:test'

process.env.DATABASE_URL = 'file::memory:'
process.env.DATABASE_AUTH_TOKEN = 'test-token'

import app from './index'

describe('health routes', () => {
  it('returns welcome payload for /v1/', async () => {
    const response = await app.request('/v1')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ message: 'Hono Kiln API' })
  })

  it('returns ok for /health', async () => {
    const response = await app.request('/health')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  it('returns ok for /health/live', async () => {
    const response = await app.request('/health/live')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  it('returns ok for /health/ready', async () => {
    const response = await app.request('/health/ready')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })
})

describe('openapi routes', () => {
  it('serves the OpenAPI JSON spec at /openapi.json', async () => {
    const response = await app.request('/openapi.json')
    expect(response.status).toBe(200)
    const spec = await response.json()
    expect(spec.openapi).toBe('3.0.0')
    expect(spec.info.title).toBe('Hono Kiln API')
  })

  it('serves the Swagger UI at /docs', async () => {
    const response = await app.request('/docs')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')
    const html = await response.text()
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('<head>')
    expect(html).toContain('<title>API Documentation</title>')
    expect(html).toContain('<meta charset="utf-8" />')
    expect(html).toContain('<body>')
    expect(html).toContain('swagger')
  })

  it('serves the Swagger UI with different locale based on Accept-Language header', async () => {
    const response = await app.request('/docs', {
      headers: {
        'Accept-Language': 'fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7, *;q=0.5'
      }
    })
    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).toContain('<html lang="fr-CH">')
  })

  it('serves the Swagger UI with DEFAULT_LOCALE environment configuration when no header is present', async () => {
    // We can test this by setting c.env.DEFAULT_LOCALE, wait how does hono env() work in tests?
    // Let's set process.env.DEFAULT_LOCALE just in case it reads from process.env
    const prev = process.env.DEFAULT_LOCALE
    process.env.DEFAULT_LOCALE = 'es'
    const response = await app.request('/docs')
    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).toContain('<html lang="es">')
    process.env.DEFAULT_LOCALE = prev
  })
})
