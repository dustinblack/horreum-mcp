# Architecture Documentation

Technical architecture and design documentation for Horreum MCP.

## System Architecture

Horreum MCP is a Model Context Protocol server that provides AI assistants with
access to Horreum performance testing data.

```mermaid
graph TB
    subgraph "AI Clients"
        Claude["Claude Desktop"]
        Cline["Cline IDE Extension"]
        CustomClient["Custom Client"]
    end

    subgraph "Horreum MCP Server"
        MCPCore["MCP Core<br/>(SDK)"]
        HTTPTransport["HTTP Transport<br/>(Express)"]
        STDIOTransport["STDIO Transport<br/>(default)"]
        Tools["MCP Tools<br/>(ping, list_tests,<br/>list_runs, etc.)"]
        Resources["MCP Resources<br/>(tests, runs,<br/>schemas)"]
        HorreumClient["Horreum Client<br/>(Generated)"]
        Transform["Transform Layer<br/>(Source MCP<br/>Contract)"]
    end

    subgraph "External Systems"
        Horreum["Horreum<br/>(Performance DB)"]
    end

    Claude -->|"stdio"| STDIOTransport
    Cline -->|"stdio"| STDIOTransport
    CustomClient -->|"HTTP + Bearer"| HTTPTransport

    STDIOTransport --> MCPCore
    HTTPTransport --> MCPCore
    MCPCore --> Tools
    MCPCore --> Resources
    Tools --> Transform
    Resources --> Transform
    Transform --> HorreumClient
    HorreumClient -->|"REST API"| Horreum

    style Claude fill:#e1f5ff,stroke:#01579b,stroke-width:2px,color:#000
    style Cline fill:#e1f5ff,stroke:#01579b,stroke-width:2px,color:#000
    style CustomClient fill:#e1f5ff,stroke:#01579b,stroke-width:2px,color:#000
    style MCPCore fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px,color:#000
    style HTTPTransport fill:#fff9c4,stroke:#f57f17,stroke-width:2px,color:#000
    style STDIOTransport fill:#fff9c4,stroke:#f57f17,stroke-width:2px,color:#000
    style Tools fill:#ffe0b2,stroke:#e65100,stroke-width:2px,color:#000
    style Resources fill:#ffe0b2,stroke:#e65100,stroke-width:2px,color:#000
    style Transform fill:#f3e5f5,stroke:#4a148c,stroke-width:2px,color:#000
    style HorreumClient fill:#f3e5f5,stroke:#4a148c,stroke-width:2px,color:#000
    style Horreum fill:#ffccbc,stroke:#bf360c,stroke-width:2px,color:#000
```

### Key Components

- **MCP Core**: Model Context Protocol SDK implementation
- **Transport Layers**: Support both stdio (default) and HTTP modes
- **Tools & Resources**: Exposed capabilities for AI agents
- **Transform Layer**: Converts Horreum responses to Source MCP Contract format
- **Horreum Client**: Generated TypeScript client from OpenAPI spec

### Transport Modes

1. **stdio** - Default mode for local AI assistants (Claude Desktop, Cline)
2. **HTTP** - Server mode for remote clients and server-to-server integration

## Primary Purpose

**Horreum MCP is a Source MCP adapter** designed to provide standardized data
access for Domain-specific MCP servers. See the [Domain MCP Integration
Guide](domain-mcp-integration.md) to understand how to build Domain MCPs that
use Horreum MCP as a data source.

## Documents

- **[Domain MCP Integration Guide](domain-mcp-integration.md)** - **START
  HERE** - Complete guide to building Domain MCPs
- **[Source MCP Contract](source-mcp-contract.md)** - Contract specification
  and compliance

## Related Documentation

- [User Guide](../user-guide/README.md) - Features and usage (standalone mode)
- [CI/CD Workflow](../developer/ci-workflow.md) - Build and deployment pipeline
- [Deployment Guide](../deployment/README.md) - Deployment architectures
