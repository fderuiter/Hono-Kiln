import { hc } from 'hono/client'
import type { ClientResponse } from 'hono/client'
import type { AppType } from '@hono-kiln/api/registry'
import type { Hono } from 'hono'

export const createClient = (baseUrl: string, options?: Parameters<typeof hc>[1]) => {
  return hc<AppType>(baseUrl, options)
}

export type SafeResult<TSuccess, TError = any> = 
  | [data: TSuccess, error: null]
  | [data: null, error: TError]

type InferClientResponse<T> = T extends ClientResponse<infer R, any, any> ? R : any

export type SafeClient<T> = T extends Function
  ? T
  : {
      [K in keyof T]: K extends `$${string}`
        ? T[K] extends (...args: infer Args) => Promise<infer Res>
          ? (...args: Args) => Promise<SafeResult<InferClientResponse<Res>>>
          : T[K]
        : SafeClient<T[K]>
    }

export type RequestInterceptor = (init: RequestInit) => RequestInit | Promise<RequestInit>

export function injectHeader(init: RequestInit, name: string, value: string): RequestInit {
  const headers = new Headers(init.headers || {})
  headers.set(name, value)
  return { ...init, headers }
}

export type SafeClientOptions = Parameters<typeof hc>[1] & {
  interceptors?: RequestInterceptor[]
}

export const createSafeClient = <T extends Hono<any, any, any>>(
  baseUrl: string,
  options?: SafeClientOptions
): SafeClient<typeof hc<T>> => {
  const { interceptors = [], fetch: customFetch = fetch, ...hcOptions } = options || {}

  const interceptedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let currentInit = init || {}
    for (const interceptor of interceptors) {
      currentInit = await interceptor(currentInit)
    }
    return customFetch(input, currentInit)
  }

  const client = hc<T>(baseUrl, {
    ...hcOptions,
    fetch: interceptedFetch,
  })

  const createProxy = (target: any): any => {
    if (typeof target !== 'function' && typeof target !== 'object' && target !== null) {
      return target
    }

    return new Proxy(target, {
      get(obj, prop) {
        const value = Reflect.get(obj, prop)

        if (typeof prop === 'string' && prop.startsWith('$')) {
          if (typeof value === 'function') {
            return async (...args: any[]) => {
              try {
                const response = await Reflect.apply(value, obj, args)
                if (response && typeof response === 'object' && 'ok' in response) {
                  const res = response as Response
                  if (res.ok) {
                    let data: any = null
                    if (res.status !== 204) {
                      const contentType = res.headers?.get('content-type')
                      if (contentType && contentType.includes('application/json')) {
                        data = await res.json()
                      } else {
                        data = await res.text()
                      }
                    }
                    return [data, null]
                  } else {
                    let errorPayload: any
                    const contentType = res.headers?.get('content-type')
                    if (contentType && contentType.includes('application/json')) {
                      try {
                        errorPayload = await res.json()
                      } catch (e) {
                        errorPayload = { error: await res.text() }
                      }
                    } else {
                      errorPayload = { error: await res.text() }
                    }
                    return [null, errorPayload]
                  }
                }
                return [response, null]
              } catch (err: any) {
                return [null, { error: err.message || 'Network error' }]
              }
            }
          }
        }

        if ((typeof value === 'object' || typeof value === 'function') && value !== null) {
          return createProxy(value)
        }

        return value
      },
      apply(target, thisArg, argArray) {
        const value = Reflect.apply(target, thisArg, argArray)
        if ((typeof value === 'object' || typeof value === 'function') && value !== null) {
          return createProxy(value)
        }
        return value
      }
    })
  }

  return createProxy(client) as SafeClient<typeof hc<T>>
}

export type { AppType }
