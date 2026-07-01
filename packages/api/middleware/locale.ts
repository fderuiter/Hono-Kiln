import { createMiddleware } from 'hono/factory'
import { env } from 'hono/adapter'

declare module 'hono' {
  interface ContextVariableMap {
    locale: string
  }
}

type EnvBindings = {
  DEFAULT_LOCALE?: string
}

export const localeMiddleware = createMiddleware(async (c, next) => {
  const { DEFAULT_LOCALE } = env<EnvBindings>(c)
  
  let locale = 'en'
  
  const acceptLanguage = c.req.header('Accept-Language')
  if (acceptLanguage) {
    // Basic parsing, e.g., "fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7, *;q=0.5"
    // Just get the first language code
    const firstLang = acceptLanguage.split(',')[0].split(';')[0].trim()
    if (firstLang) {
      locale = firstLang
    }
  } else if (DEFAULT_LOCALE) {
    locale = DEFAULT_LOCALE
  }
  
  c.set('locale', locale)
  
  await next()
})
