# Horreum MCP Server v0.1.0

**First Public Release** 🎉

The Horreum MCP Server is a **Source MCP adapter** that provides standardized
access to [Horreum](https://horreum.hyperfoil.io/) performance testing
databases for Domain-specific MCP servers and AI assistants.

## 🌟 Highlights

### Complete MCP Tool Coverage

- **Read Operations**: Tests, schemas, runs, datasets, label values
- **Write Operations**: Run uploads with full metadata support
- **Advanced Filtering**: By test, schema, time ranges, and label values
- **Natural Language Time Queries**: "last week", "yesterday", "last 30 days"

### LLM-Powered Natural Language Interface 🤖

Ask questions in plain English:

```bash
curl -X POST "http://localhost:3000/api/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me CPU usage for test XYZ where transaction rate is 2000"}'
```

Supports OpenAI, Anthropic, Google Gemini, and Azure OpenAI.

### Multiple Transport Modes

- **STDIO**: Direct integration with AI clients (Claude Desktop, Cline, etc.)
- **HTTP/SSE**: Remote connections for distributed deployments
- **REST API**: Server-to-server integration (`/api/tools/*`)

### Production-Ready

- **Multi-Architecture Containers**: amd64 and arm64 support
- **Observability**: Structured logging, correlation IDs, Prometheus metrics
- **Enterprise Support**: Custom CA certificates, SSL/TLS configuration
- **Kubernetes/OpenShift**: Complete deployment manifests

### Source MCP Contract Compliance

Designed as a **Source MCP** for Domain MCP integration:

```
AI Assistant → Domain MCP → Source MCP (Horreum) → Horreum DB
```

## 📦 Installation

### Using Pre-built Container (Recommended)

**Docker/Podman:**

```bash
podman run -d \
  -e HORREUM_BASE_URL=https://horreum.example.com \
  -e HORREUM_TOKEN=your-token \
  -e HTTP_AUTH_TOKEN=mcp-token \
  -p 3000:3000 \
  ghcr.io/dustinblack/horreum-mcp:0.1.0
```

**Kubernetes/OpenShift:**

```bash
kubectl apply -f https://raw.githubusercontent.com/dustinblack/horreum-mcp/v0.1.0/docs/deployment/kubernetes-deployment.md
```

### From Source

```bash
git clone https://github.com/dustinblack/horreum-mcp.git
cd horreum-mcp
git checkout v0.1.0
npm install
npm run build
npm start
```

## 🚀 Quick Start

### Configure Environment

```bash
export HORREUM_BASE_URL=https://horreum.example.com
export HORREUM_TOKEN=your-horreum-token
export HTTP_AUTH_TOKEN=your-mcp-token
export HTTP_PORT=3000
```

### Start the Server

```bash
npm start
```

### Test the Connection

```bash
# Health check
curl http://localhost:3000/health

# List tests
curl -X POST http://localhost:3000/api/tools/list_tests \
  -H "Authorization: Bearer your-mcp-token" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'

# Natural language query (requires LLM configuration)
curl -X POST http://localhost:3000/api/query \
  -H "Authorization: Bearer your-mcp-token" \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me tests that failed in the last week"}'
```

## 🔧 Configuration

### Horreum Connection

| Variable              | Required | Description                | Default |
| --------------------- | -------- | -------------------------- | ------- |
| `HORREUM_BASE_URL`    | Yes      | Horreum server URL         | -       |
| `HORREUM_TOKEN`       | No       | Authentication token       | -       |
| `HORREUM_TLS_VERIFY`  | No       | Verify SSL certificates    | `true`  |
| `HORREUM_TLS_CA_FILE` | No       | Custom CA certificate path | -       |

### HTTP Server

| Variable          | Required | Description           | Default |
| ----------------- | -------- | --------------------- | ------- |
| `HTTP_PORT`       | No       | Server port           | `3000`  |
| `HTTP_AUTH_TOKEN` | No       | Bearer token for auth | -       |

### LLM (Natural Language Queries)

| Variable              | Required | Description             | Example                |
| --------------------- | -------- | ----------------------- | ---------------------- |
| `LLM_PROVIDER`        | No       | LLM provider            | `gemini`               |
| `LLM_API_KEY`         | No       | LLM API key             | -                      |
| `LLM_MODEL`           | No       | Model identifier        | `gemini-2.0-flash-exp` |
| `LLM_GEMINI_ENDPOINT` | No       | Custom Gemini endpoint  | -                      |
| `LLM_GEMINI_PROJECT`  | No       | Google Cloud Project ID | -                      |

### Observability

| Variable    | Required | Description   | Default |
| ----------- | -------- | ------------- | ------- |
| `LOG_LEVEL` | No       | Logging level | `info`  |

Complete configuration guide:
[docs/user-guide/configuration.md](https://github.com/dustinblack/horreum-mcp/blob/v0.1.0/docs/user-guide/configuration.md)

## 📚 Documentation

- **[Quick Start Guide](https://github.com/dustinblack/horreum-mcp/blob/v0.1.0/README.md)**
- **[Configuration Guide](https://github.com/dustinblack/horreum-mcp/blob/v0.1.0/docs/user-guide/configuration.md)**
- **[Kubernetes Deployment](https://github.com/dustinblack/horreum-mcp/blob/v0.1.0/docs/deployment/kubernetes-deployment.md)**
- **[Domain MCP Integration](https://github.com/dustinblack/horreum-mcp/blob/v0.1.0/docs/architecture/domain-mcp-integration.md)**
- **[Natural Language Queries](https://github.com/dustinblack/horreum-mcp/blob/v0.1.0/docs/user-guide/natural-language-queries.md)**
- **[AI Client Setup](https://github.com/dustinblack/horreum-mcp/blob/v0.1.0/docs/user-guide/ai-clients.md)**
- **[Development History](https://github.com/dustinblack/horreum-mcp/blob/v0.1.0/docs/developer/development-history.md)**

## 🔍 Available MCP Tools

### Test Management

- `list_tests` - List all tests with optional filtering
- `get_test` - Get detailed test information

### Schema Operations

- `get_schema` - Retrieve schema definition
- `list_schemas` - List all schemas

### Run Operations

- `list_runs` - List runs with filtering and pagination
- `get_run` - Get complete run information
- `get_run_data` - Get run data payload
- `get_run_metadata` - Get run metadata
- `get_run_summary` - Get run summary
- `list_runs_by_schema` - List runs by schema ID
- `get_run_count` - Count runs matching criteria
- `list_all_runs` - List all runs (admin)
- `upload_run` - Upload new test run

### Dataset Operations

- `list_datasets` - List datasets with filtering
- `get_dataset` - Get dataset information
- `get_dataset_summary` - Get dataset summary

### Label Values

- `get_run_label_values` - Get label values for a run
- `get_test_label_values` - Get aggregated label values for a test
- `get_dataset_label_values` - Get label values for a dataset

### System

- `ping` - Health check and version info

## 🎯 Use Cases

### 1. AI Assistant Integration (STDIO Mode)

Connect Claude Desktop or other AI clients directly to Horreum:

```json
{
  "mcpServers": {
    "horreum": {
      "command": "node",
      "args": ["/path/to/horreum-mcp/build/index.js"],
      "env": {
        "HORREUM_BASE_URL": "https://horreum.example.com",
        "HORREUM_TOKEN": "your-token"
      }
    }
  }
}
```

### 2. Domain MCP Integration

Build specialized performance analysis tools:

```python
# Domain MCP calls Horreum MCP
response = await horreum_adapter.get_test_label_values(
    test_name="boot-time-test",
    labels=["boot_duration", "kernel_version"],
    from_time="last week"
)
```

### 3. Natural Language Queries

Ask questions about your performance data:

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Compare CPU usage between run 12345 and run 12346"
  }'
```

### 4. CI/CD Integration

Automated performance testing workflows:

```bash
# Upload test results
curl -X POST http://localhost:3000/api/tools/upload_run \
  -H "Authorization: Bearer $TOKEN" \
  -d @test-results.json

# Query recent failures
curl -X POST http://localhost:3000/api/tools/list_runs \
  -d '{"test": "my-test", "from": "last 24 hours"}'
```

## 🔒 Security

- **Bearer Token Authentication**: Secure HTTP endpoints
- **SSL/TLS Support**: Custom CA certificates for corporate environments
- **Secret Scanning**: Pre-commit hooks prevent credential leaks
- **Container Scanning**: Trivy security scanning in CI/CD
- **Dependency Audits**: Automated npm audit checks

## 🏗️ Architecture

The Horreum MCP Server implements a **Source MCP** pattern:

```
┌─────────────────┐
│  AI Assistant   │ (Claude, ChatGPT, etc.)
└────────┬────────┘
         │
┌────────▼────────┐
│   Domain MCP    │ (Performance analysis, boot time, etc.)
└────────┬────────┘
         │
┌────────▼────────┐
│  Source MCP     │ ← This project
│   (Horreum)     │
└────────┬────────┘
         │
┌────────▼────────┐
│   Horreum DB    │
└─────────────────┘
```

This architecture enables:

- Domain experts to build specialized tools without Horreum expertise
- Multiple domains to share one Source MCP
- Flexibility to swap data sources without changing Domain MCP code

## 🐛 Known Limitations

- **Streaming Responses**: Foundation implemented, endpoint integration
  deferred to future release
- **Write Operations**: Limited to run uploads; test/schema creation not yet
  supported
- **Dataset Comparisons**: CSV export planned for Phase 13

## 📊 Technical Details

- **Language**: TypeScript
- **Runtime**: Node.js 20 LTS
- **MCP SDK**: @modelcontextprotocol/sdk v1.18.1
- **Test Coverage**: 97 passing tests
- **License**: Apache 2.0
- **Container Registry**: ghcr.io/dustinblack/horreum-mcp
- **Supported Architectures**: linux/amd64, linux/arm64

## 🤝 API Compatibility

- **Horreum 0.19**: Full support for latest Horreum API
- **Source MCP Contract**: v1.0.0 compliance
- **MCP Protocol**: Compatible with all standard MCP clients

## 🙏 Acknowledgments

- Built on the [Model Context Protocol](https://modelcontextprotocol.io/)
- Integrates with [Horreum](https://horreum.hyperfoil.io/) from the Hyperfoil
  project
- AI-assisted development by Claude Sonnet 4.5, GPT-5, Gemini 2.5 Pro

## 📝 License

Apache License 2.0 - See [LICENSE](LICENSE) for details

## 🔗 Links

- **Repository**: https://github.com/dustinblack/horreum-mcp
- **Issues**: https://github.com/dustinblack/horreum-mcp/issues
- **Container Images**: https://github.com/dustinblack/horreum-mcp/pkgs/container/horreum-mcp
- **Horreum Project**: https://horreum.hyperfoil.io/
- **Model Context Protocol**: https://modelcontextprotocol.io/

---

**Full Changelog**: [CHANGELOG.md](CHANGELOG.md)
