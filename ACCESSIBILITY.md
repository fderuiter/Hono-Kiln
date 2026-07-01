# Accessibility Compliance

## Target Standards
This project targets formal compliance with **WCAG 2.1 AA** for all user-facing interfaces, including API documentation and CLI tools.

## Principles
1. **Automated Audits**: We run pa11y-ci in our CI pipeline against PR preview deployments to catch DOM-level regressions.
2. **Centralized Utilities**: We use a shared utility library to implement common accessibility patterns (e.g., skip-links, ARIA live regions).
3. **Inclusive CLI**: Terminal interactions provide standard auditory feedback for errors, which can be toggled by users.

## Scope
Scans cover the DOM and structure. Manual review is necessary for more complex accessibility issues, such as detailed keyboard focus traps and specific color contrast ratios.
