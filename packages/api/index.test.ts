import { describe, expect, it } from 'bun:test'
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
    const html = await response.text()
    expect(html).toContain('swagger')
  })
})
