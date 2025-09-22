- Full Horreum docs are at: https://horreum.hyperfoil.io/docs/
- The Horreum API spec is at: https://horreum.hyperfoil.io/openapi/
- Horrem code is part of the Hyperfoil project at: https://github.com/Hyperfoil
- All git commits should include the tag "AI-assisted-by: <AI agent model(s)>" when any AI agents were used for the development work.
- All git commit messages should be thorough and detailed.
- All code should be well-documented.
- The README.md and any other documentation files should be kept up-to-date with changes.
- Try to maintain a line length of 88 characters max in all code and markdown files.
- When testing the 'horreum-mcp' project, use the local '.env' file for configuration and real-world testing scenarios.
- External dependencies should be limited to confirmed high-quality and actively-maintained projects.

## Horreum/Hyperfoil Development Standards

To ensure our work aligns with the Hyperfoil project for future integration, this project will adopt the following development standards based on the official Horreum repository.

### Contribution Workflow

- **Fork, Branch, PR:** All contributions should follow the fork, branch, and pull request model.
- **Stay Updated:** Keep your local `master` branch synchronized with the upstream repository. Before starting new work, rebase your feature branches on the latest `master`.

### Core Technology Stack

- **Language:** TypeScript
- **Runtime:** Node.js (v20 or higher)
- **Build Tool:** npm and the TypeScript Compiler (`tsc`)

### Licensing

- **Apache 2.0:** All code contributed to this project will be licensed under the
  Apache License, Version 2.0.

### Code Style & Quality

- **Code Formatting:** The project uses [Prettier](https://prettier.io/) for
  consistent code formatting. The configuration can be found in the
  `.prettierrc.json` file.
- **Linting:** ESLint with TypeScript-ESLint is used to enforce code quality and
  catch potential errors. The configuration is in `eslint.config.js`.
- **Automatic Formatting and Checks:**
  - Run `npm run format` to format all code.
  - Run `npm run check` to perform type checking and linting.
