# Accessibility Compliance

## Target Standards
This project targets formal compliance with **WCAG 2.1 AA** for all user-facing interfaces, including API documentation and CLI tools.

## Principles
1. **Automated Audits**: We run pa11y-ci in our CI pipeline against PR preview deployments to catch DOM-level regressions.
2. **Centralized Utilities**: We use a shared utility library to implement common accessibility patterns (e.g., skip-links, ARIA live regions).
3. **Inclusive CLI**: Terminal interactions provide standard auditory feedback for errors, which can be toggled by users.

## CLI Auditory Feedback
The Kiln CLI provides auditory feedback (using the ASCII bell character) during interactive module generation to alert users when their input matches generic placeholders. This is designed to assist users by drawing attention to potential input errors without requiring visual focus.

If this auditory signal is disruptive or conflicts with screen reader feedback, it can be disabled by setting the `AUDIBLE_BELL` environment variable to `'false'` (e.g., `AUDIBLE_BELL=false bun kiln generate module <name>`). It defaults to enabled.

## Scope
Scans cover the DOM and structure. Manual review is necessary for more complex accessibility issues, such as detailed keyboard focus traps and specific color contrast ratios.
