# Proxmox Node Removal Addon

A Proxmox VE addon that adds a **Remove Node** / **Quit Cluster** button to the Cluster administration panel.

## Features

- **Remove Node**: Remove another node from the cluster
- **Quit Cluster**: Detach the current node from the cluster
- **Safety checks**: Button is disabled when only 1 node exists
- **Smart UI**: Button dynamically changes based on selection

## Button Behavior

| Condition | Button Text | Action |
|-----------|-------------|--------|
| Only 1 node in cluster | Disabled | - |
| No node selected | "Quit Cluster" | Current node leaves cluster |
| Current node selected | "Quit Cluster" | Current node leaves cluster |
| Other node selected | "Remove Node" | Selected node is removed |

## Installation

```bash
dpkg -i proxmox-node-removal-addon_1.0.0-1_all.deb
```

## Uninstallation

```bash
apt remove proxmox-node-removal-addon
```

## Building from Source

```bash
./build.sh
```

## API Endpoints

- `GET /api2/json/cluster/nodes-removal` - List available actions
- `POST /api2/json/cluster/nodes-removal/quit` - Leave the cluster
- `POST /api2/json/cluster/nodes-removal/remove/{nodename}` - Remove a node

## File Structure

```
proxmox-node-removal-addon/
├── PVE/API2/NodeRemoval.pm   # REST API endpoints
├── www/.../ClusterTab.js     # UI button override
├── debian/                   # Package configuration
└── build.sh                  # Build script
```

## Requirements

- Proxmox VE 7.x or 8.x

## License

GPL-3.0
