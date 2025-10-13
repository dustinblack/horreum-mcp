# Horreum MCP Documentation

Complete documentation for the Horreum Model Context Protocol Server.

## Getting Started

**Building a Domain MCP?** Start with the [Domain MCP Integration
Guide](architecture/domain-mcp-integration.md) - a complete guide to building
specialized AI assistants using Horreum MCP as a data source.

**Using Horreum MCP standalone?** See the [User Guide](user-guide/README.md)
for features and configuration.

## Documentation Structure

### For Users

- **[User Guide](user-guide/README.md)** - Complete user documentation
  - [Label Values Filtering](user-guide/filtering.md)
  - [Time Range Queries](user-guide/time-ranges.md)
  - [Observability](user-guide/observability.md)

### For Developers

- **[Developer Guide](developer/README.md)** - Contributing and development
  - [CI Security Scanning](developer/ci-security.md)
  - [CI Workflow Architecture](developer/ci-workflow.md)

### For Operations

- **[Deployment Guide](deployment/README.md)** - Deployment documentation
  - [Kubernetes/OpenShift](deployment/kubernetes-deployment.md)
  - [SSL/TLS Configuration](deployment/ssl-tls.md)

### Architecture & Troubleshooting

- **[Architecture](architecture/README.md)** - Technical architecture
  - **[Domain MCP Integration](architecture/domain-mcp-integration.md)** - Build
    Domain MCPs ⭐
  - [Source MCP Contract](architecture/source-mcp-contract.md)
- **[Troubleshooting](troubleshooting/README.md)** - Issue resolution
  - [Horreum API Bugs](troubleshooting/horreum-bugs.md)
  - [Pagination Issues](troubleshooting/pagination-issues.md)

## Quick Reference

### Standard Configuration

All examples in this documentation use consistent defaults:

- **Horreum URL**: `https://horreum.example.com`
- **HTTP Port**: `3000`
- **Test Names**: `performance-test`, `boot-time-test`
- **Tokens**: Shown as `horreum_***` or `REDACTED`

### Getting Help

- 📖 [Main README](../README.md) - Project overview
- 🐛 [Issue Tracker](https://github.com/Hyperfoil/horreum-mcp/issues)
- 💬 [Discussions](https://github.com/Hyperfoil/horreum-mcp/discussions)
- 📚 [Horreum Docs](https://horreum.hyperfoil.io/docs/)
