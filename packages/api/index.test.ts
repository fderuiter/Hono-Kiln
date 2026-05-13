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
