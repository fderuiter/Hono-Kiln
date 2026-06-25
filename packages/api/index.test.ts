import { describe, expect, it } from 'bun:test'

process.env.DATABASE_URL = 'file::memory:'
process.env.DATABASE_AUTH_TOKEN = 'test-token'

import app from './index'

describe('health routes', () => {
  it('returns welcome payload for /', async () => {
    const response = await app.request('/')
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
})
