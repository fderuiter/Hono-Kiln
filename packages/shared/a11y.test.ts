import { expect, test, describe } from "bun:test";
import { swaggerA11yStyles, swaggerA11ySkipLink, SwaggerA11yPluginCode } from "./a11y";

describe("a11y utilities", () => {
  test("swaggerA11yStyles removes duplicate sr-only and skip-link styles", () => {
    // There should be only one declaration block for .sr-only and .skip-link combined
    const combinedSelectorCount = (swaggerA11yStyles.match(/\.sr-only,\s*\.skip-link\s*{/g) || []).length;
    expect(combinedSelectorCount).toBe(1);
    
    // There should be no individual .sr-only { block
    const singleSrOnlyCount = (swaggerA11yStyles.match(/\.sr-only\s*{/g) || []).length;
    expect(singleSrOnlyCount).toBe(0);
  });

  test("swaggerA11yStyles skip link focus uses absolute positioning", () => {
    // Check that .skip-link:focus has position: absolute;
    expect(swaggerA11yStyles).toContain("position: absolute;");
    const focusBlockMatch = swaggerA11yStyles.match(/\.skip-link:focus\s*{[^}]+position:\s*absolute;[^}]+}/);
    expect(focusBlockMatch).not.toBeNull();
  });

  test("SwaggerA11yPluginCode includes logic for Connection Failed (status 0)", () => {
    expect(SwaggerA11yPluginCode).toContain("'Connection Failed'");
    expect(SwaggerA11yPluginCode).toContain("res.status === 0");
  });

  test("swaggerA11ySkipLink contains correct anchor", () => {
    expect(swaggerA11ySkipLink).toContain('class="skip-link"');
    expect(swaggerA11ySkipLink).toContain('href="#swagger-ui"');
  });
});
