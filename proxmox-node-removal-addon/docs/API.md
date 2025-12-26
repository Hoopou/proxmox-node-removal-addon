# API Reference

## Base URL

```
https://<proxmox-host>:8006/api2/json/cluster/nodes-removal
```

## Authentication

All endpoints require a valid Proxmox authentication ticket or API token with `Sys.Modify` permission on `/`.

## Endpoints

### List Actions

```http
GET /api2/json/cluster/nodes-removal
```

**Response:**
```json
{
  "data": [
    { "name": "quit" },
    { "name": "remove" }
  ]
}
```

### Quit Cluster

Removes the current node from the cluster. The node becomes standalone.

```http
POST /api2/json/cluster/nodes-removal/quit
```

**Response:**
```json
{
  "data": {
    "success": 1,
    "message": "Node 'hostname' has left the cluster"
  }
}
```

**Errors:**
- `400` - Node is not part of a cluster
- `500` - Failed to leave cluster

### Remove Node

Removes another node from the cluster.

```http
POST /api2/json/cluster/nodes-removal/remove/{nodename}
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| nodename | string | Name of the node to remove |

**Response:**
```json
{
  "data": {
    "success": 1,
    "message": "Node 'nodename' removed from cluster"
  }
}
```

**Errors:**
- `400` - Cannot remove current node (use quit instead)
- `400` - Node not found in cluster
- `500` - Failed to remove node

## CLI Examples

Using `pvesh`:

```bash
# List available actions
pvesh get /cluster/nodes-removal

# Quit cluster (current node)
pvesh create /cluster/nodes-removal/quit

# Remove another node
pvesh create /cluster/nodes-removal/remove/node2
```

Using `curl`:

```bash
# Get auth ticket
ticket=$(curl -s -k -d "username=root@pam&password=xxx" \
  https://localhost:8006/api2/json/access/ticket | jq -r '.data.ticket')

# Remove a node
curl -s -k -X POST \
  -H "Cookie: PVEAuthCookie=$ticket" \
  https://localhost:8006/api2/json/cluster/nodes-removal/remove/node2
```
