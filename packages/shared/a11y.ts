/**
 * Accessibility utility functions and plugins.
 */

/**
 * CSS styles for the swagger-ui skip link to ensure accessibility.
 */
export const swaggerA11yStyles = `
  :root {
    --a11y-focus-color: #005fcc;
    --a11y-focus-width: 4px;
    --a11y-focus-offset: 2px;
    --a11y-focus-radius: 4px;
    --a11y-focus-animation-timing: 1s;
    --a11y-focus-animation-easing: ease-out;
    --a11y-pulse-color-start: rgba(0, 95, 204, 0.15);
    
    --a11y-skip-bg: #000;
    --a11y-skip-text: #fff;
    
    --a11y-btn-focus-success: #004d00;
    --a11y-btn-focus-primary: #003399;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --a11y-focus-color: #66b2ff;
      --a11y-pulse-color-start: rgba(102, 178, 255, 0.2);
      
      --a11y-skip-bg: #fff;
      --a11y-skip-text: #000;
      
      --a11y-btn-focus-success: #80ff80;
      --a11y-btn-focus-primary: #99ccff;
    }
  }

  .sr-only,
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
    position: absolute;
    width: auto;
    height: auto;
    padding: 10px;
    margin: 0;
    overflow: visible;
    clip: auto;
    white-space: normal;
    background-color: var(--a11y-skip-bg);
    color: var(--a11y-skip-text);
    z-index: 10000;
    text-decoration: none;
  }

  #swagger-ui:focus-visible,
  #swagger-ui :focus-visible,
  #swagger-ui input:focus-visible,
  #swagger-ui textarea:focus-visible,
  #swagger-ui select:focus-visible,
  #swagger-ui .btn:focus-visible {
    outline: var(--a11y-focus-width) solid var(--a11y-focus-color);
    outline-offset: var(--a11y-focus-offset);
    border-radius: var(--a11y-focus-radius);
    animation: focus-pulse var(--a11y-focus-animation-timing) var(--a11y-focus-animation-easing);
  }

  #swagger-ui .btn.authorize:focus-visible {
    outline-color: var(--a11y-btn-focus-success);
  }

  #swagger-ui .btn.execute:focus-visible,
  #swagger-ui .btn.try-out__btn:focus-visible {
    outline-color: var(--a11y-btn-focus-primary);
  }

  @keyframes focus-pulse {
    0% { background-color: var(--a11y-pulse-color-start); }
    100% { background-color: transparent; }
  }

  @media (prefers-reduced-motion: reduce) {
    #swagger-ui:focus-visible,
    #swagger-ui :focus-visible,
    #swagger-ui input:focus-visible,
    #swagger-ui textarea:focus-visible,
    #swagger-ui select:focus-visible,
    #swagger-ui .btn:focus-visible {
      animation: none !important;
    }
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
        liveRegion.className = 'sr-only';
        document.body.appendChild(liveRegion);

        const announce = (msg) => {
          liveRegion.textContent = '';
          setTimeout(() => { liveRegion.textContent = msg; }, 50);
        };

        let previousValidationErrors = 0;
        let debounceTimer;
        system.getStore().subscribe(() => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            const errorNodes = document.querySelectorAll('.errors-wrapper, .error, .invalid');
            const errorsCount = errorNodes.length;
            if (errorsCount > previousValidationErrors) {
              let errorMsg = 'Validation failed. Required field missing.';
              for (let i = 0; i < errorsCount; i++) {
                const text = errorNodes[i].textContent.trim();
                if (text) {
                  errorMsg = text;
                  break;
                }
              }
              announce(errorMsg);
            }
            previousValidationErrors = errorsCount;
          }, 200);
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
              if (el && res && typeof res.status !== 'undefined') {
                let statusText = res.statusText || '';
                if (!statusText) {
                    const codes = {
                      0: 'Connection Failed',
                      200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content',
                      400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found',
                      405: 'Method Not Allowed', 409: 'Conflict', 500: 'Internal Server Error'
                    };
                    statusText = codes[res.status] || '';
                }
                const msg = res.status >= 200 && res.status < 300 
                  ? \`Success: \${res.status} \${statusText}\` 
                  : \`Error: \${res.status === 0 ? statusText : res.status + ' ' + statusText}\`;
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
