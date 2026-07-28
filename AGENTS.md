# AGENTS.md

## Product

This repository contains a digital child health diary for parents and caregivers.

The application currently includes:

- child profiles
- temperature tracking and fever charts
- medication inventory and administration history
- reminders and night alarms
- pediatrician contacts and appointments
- preventive examination schedules
- authentication and subscriptions
- family sharing
- responsive mobile and web interfaces

The product documents user-entered health information. It does not diagnose conditions, prescribe medication, calculate medical dosages, or replace professional medical care.

## Working principles

1. Inspect the existing implementation before changing code.
2. Reuse the existing architecture, components, naming conventions, validation system, database access layer and design system.
3. Do not introduce a new framework, state-management library, UI library or database abstraction unless technically necessary.
4. Do not perform unrelated refactors, formatting changes, renames or dependency upgrades.
5. Implement only the requested ticket. Do not begin later roadmap items.
6. Prefer small, reviewable changes over broad rewrites.
7. Preserve existing functionality and user data.
8. Use existing utilities and components before creating new ones.
9. Do not duplicate business logic between frontend and backend.
10. Enforce permissions on the server. Hiding a control in the UI is not authorization.

## Repository exploration

At the beginning of a task:

1. Read this file.
2. Read "docs/CODEX_CONTEXT.md" if it exists.
3. Inspect the package manifest and only the directories relevant to the requested task.
4. Use targeted search such as "rg" instead of reading the entire repository.
5. Identify an existing implementation pattern that can be reused.
6. Do not repeatedly inspect files already understood unless they changed.

For complex tasks, create a concise implementation plan with no more than eight steps and then proceed with implementation.

Do not stop after producing a plan unless the user explicitly requested planning only.

## Medical safety boundaries

The application must never:

- diagnose an illness
- recommend a medication
- calculate or recommend a dosage
- tell a parent that medical care is unnecessary
- classify a situation as medically harmless
- silently alter a user-entered medication plan
- present generated text as medical advice

Medication intervals, amounts and plans must originate from explicit user input or stored clinician instructions.

Warnings may inform users about recorded conflicts or missing information, but must not make treatment decisions.

Emergency information must remain accessible without a paid subscription.

Use neutral wording such as:

- “The recorded interval may not yet have elapsed.”
- “Review the stored medication plan before continuing.”
- “This information does not replace medical assessment.”

Do not use wording such as:

- “It is safe to give another dose.”
- “Your child does not need a doctor.”
- “This symptom is harmless.”

## Health-data requirements

Treat all child, symptom, medication, appointment and caregiver information as sensitive data.

Required practices:

- no sensitive health information in application logs
- no medication names, symptoms, notes or child names in analytics events
- no secrets or tokens in source code
- server-side authorization for every child-related operation
- family and child scope validation on every read and write
- minimal API responses
- explicit validation of all externally supplied data
- rate limiting for authentication and invitation endpoints
- expiring, single-use invitation and sharing tokens
- audit entries for security-relevant actions
- safe error messages that do not expose account existence or internal details

Never rely exclusively on client-provided IDs for authorization.

## Data and migrations

When changing the database:

- inspect the existing schema and migration conventions first
- prefer additive and backward-compatible migrations
- preserve existing records
- use nullable transitional fields when required
- add indexes for new foreign keys and frequent queries
- add uniqueness constraints where they enforce real invariants
- define deletion behavior explicitly
- avoid destructive migrations unless the ticket explicitly requires one
- provide a safe rollback strategy where the repository supports one

Timestamps must be timezone-safe.

Store canonical timestamps consistently according to the existing architecture and format them in the user’s locale at the presentation layer.

Operations that may be retried, including offline synchronization and medication submissions, must support idempotency.

## User experience

The application is primarily used by stressed or tired parents, often at night.

Therefore:

- common actions should require as few steps as possible
- touch targets must be mobile-friendly
- loading, empty, offline and error states must be handled
- destructive actions require confirmation
- successful health entries require clear confirmation
- prevent accidental duplicate submissions
- maintain accessibility labels and keyboard usability
- maintain responsive web behavior
- respect the existing visual language
- avoid unnecessary redesigns

All visible German text must be natural and concise.

Do not expose technical terminology to users.

## Tests and validation

For every task:

1. Add or update tests for new business rules.
2. Test authorization for protected data.
3. Test important validation and error cases.
4. Run the narrowest relevant test, type-check and lint commands first.
5. Run wider checks only when shared or cross-cutting code changed.
6. Review the resulting diff for regressions and unrelated edits.
7. Do not claim that a check passed unless it was actually executed.

Avoid changing snapshots unrelated to the ticket.

Do not rewrite large test suites merely to make them pass.

## Completion criteria

A task is complete only when:

- requested behavior is implemented end to end
- server-side rules are enforced
- existing behavior remains functional
- database changes include migrations
- loading, empty and error states exist
- relevant tests pass
- no unrelated code was changed
- no medical safety boundary was violated

## Final response format

Keep the final response concise.

Report only:

1. what was implemented
2. important files changed
3. migrations or setup steps
4. checks that were actually run
5. remaining limitations or risks

Do not provide a long tutorial or repeat the original requirements.
