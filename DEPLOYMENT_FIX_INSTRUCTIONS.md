# Fix Instructions for Current OpenShift Deployment

## Issue

The Horreum MCP pods are failing to connect to the Horreum backend with "fetch failed" errors due to SSL certificate verification issues.

## Root Cause

The `HORREUM_TLS_VERIFY` environment variable is defined in the ConfigMap but not being injected into the pods because the Deployment manifest is missing the corresponding `configMapKeyRef`.

## Solution

### Step 1: Verify the Current State

```bash
# Check if HORREUM_TLS_VERIFY is in the ConfigMap
oc get configmap horreum-mcp-config -n perfscale-automotive-mcp -o yaml | grep HORREUM_TLS_VERIFY

# Verify it's NOT in the running pods (this is the problem)
oc exec -n perfscale-automotive-mcp deployment/horreum-mcp -- env | grep HORREUM_TLS_VERIFY
```

### Step 2: Update the Deployment

Add the following to the Deployment's `env` section (around line 229 in the template):

```yaml
- name: HORREUM_TLS_VERIFY
  valueFrom:
    configMapKeyRef:
      name: horreum-mcp-config
      key: HORREUM_TLS_VERIFY
      optional: true
```

Apply the updated deployment:

```bash
# Edit the deployment directly
oc edit deployment horreum-mcp -n perfscale-automotive-mcp

# OR apply the updated manifest from the documentation
oc apply -f docs/kubernetes-deployment.md  # (extract the Deployment YAML)
```

### Step 3: Ensure ConfigMap has the Setting

```bash
# Verify the ConfigMap has HORREUM_TLS_VERIFY set
oc get configmap horreum-mcp-config -n perfscale-automotive-mcp -o yaml

# If not present, patch it:
oc patch configmap horreum-mcp-config -n perfscale-automotive-mcp \
  --type merge \
  -p '{"data":{"HORREUM_TLS_VERIFY":"false"}}'
```

### Step 4: Restart the Deployment

```bash
# Trigger a rollout to pick up the new environment variable
oc rollout restart deployment/horreum-mcp -n perfscale-automotive-mcp

# Wait for the rollout to complete
oc rollout status deployment/horreum-mcp -n perfscale-automotive-mcp
```

### Step 5: Verify the Fix

```bash
# Confirm the environment variable is now set
oc exec -n perfscale-automotive-mcp deployment/horreum-mcp -- \
  env | grep HORREUM_TLS_VERIFY

# Should output: HORREUM_TLS_VERIFY=false

# Test connectivity to Horreum
oc exec -n perfscale-automotive-mcp deployment/horreum-mcp -- \
  curl -s -o /dev/null -w "%{http_code}\n" https://horreum.corp.redhat.com/api/config/keycloak

# Should output: 200 (or another non-000 HTTP code)

# Check the logs for successful operations
oc logs -n perfscale-automotive-mcp -l app=horreum-mcp --tail=50 | grep -i "tool\|error"
```

## Testing with Gemini

Once the fix is applied and pods are healthy:

```bash
# Test the MCP connection
gemini mcp list

# Should show: ✓ horreum-mcp: ... - Connected

# Test a tool call
gemini "what horreum tests are available"

# Should return a list of tests from the Horreum backend
```

## Production Note

For production deployments, instead of disabling TLS verification, you should:

1. Add the corporate CA certificate to a ConfigMap
2. Mount it in the pod at `/etc/ssl/certs/custom-ca.crt`
3. Set `NODE_EXTRA_CA_CERTS=/etc/ssl/certs/custom-ca.crt`

See the "OpenShift Specific Configuration" → "Mounting Custom CA Certificates" section in `docs/kubernetes-deployment.md` for details.

## Quick Fix Commands

```bash
# All-in-one fix (assumes ConfigMap already has HORREUM_TLS_VERIFY)
oc patch deployment horreum-mcp -n perfscale-automotive-mcp --type json -p '[
  {
    "op": "add",
    "path": "/spec/template/spec/containers/0/env/-",
    "value": {
      "name": "HORREUM_TLS_VERIFY",
      "valueFrom": {
        "configMapKeyRef": {
          "name": "horreum-mcp-config",
          "key": "HORREUM_TLS_VERIFY",
          "optional": true
        }
      }
    }
  }
]'

# Wait for rollout
oc rollout status deployment/horreum-mcp -n perfscale-automotive-mcp

# Verify
oc exec -n perfscale-automotive-mcp deployment/horreum-mcp -- env | grep HORREUM_TLS_VERIFY
```
