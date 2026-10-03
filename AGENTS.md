# Personal Hub - Agent Instructions

Read the relevant documentation in /docs before making architectural changes.

## Core rules

- Follow docs/development-style.md.
- Follow docs/architecture.md.
- Respect decisions already recorded in docs/decisions.md.
- Do not expand the project beyond docs/roadmap.md unless requested.

## Before editing

1. Inspect only the files relevant to the current task.
2. Understand the existing implementation.
3. Make the smallest necessary change.

## During implementation

- Do not refactor unrelated code.
- Do not install packages unless necessary.
- Do not change architecture without being asked.
- Prefer readable code over clever code.
- Keep frontend and backend responsibilities separate.

## After implementation

- Run relevant tests or build checks.
- Report which files were changed.
- Report any issues encountered.

## Progress reporting

For tasks involving multiple implementation steps:

- Give a short progress report after initial inspection.
- Give another report after the main implementation.
- Finish with a concise summary of changed files and verification results.
- Do not report every individual file operation.