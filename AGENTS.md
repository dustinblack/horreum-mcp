- Full Horreum docs are at: https://horreum.hyperfoil.io/docs/
- The Horreum API spec is at: https://horreum.hyperfoil.io/openapi/
- Horrem code is part of the Hyperfoil project at: https://github.com/Hyperfoil
- All git commits should include the tag "AI-assisted-by: <AI agent model(s)>" when any AI agents were used for the development work.

## Horreum/Hyperfoil Development Standards

To ensure our work aligns with the Hyperfoil project for future integration, this project will adopt the following development standards based on the official Horreum repository.

### Contribution Workflow
- **Fork, Branch, PR:** All contributions should follow the fork, branch, and pull request model.
- **Stay Updated:** Keep your local `master` branch synchronized with the upstream repository. Before starting new work, rebase your feature branches on the latest `master`.

### Core Technology Stack
- **Java:** The project uses Java 17 (Quarkus 3 baseline).
- **Build Tool:** Maven will be used for dependency management and building the project.
- **Framework:** Quarkus 3.x

### Licensing
- **Apache 2.0:** All code contributed to this project will be licensed under the Apache License, Version 2.0.

### Code Style & Quality
- **Code Formatting:** The project enforces a strict code style using the Eclipse code formatter. The configuration files are located in the `config/` directory of the official Horreum repository.
- **Automatic Formatting:** Running `mvn install` or `mvn process-sources` will automatically format the code according to the project's style. All code should be formatted before being submitted in a pull request.
