import { swaggerA11yStyles, swaggerA11ySkipLink, SwaggerA11yPluginCode } from '@hono-kiln/shared'

/**
 * Generates an accessible HTML template for Swagger UI.
 * 
 * This overrides the default swagger-ui HTML to inject accessible skip links
 * and custom styling to ensure full accessibility compliance.
 * 
 * @param asset - The swagger UI assets containing css and js URLs
 * @param asset.css - Array of CSS asset URLs
 * @param asset.js - Array of JS asset URLs
 * @param locale - The locale to use for the HTML
 * @returns The manually constructed HTML string for Swagger UI
 */
export function generateSwaggerUIHtml(asset: { css: string[]; js: string[] }, locale: string = 'en'): string {
  return `
    <!DOCTYPE html>
    <html lang="${locale}">
    <head>
      <meta charset="utf-8" />
      <title>API Documentation</title>
      <style>
        ${swaggerA11yStyles}
      </style>
      ${asset.css.map((url) => `<link rel="stylesheet" href="${url}" />`).join('')}
    </head>
    <body>
      ${swaggerA11ySkipLink}
      <main>
        <div id="swagger-ui" tabindex="-1"></div>
      </main>
      ${asset.js.map((url) => `<script src="${url}" crossorigin="anonymous"></script>`).join('')}
      <script>
        window.onload = () => {
          ${SwaggerA11yPluginCode}

          window.ui = SwaggerUIBundle({
            dom_id: '#swagger-ui',
            url: '/openapi.json',
            plugins: [A11yStatusPlugin]
          })
        }
      </script>
    </body>
    </html>
  `;
}
