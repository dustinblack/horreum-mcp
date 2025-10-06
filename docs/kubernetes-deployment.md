# Kubernetes/OpenShift Deployment Guide

This guide provides complete Kubernetes and OpenShift deployment manifests
for the Horreum MCP server in a **production container-based setup** with
persistent HTTP mode.

## Architecture Overview

The recommended production deployment uses the **Horreum MCP server as a
containerized service** with HTTP/SSE transport:

```mermaid
flowchart TB
    Client[AI Chat Client / Domain MCP]
    Ingress[Ingress/Route]

    subgraph "Kubernetes Cluster"
        subgraph "horreum-mcp Namespace"
            HorreumSvc[Horreum MCP Service<br/>Port 80]

            subgraph "Horreum MCP Deployment"
                HorreumPod1[Horreum MCP Pod 1<br/>Port 3000]
                HorreumPod2[Horreum MCP Pod 2<br/>Port 3000]
            end
        end
    end

    HorreumDB[(Horreum Instance<br/>External)]

    Client -->|HTTPS| Ingress
    Ingress -->|HTTP| HorreumSvc
    HorreumSvc --> HorreumPod1
    HorreumSvc --> HorreumPod2
    HorreumPod1 -->|REST API| HorreumDB
    HorreumPod2 -->|REST API| HorreumDB

    style Client fill:#e1f5ff,stroke:#333,stroke-width:2px,color:#000
    style HorreumPod1 fill:#fefcbf,stroke:#b7791f,stroke-width:2px,color:#000
    style HorreumPod2 fill:#fefcbf,stroke:#b7791f,stroke-width:2px,color:#000
    style HorreumDB fill:#e2e8f0,stroke:#4a5568,stroke-width:2px,color:#000
```

**Key Benefits:**

- ✅ **High Availability**: Multiple replicas with load balancing
- ✅ **HTTP/SSE Transport**: Standard Kubernetes service networking
- ✅ **Scalable**: Horizontal pod autoscaling ready
- ✅ **Secure**: Network policies, secrets management, TLS termination
- ✅ **Observable**: Health checks, logging, metrics integration
- ✅ **Multi-Architecture**: Supports AMD64 and ARM64

## Prerequisites

- Kubernetes 1.19+ or OpenShift 4.6+
- `kubectl` or `oc` CLI tool
- Access to container registry:
  - **Horreum MCP**:
    `quay.io/redhat-performance/horreum-mcp:main`
- **Horreum Instance**: An accessible Horreum performance database

## Quick Deploy

Save all manifests below to `horreum-mcp-k8s.yaml` and deploy:

```bash
kubectl apply -f horreum-mcp-k8s.yaml
```

## Platform-Specific Notes

### Kubernetes

- **External Access**: Use Kubernetes Ingress (see [Ingress
  section](#ingress-kubernetes-or-route-openshift))
- **Security Context**: Can specify custom `runAsUser`/`fsGroup` values
- **CNI**: Works with any CNI and Ingress controller (nginx, traefik, etc.)

### OpenShift

- **External Access**: Use OpenShift Routes **instead of Ingress** (see
  [Routes section](#using-openshift-routes))
- **Security Context**: **Do not specify** `runAsUser`/`fsGroup` - let
  OpenShift assign UIDs from namespace range
- **SCC**: Compatible with `restricted-v2` SCC (default)
- **CLI**: All `kubectl` commands work with `oc` CLI
- **UID Assignment**: Automatic per-namespace UID/GID ranges

## Complete Manifests

### Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: horreum-mcp
  labels:
    app.kubernetes.io/name: horreum-mcp
    app.kubernetes.io/component: mcp-server
```

### Secret for Authentication

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: horreum-mcp-secret
  namespace: horreum-mcp
type: Opaque
stringData:
  # Required: Your Horreum instance URL
  HORREUM_BASE_URL: 'https://horreum.example.com'
  # Optional: API token for authenticated Horreum access
  # If omitted, only public/anonymous data will be accessible
  HORREUM_TOKEN: 'your-horreum-api-token'
  # Required: Bearer token for securing the MCP HTTP endpoints
  HTTP_AUTH_TOKEN: 'your-secure-mcp-token-changeme'
```

### ConfigMap for Tuning (Optional)

The Horreum MCP server is configured entirely via environment variables. The
ConfigMap provides optional tuning parameters that override defaults. These
are injected as environment variables via `configMapKeyRef` in the Deployment
(no volume mount required).

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: horreum-mcp-config
  namespace: horreum-mcp
data:
  # Performance tuning
  HORREUM_RATE_LIMIT: '10'
  HORREUM_TIMEOUT: '30000'
  # Observability
  LOG_LEVEL: 'info'
  LOG_FORMAT: 'json'
  METRICS_ENABLED: 'true'
  METRICS_PORT: '9464'
  # Uncomment to disable SSL verification (testing only!)
  # HORREUM_TLS_VERIFY: "false"
```

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: horreum-mcp
  namespace: horreum-mcp
  labels:
    app: horreum-mcp
    app.kubernetes.io/name: horreum-mcp
    app.kubernetes.io/component: mcp-server
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: horreum-mcp
  template:
    metadata:
      labels:
        app: horreum-mcp
        app.kubernetes.io/name: horreum-mcp
        app.kubernetes.io/component: mcp-server
    spec:
      securityContext:
        runAsNonRoot: true
        # Note: On OpenShift, do not specify runAsUser/fsGroup
        # Let the platform assign UIDs from the namespace range
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: horreum-mcp
          image: quay.io/redhat-performance/horreum-mcp:main
          imagePullPolicy: Always
          ports:
            - containerPort: 3000
              name: http
              protocol: TCP
            - containerPort: 9464
              name: metrics
              protocol: TCP
          env:
            # HTTP mode is enabled by default in the container
            - name: HTTP_MODE_ENABLED
              value: 'true'
            - name: HTTP_PORT
              value: '3000'
            # Secrets
            - name: HORREUM_BASE_URL
              valueFrom:
                secretKeyRef:
                  name: horreum-mcp-secret
                  key: HORREUM_BASE_URL
            - name: HORREUM_TOKEN
              valueFrom:
                secretKeyRef:
                  name: horreum-mcp-secret
                  key: HORREUM_TOKEN
                  optional: true
            - name: HTTP_AUTH_TOKEN
              valueFrom:
                secretKeyRef:
                  name: horreum-mcp-secret
                  key: HTTP_AUTH_TOKEN
            # ConfigMap overrides
            - name: HORREUM_RATE_LIMIT
              valueFrom:
                configMapKeyRef:
                  name: horreum-mcp-config
                  key: HORREUM_RATE_LIMIT
                  optional: true
            - name: HORREUM_TIMEOUT
              valueFrom:
                configMapKeyRef:
                  name: horreum-mcp-config
                  key: HORREUM_TIMEOUT
                  optional: true
            - name: LOG_LEVEL
              valueFrom:
                configMapKeyRef:
                  name: horreum-mcp-config
                  key: LOG_LEVEL
                  optional: true
            - name: LOG_FORMAT
              valueFrom:
                configMapKeyRef:
                  name: horreum-mcp-config
                  key: LOG_FORMAT
                  optional: true
            - name: METRICS_ENABLED
              valueFrom:
                configMapKeyRef:
                  name: horreum-mcp-config
                  key: METRICS_ENABLED
                  optional: true
            - name: METRICS_PORT
              valueFrom:
                configMapKeyRef:
                  name: horreum-mcp-config
                  key: METRICS_PORT
                  optional: true
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
          resources:
            requests:
              memory: '128Mi'
              cpu: '100m'
            limits:
              memory: '512Mi'
              cpu: '500m'
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
            readOnlyRootFilesystem: false
            runAsNonRoot: true
            # Note: On OpenShift, do not specify runAsUser
            # The platform assigns UIDs dynamically per namespace
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: horreum-mcp-service
  namespace: horreum-mcp
  labels:
    app: horreum-mcp
    app.kubernetes.io/name: horreum-mcp
    app.kubernetes.io/component: mcp-server
spec:
  selector:
    app: horreum-mcp
  ports:
    - name: http
      port: 80
      targetPort: 3000
      protocol: TCP
    - name: metrics
      port: 9464
      targetPort: 9464
      protocol: TCP
  type: ClusterIP
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800
```

### Ingress (Kubernetes) or Route (OpenShift)

**For Kubernetes clusters**, use an Ingress for external access:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: horreum-mcp-ingress
  namespace: horreum-mcp
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    # Increase timeout for long-running MCP operations
    nginx.ingress.kubernetes.io/proxy-read-timeout: '300'
    nginx.ingress.kubernetes.io/proxy-send-timeout: '300'
spec:
  rules:
    - host: horreum-mcp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: horreum-mcp-service
                port:
                  number: 80
  # Optional TLS configuration:
  tls:
    - hosts:
        - horreum-mcp.example.com
      secretName: horreum-mcp-tls
```

**For OpenShift clusters**, use a Route instead (see [OpenShift Routes
section](#using-openshift-routes)).

### ServiceMonitor for Prometheus (Optional)

If you have Prometheus Operator installed:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: horreum-mcp-metrics
  namespace: horreum-mcp
  labels:
    app: horreum-mcp
spec:
  selector:
    matchLabels:
      app: horreum-mcp
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

## Deployment Commands

### Deploy Everything

```bash
# Apply all manifests
kubectl apply -f horreum-mcp-k8s.yaml

# Check deployment status
kubectl get pods -n horreum-mcp
kubectl get svc -n horreum-mcp

# Watch deployment progress
kubectl rollout status deployment/horreum-mcp -n horreum-mcp
```

### View Logs

```bash
# Follow logs from all pods
kubectl logs -f deployment/horreum-mcp -n horreum-mcp

# View logs from a specific pod
kubectl logs -f <pod-name> -n horreum-mcp

# View logs with structured JSON output
kubectl logs deployment/horreum-mcp -n horreum-mcp | jq .
```

### Test the Service

```bash
# Port-forward for local testing
kubectl port-forward -n horreum-mcp svc/horreum-mcp-service 3000:80

# Test health endpoint (no auth required)
curl http://localhost:3000/health
# Expected: {"status":"ok"}

# Test readiness endpoint (no auth required)
curl http://localhost:3000/ready
# Expected: {"status":"ready"}

# Test authenticated endpoint
curl -H 'Authorization: Bearer your-secure-mcp-token-changeme' \
     -H 'Content-Type: application/json' \
     -X POST http://localhost:3000/api/tools/source.describe \
     -d '{}'
# Expected: JSON with server capabilities
```

## OpenShift Specific Configuration

### Using OpenShift Routes

**Important**: OpenShift uses **Routes** instead of Kubernetes Ingress
resources for external access. Do not create an Ingress on OpenShift -
create a Route instead.

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: horreum-mcp-route
  namespace: horreum-mcp
  labels:
    app: horreum-mcp
spec:
  host: horreum-mcp.apps.cluster.example.com
  to:
    kind: Service
    name: horreum-mcp-service
    weight: 100
  port:
    targetPort: http
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
  wildcardPolicy: None
```

### Security Context Constraints

The deployment is compatible with OpenShift's `restricted-v2` SCC. The
deployment uses `runAsNonRoot: true` but does **not** specify hardcoded
UIDs, allowing OpenShift to assign UIDs dynamically from the namespace's
allocated range (e.g., `1000940000-1000949999`).

**Important**: The container image is built with UID 10001, but OpenShift
will override this at runtime with a UID from the namespace range. The
container must support arbitrary UIDs (which the Horreum MCP image does
via proper file permissions with `chmod -R g=u`).

If you need to mount custom CA certificates:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: corporate-ca-bundle
  namespace: horreum-mcp
data:
  ca-bundle.crt: |
    -----BEGIN CERTIFICATE-----
    MIIDXTCCAkWgAwIBAgIJAKZV...
    -----END CERTIFICATE-----
---
apiVersion: apps/v1
kind: Deployment
# ... existing deployment spec ...
spec:
  template:
    spec:
      # Add initContainer to update trust store
      initContainers:
        - name: update-ca-trust
          image: quay.io/redhat-performance/horreum-mcp:main
          command:
            - /bin/bash
            - -c
            - |
              cp /etc/pki/ca-trust/source/anchors-mounted/* \
                 /etc/pki/ca-trust/source/anchors/ 2>/dev/null || true
              update-ca-trust extract
              cp -r /etc/pki/ca-trust/extracted/* /ca-trust-extracted/
          volumeMounts:
            - name: corporate-ca
              mountPath: /etc/pki/ca-trust/source/anchors-mounted
              readOnly: true
            - name: ca-trust
              mountPath: /ca-trust-extracted
          securityContext:
            runAsUser: 0
      containers:
        - name: horreum-mcp
          # ... existing container spec ...
          volumeMounts:
            - name: ca-trust
              mountPath: /etc/pki/ca-trust/extracted
              readOnly: true
      volumes:
        - name: corporate-ca
          configMap:
            name: corporate-ca-bundle
        - name: ca-trust
          emptyDir: {}
```

### OpenShift Deployment Commands

```bash
# Login to OpenShift
oc login --token=<token> --server=https://api.cluster.example.com:6443

# Create project (namespace)
oc new-project horreum-mcp

# Apply manifests
oc apply -f horreum-mcp-k8s.yaml

# Check deployment
oc get pods -n horreum-mcp
oc status -n horreum-mcp

# View route URL
oc get route horreum-mcp-route -n horreum-mcp -o jsonpath='{.spec.host}'

# Verify assigned UID (should be in namespace range)
oc get pod <pod-name> -n horreum-mcp -o jsonpath='{.spec.containers[0].securityContext}'
```

### Common OpenShift Issues

**SCC Errors about UID/GID ranges:**

If you see errors like:

```
.spec.securityContext.fsGroup: Invalid value: []int64{10001}: 10001 is not an allowed group
.containers[0].runAsUser: Invalid value: 10001: must be in the ranges: [1000940000, 1000949999]
```

**Solution**: Remove any hardcoded `runAsUser`, `fsGroup`, or `runAsGroup`
values from the Deployment. OpenShift assigns UIDs dynamically from the
namespace's allocated range. The manifests in this guide are already
configured correctly for OpenShift.

## Configuration

### Environment Variables

The deployment uses these environment variables (see
[HTTP mode configuration](../README.md#configuration) for details):

| Variable             | Required | Description                                          |
| -------------------- | -------- | ---------------------------------------------------- |
| `HORREUM_BASE_URL`   | ✅       | Base URL of your Horreum instance                    |
| `HORREUM_TOKEN`      | ⚠️       | API token (required for writes/private data)         |
| `HTTP_AUTH_TOKEN`    | ✅       | Bearer token for MCP endpoint security               |
| `HTTP_MODE_ENABLED`  | ✅       | Enable HTTP server mode (default: true in container) |
| `HTTP_PORT`          | ❌       | HTTP server port (default: 3000)                     |
| `HORREUM_RATE_LIMIT` | ❌       | Requests per second (default: 10)                    |
| `HORREUM_TIMEOUT`    | ❌       | Request timeout in ms (default: 30000)               |
| `LOG_LEVEL`          | ❌       | Logging level (default: info)                        |
| `LOG_FORMAT`         | ❌       | Log format: json or pretty (default: json)           |
| `METRICS_ENABLED`    | ❌       | Enable Prometheus metrics (default: false)           |
| `METRICS_PORT`       | ❌       | Metrics port (default: 9464)                         |
| `HORREUM_TLS_VERIFY` | ❌       | SSL verification (default: true)                     |

### Resource Requirements

**Minimum (per pod):**

- CPU: 100m (0.1 cores)
- Memory: 128Mi

**Recommended Limits:**

- CPU: 500m (0.5 cores)
- Memory: 512Mi

Adjust based on your workload:

- Higher limits for large test result processing
- More replicas for high-availability scenarios
- Enable HPA (Horizontal Pod Autoscaler) for automatic scaling

### High Availability

The deployment includes:

- **2+ replicas** for redundancy
- **RollingUpdate strategy** for zero-downtime deployments
- **Health checks** (liveness and readiness probes)
- **Resource limits** to prevent resource exhaustion
- **Session affinity** for MCP session continuity
- **Pod disruption budgets** (recommended, see below)

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: horreum-mcp-pdb
  namespace: horreum-mcp
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: horreum-mcp
```

## Advanced Scenarios

### Using Helm

For more complex deployments, consider creating a Helm chart:

```bash
# Create Helm chart structure
helm create horreum-mcp-chart

# Customize values.yaml with deployment parameters
cat > values.yaml <<EOF
replicaCount: 2
image:
  repository: quay.io/redhat-performance/horreum-mcp
  tag: main
  pullPolicy: Always

horreum:
  baseUrl: "https://horreum.example.com"
  token: ""
  rateLimit: 10
  timeout: 30000
  tlsVerify: true

http:
  authToken: "changeme"
  port: 3000

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

metrics:
  enabled: true
  port: 9464
  serviceMonitor:
    enabled: false
EOF

# Install the chart
helm install horreum-mcp ./horreum-mcp-chart \
  --namespace horreum-mcp --create-namespace \
  -f values.yaml
```

### Using Kustomize

For environment-specific configurations:

```bash
# Directory structure
# base/
#   kustomization.yaml
#   deployment.yaml
#   service.yaml
# overlays/
#   staging/
#     kustomization.yaml
#     patches.yaml
#   production/
#     kustomization.yaml
#     patches.yaml

# Deploy staging environment
kustomize build overlays/staging | kubectl apply -f -

# Deploy production environment
kustomize build overlays/production | kubectl apply -f -
```

### Horizontal Pod Autoscaling

Enable automatic scaling based on CPU/memory:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: horreum-mcp-hpa
  namespace: horreum-mcp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: horreum-mcp
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 50
          periodSeconds: 15
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 4
          periodSeconds: 15
      selectPolicy: Max
```

### Network Policies

Restrict network access for enhanced security:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: horreum-mcp-netpol
  namespace: horreum-mcp
spec:
  podSelector:
    matchLabels:
      app: horreum-mcp
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow traffic from ingress controller
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3000
    # Allow traffic from monitoring (Prometheus)
    - from:
        - namespaceSelector:
            matchLabels:
              name: monitoring
      ports:
        - protocol: TCP
          port: 9464
  egress:
    # Allow DNS
    - to:
        - namespaceSelector:
            matchLabels:
              name: kube-system
      ports:
        - protocol: UDP
          port: 53
    # Allow access to Horreum instance
    - to:
        - podSelector: {}
      ports:
        - protocol: TCP
          port: 443
```

## Troubleshooting

### Common Issues

**Pods not starting:**

```bash
# Check pod status and events
kubectl describe pod -n horreum-mcp -l app=horreum-mcp

# View pod logs
kubectl logs -n horreum-mcp -l app=horreum-mcp --tail=100

# Check for image pull issues
kubectl get events -n horreum-mcp --sort-by='.lastTimestamp'
```

**Service not accessible:**

```bash
# Verify service endpoints
kubectl get endpoints -n horreum-mcp horreum-mcp-service

# Check service configuration
kubectl describe svc -n horreum-mcp horreum-mcp-service

# Test service from within cluster
kubectl run -it --rm debug --image=curlimages/curl --restart=Never \
  -- curl http://horreum-mcp-service.horreum-mcp.svc.cluster.local/health
```

**Configuration issues:**

```bash
# Verify secret contents
kubectl get secret -n horreum-mcp horreum-mcp-secret -o yaml

# Verify configmap contents
kubectl get configmap -n horreum-mcp horreum-mcp-config -o yaml

# Check environment variables in running pod
kubectl exec -n horreum-mcp deployment/horreum-mcp -- env | grep HORREUM
```

**Readiness probe failing:**

```bash
# Check readiness endpoint directly
kubectl exec -n horreum-mcp deployment/horreum-mcp -- \
  curl -s http://localhost:3000/ready

# View detailed probe failure logs
kubectl describe pod -n horreum-mcp -l app=horreum-mcp | grep -A 10 Readiness
```

The `/ready` and `/health` endpoints do not require authentication, making
them suitable for Kubernetes health checks.

**Connection to Horreum failing:**

```bash
# Test DNS resolution from pod
kubectl exec -n horreum-mcp deployment/horreum-mcp -- \
  nslookup horreum.example.com

# Test connectivity to Horreum
kubectl exec -n horreum-mcp deployment/horreum-mcp -- \
  curl -v -k https://horreum.example.com

# Check if SSL verification is the issue
kubectl logs -n horreum-mcp -l app=horreum-mcp | grep -i ssl
kubectl logs -n horreum-mcp -l app=horreum-mcp | grep -i certificate
```

**Performance issues:**

```bash
# Check resource usage
kubectl top pods -n horreum-mcp

# Review metrics (if enabled)
kubectl port-forward -n horreum-mcp svc/horreum-mcp-service 9464:9464
curl http://localhost:9464/metrics

# Check for rate limiting
kubectl logs -n horreum-mcp -l app=horreum-mcp | grep -i "rate limit"
```

### Health Check Endpoints

- **Liveness**: `GET /health` (no authentication required)
- **Readiness**: `GET /ready` (no authentication required)

Both should return `{"status":"ok"}` or `{"status":"ready"}` when healthy.

> **Note**: The health endpoints do not require authentication to ensure
> Kubernetes probes work correctly. Authenticated endpoints require proper
> Bearer tokens via the `Authorization` header.

### Debugging Tools

```bash
# Interactive shell in pod
kubectl exec -it -n horreum-mcp deployment/horreum-mcp -- /bin/bash

# Copy logs from pod
kubectl cp horreum-mcp/<pod-name>:/app/logs ./local-logs/

# Restart deployment
kubectl rollout restart deployment/horreum-mcp -n horreum-mcp

# Scale deployment
kubectl scale deployment/horreum-mcp -n horreum-mcp --replicas=3
```

## Connecting Domain MCP Servers

To connect specialized domain MCP servers (for performance analysis, test
automation, etc.) to your Horreum MCP server:

### HTTP Connection (Recommended for Kubernetes)

Domain MCP servers can connect to Horreum MCP via standard Kubernetes
service networking:

```json
{
  "sources": {
    "horreum-mcp-prod": {
      "type": "horreum-mcp-http",
      "endpoint": "http://horreum-mcp-service.horreum-mcp.svc.cluster.local",
      "api_key": "your-secure-mcp-token-changeme",
      "timeout_seconds": 30
    }
  }
}
```

**Advantages:**

- ✅ Simple service-to-service communication
- ✅ Standard Kubernetes networking and DNS
- ✅ Easy load balancing across replicas
- ✅ No additional process management required
- ✅ Can be deployed in separate namespaces

### Cross-Namespace Access

If your domain MCP is in a different namespace:

```yaml
# In the domain MCP namespace, use full service DNS name
apiVersion: v1
kind: ConfigMap
metadata:
  name: domain-mcp-config
  namespace: domain-mcp
data:
  config.json: |
    {
      "sources": {
        "horreum": {
          "type": "horreum-mcp-http",
          "endpoint": "http://horreum-mcp-service.horreum-mcp.svc.cluster.local",
          "api_key": "your-secure-mcp-token-changeme",
          "timeout_seconds": 30
        }
      }
    }
```

For enhanced security, create a NetworkPolicy to explicitly allow traffic
between namespaces.

## Connecting AI Chat Clients

Once your Horreum MCP server is deployed and accessible, you can connect AI
chat clients to use it.

### Using the HTTP Proxy for Kubernetes/OpenShift Deployments

AI chat clients typically expect to spawn MCP servers locally via stdio.
When your MCP server is running in Kubernetes/OpenShift, use the HTTP proxy
bridge provided with this project.

**Prerequisites:**

- Horreum MCP server deployed and accessible (via port-forward, Route, or
  Ingress)
- The `mcp-http-proxy.mjs` script from the `scripts/` directory
- Your HTTP authentication token

**Setup Example (Claude Desktop/Code):**

First, get the server URL. For local testing with port-forward:

```bash
# Port-forward the service
kubectl port-forward -n horreum-mcp svc/horreum-mcp-service 3000:80
```

Then configure your AI client (`claude_desktop_config.json` or similar):

```json
{
  "mcpServers": {
    "horreum": {
      "command": "node",
      "args": [
        "/absolute/path/to/horreum-mcp/scripts/mcp-http-proxy.mjs",
        "http://localhost:3000/mcp",
        "your-secure-mcp-token-changeme"
      ]
    }
  }
}
```

**Setup Example (Cursor):**

1. Open Settings → MCP → Add Server
2. Command: `node`
3. Args:
   `/absolute/path/to/horreum-mcp/scripts/mcp-http-proxy.mjs`,
   `http://localhost:3000/mcp`, `your-secure-mcp-token-changeme`

**Setup Example (Gemini CLI):**

```bash
gemini mcp add horreum node \
  /absolute/path/to/horreum-mcp/scripts/mcp-http-proxy.mjs \
  http://localhost:3000/mcp \
  your-secure-mcp-token-changeme

# Verify connection
gemini mcp list
```

**Using Production URL (via Route/Ingress):**

If you have a Route (OpenShift) or Ingress (Kubernetes) configured:

```json
{
  "mcpServers": {
    "horreum": {
      "command": "node",
      "args": [
        "/absolute/path/to/horreum-mcp/scripts/mcp-http-proxy.mjs",
        "https://horreum-mcp.apps.cluster.example.com/mcp",
        "your-secure-mcp-token-changeme"
      ]
    }
  }
}
```

**How the Proxy Works:**

- Your AI client spawns the proxy script as a local stdio process
- The proxy forwards MCP protocol messages to your Kubernetes/OpenShift
  deployment via HTTP POST
- Responses are streamed back to the AI client
- Session management and authentication are handled automatically

**Testing Your Connection:**

Once configured, try asking your AI assistant:

- _"List all tests in Horreum"_
- _"Show me the latest 10 runs for test X"_
- _"What schemas are available?"_

For more detailed AI client configuration options, see the [AI Client
Configuration](../README.md#ai-client-configuration) section in the main
README.

## Monitoring and Observability

### Prometheus Metrics

If `METRICS_ENABLED=true`, the server exposes Prometheus metrics at
`/metrics` on port 9464:

- Request rates and durations
- Error counts by endpoint
- Horreum API call metrics
- HTTP session statistics

### Structured Logging

With `LOG_FORMAT=json`, all logs are structured JSON with contextual
metadata:

```bash
# View logs with jq
kubectl logs -n horreum-mcp deployment/horreum-mcp | jq -r \
  'select(.level == "error") | "\(.time) \(.msg) \(.err)"'

# Filter by correlation ID
kubectl logs -n horreum-mcp deployment/horreum-mcp | jq -r \
  'select(.correlationId == "abc123")'
```

### OpenTelemetry Tracing

Enable distributed tracing by setting `TRACING_ENABLED=true` and
configuring the OpenTelemetry endpoint:

```yaml
env:
  - name: TRACING_ENABLED
    value: 'true'
  - name: OTEL_EXPORTER_OTLP_ENDPOINT
    value: 'http://jaeger-collector.tracing.svc.cluster.local:4318'
```

## Security Best Practices

1. **Always use HTTPS/TLS** for external access (via Ingress/Route)
2. **Rotate credentials** regularly using Kubernetes secrets
3. **Enable Network Policies** to restrict pod-to-pod communication
4. **Use RBAC** to limit access to the namespace
5. **Enable Pod Security Standards** (restricted profile recommended)
6. **Set resource limits** to prevent resource exhaustion attacks
7. **Enable audit logging** for compliance and security monitoring
8. **Use separate namespaces** for different environments
   (dev/staging/prod)
9. **Mount CA certificates** properly instead of disabling TLS verification
10. **Monitor security advisories** and update images regularly

## Production Checklist

Before deploying to production:

- [ ] Secrets are properly configured with strong tokens
- [ ] Resource requests and limits are tuned for your workload
- [ ] Health checks are passing consistently
- [ ] Monitoring and alerting are configured
- [ ] Log aggregation is set up
- [ ] TLS termination is configured at Ingress/Route
- [ ] Network policies are in place
- [ ] Pod disruption budgets are configured
- [ ] Horizontal autoscaling is tested
- [ ] Backup and disaster recovery plan is documented
- [ ] Security scanning is integrated into CI/CD
- [ ] Access controls and RBAC are reviewed
- [ ] SSL certificates are properly configured (not disabled)
- [ ] Rate limiting is tuned for expected load
- [ ] Connection to Horreum instance is verified

## Additional Resources

- [Horreum MCP README](../README.md)
- [HTTP Mode Configuration](../README.md#configuration)
- [Time Range Filtering](./TIME_RANGE_FILTERING.md)
- [Horreum Documentation](https://horreum.hyperfoil.io/docs/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [OpenShift Documentation](https://docs.openshift.com/)

## Support and Contributions

For issues, questions, or contributions:

- GitHub Issues: https://github.com/dustinblack/horreum-mcp/issues
- Horreum Community: https://horreum.hyperfoil.io/

All contributions should include the tag "AI-assisted-by: <AI agent
model(s)>" when AI agents were used for development work.
