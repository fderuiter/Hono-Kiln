import { hc } from 'hono/client'
import type { AppType } from '@hono-kiln/api/registry'

export const createClient = (baseUrl: string, options?: Parameters<typeof hc>[1]) => {
  return hc<AppType>(baseUrl, options)
}

export type { AppType }
