import { hc } from 'hono/client'
import type { ClientResponse } from 'hono/client'
import type { AppType } from '@hono-kiln/api/registry'
import type { Hono } from 'hono'

/**
 * Creates a standard Hono RPC client.
 *
 * @deprecated Use `createSafeClient` instead. This standard client is deprecated and will be removed in a future release.
 *
 * @param baseUrl - The base URL of the target API service.
 * @param options - Optional client configurations (from standard Hono client option parameters).
 * @returns A standard Hono RPC client instance bound to `AppType`.
 * @example
 * ```typescript
 * import { createClient } from '@hono-kiln/sdk'
 * 
 * const client = createClient('https://api.example.com')
 * const res = await client.users.$get()
 * ```
 */
export const createClient = (baseUrl: string, options?: Parameters<typeof hc>[1]) => {
  return hc<AppType>(baseUrl, options)
}

/**
 * Go/Rust-style tuple type representing either a successful operation `[data, null]` or a failed operation `[null, error]`.
 *
 * @template TSuccess - Type of successful data payload.
 * @template TError - Type of error payload.
 * @example
 * ```typescript
 * const [data, error] = await mySafeApiCall()
 * if (error) {
 *   console.error("Failed:", error)
 *   return
 * }
 * console.log("Success:", data)
 * ```
 */
export type SafeResult<TSuccess, TError = any> = 
  | [data: TSuccess, error: null]
  | [data: null, error: TError]

type InferClientResponse<T> = T extends ClientResponse<infer R, any, any> ? R : any

/**
 * A recursive mapped type that wraps standard Hono RPC methods prefixed with `$` to return a `Promise` wrapping a `SafeResult` tuple instead of throwing exceptions.
 *
 * @template T - The base client type to transform.
 */
export type SafeClient<T> = T extends Function
  ? T
  : {
      [K in keyof T]: K extends `$${string}`
        ? T[K] extends (...args: infer Args) => Promise<infer Res>
          ? (...args: Args) => Promise<SafeResult<InferClientResponse<Res>>>
          : T[K]
        : SafeClient<T[K]>
    }

/**
 * Interceptor function definition called prior to requests, allowing request modification (such as injecting custom headers).
 *
 * @param init - The initial request configuration object.
 * @returns The modified `RequestInit` configuration object (or a promise resolving to it).
 * @example
 * ```typescript
 * const myInterceptor: RequestInterceptor = (init) => {
 *   return injectHeader(init, 'Authorization', `Bearer ${myToken}`)
 * }
 * ```
 */
export type RequestInterceptor = (init: RequestInit) => RequestInit | Promise<RequestInit>

/**
 * Clones request configuration options and safely adds or updates an HTTP header.
 *
 * @param init - The request configuration object.
 * @param name - The HTTP header name (e.g. `Authorization`).
 * @param value - The HTTP header value.
 * @returns A new request configuration object with the header added/updated.
 * @example
 * ```typescript
 * const modifiedRequest = injectHeader(originalRequest, 'X-Custom-Header', 'my-value')
 * ```
 */
export function injectHeader(init: RequestInit, name: string, value: string): RequestInit {
  const headers = new Headers(init.headers || {})
  headers.set(name, value)
  return { ...init, headers }
}

/**
 * Client options extending Hono's client options with an array of request interceptors.
 *
 * @example
 * ```typescript
 * const options: SafeClientOptions = {
 *   interceptors: [
 *     (init) => injectHeader(init, 'Authorization', 'Bearer token')
 *   ]
 * }
 * ```
 */
export type SafeClientOptions = Parameters<typeof hc>[1] & {
  interceptors?: RequestInterceptor[]
}

/**
 * The main SDK client factory that returns a proxy-based safe client wrapper that executes interceptors and processes network/API errors into safe Go-style tuples.
 *
 * @template T - Hono application type.
 * @param baseUrl - The base URL of the target API service.
 * @param options - Safe client configuration options including optional interceptors.
 * @returns A proxy-based safe client instance where RPC calls return safe result tuples.
 * @example
 * ```typescript
 * import { createSafeClient, injectHeader } from '@hono-kiln/sdk'
 * import type { AppType } from '@hono-kiln/api/registry'
 *
 * const client = createSafeClient<AppType>('https://api.example.com', {
 *   interceptors: [
 *     (init) => injectHeader(init, 'Authorization', 'Bearer 1234')
 *   ]
 * })
 *
 * const [data, error] = await client.users.$get()
 * if (error) {
 *   console.error('Request failed:', error)
 * } else {
 *   console.log('Got users:', data)
 * }
 * ```
 */
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
                      } catch {
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

/**
 * Schema-level Hono API routing registry used for client typing.
 * This type ensures that SDK requests conform to the API's actual routes and parameter expectations.
 *
 * @deprecated Use of the raw AppType is deprecated.
 */
export type { AppType }
