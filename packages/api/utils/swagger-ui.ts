/**
 * Generates an accessible HTML template for Swagger UI.
 * 
 * This overrides the default swagger-ui HTML to inject accessible skip links
 * and custom styling to ensure full accessibility compliance.
 * 
 * @param asset - The swagger UI assets containing css and js URLs
 * @param asset.css - Array of CSS asset URLs
 * @param asset.js - Array of JS asset URLs
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
        .skip-link {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }
        .skip-link:focus {
          position: static;
          width: auto;
          height: auto;
          padding: 10px;
          margin: 0;
          overflow: visible;
          clip: auto;
          white-space: normal;
          background-color: #000;
          color: #fff;
          z-index: 10000;
          text-decoration: none;
        }
        #swagger-ui[tabindex="-1"]:focus {
          outline: none;
        }
      </style>
      ${asset.css.map((url) => `<link rel="stylesheet" href="${url}" />`).join('')}
    </head>
    <body>
      <a href="#swagger-ui" class="skip-link">Skip to Content</a>
      <main>
        <div id="swagger-ui" tabindex="-1"></div>
      </main>
      ${asset.js.map((url) => `<script src="${url}" crossorigin="anonymous"></script>`).join('')}
      <script>
        window.onload = () => {
          window.ui = SwaggerUIBundle({
            dom_id: '#swagger-ui',
            url: '/openapi.json',
          })
        }
      </script>
    </body>
    </html>
  `;
}
