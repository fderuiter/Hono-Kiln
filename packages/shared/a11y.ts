/**
 * Accessibility utility functions and plugins.
 */

/**
 * CSS styles for the swagger-ui skip link to ensure accessibility.
 */
export const swaggerA11yStyles = `
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
`;

/**
 * HTML snippet for the skip link used in swagger-ui to improve accessibility for keyboard and screen reader users.
 */
export const swaggerA11ySkipLink = `<a href="#swagger-ui" class="skip-link">Skip to Content</a>`;

/**
 * JavaScript code for a Swagger UI plugin that adds live region announcements for requests and validations, improving screen reader experience.
 */
export const SwaggerA11yPluginCode = `
  const A11yStatusPlugin = function(system) {
    return {
      afterLoad: function(system) {
        const liveRegion = document.createElement('div');
        liveRegion.id = 'a11y-status-message';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'skip-link';
        document.body.appendChild(liveRegion);

        const announce = (msg) => {
          liveRegion.textContent = '';
          setTimeout(() => { liveRegion.textContent = msg; }, 50);
        };

        let previousValidationErrors = 0;
        system.getStore().subscribe(() => {
          setTimeout(() => {
            const errors = document.querySelectorAll('.errors-wrapper, .error, .invalid').length;
            if (errors > previousValidationErrors) {
              announce('Validation failed. Required field missing.');
            }
            previousValidationErrors = errors;
          }, 100);
        });
      },
      statePlugins: {
        spec: {
          wrapActions: {
            executeRequest: (oriAction, system) => (req) => {
              const el = document.getElementById('a11y-status-message');
              if (el) {
                el.textContent = '';
                setTimeout(() => { el.textContent = 'Executing request...'; }, 50);
              }
              return oriAction(req);
            },
            setResponse: (oriAction, system) => (path, method, res) => {
              const el = document.getElementById('a11y-status-message');
              if (el && res && res.status) {
                let statusText = res.statusText || '';
                if (!statusText) {
                    const codes = {
                      200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content',
                      400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found',
                      405: 'Method Not Allowed', 409: 'Conflict', 500: 'Internal Server Error'
                    };
                    statusText = codes[res.status] || '';
                }
                const msg = res.status >= 200 && res.status < 300 
                  ? \`Success: \${res.status} \${statusText}\` 
                  : \`Error: \${res.status} \${statusText}\`;
                el.textContent = '';
                setTimeout(() => { el.textContent = msg; }, 50);
              }
              return oriAction(path, method, res);
            }
          }
        }
      }
    };
  };
`;
