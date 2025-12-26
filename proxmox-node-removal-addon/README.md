# Proxmox Node Removal Addon

A powerful Proxmox addon that simplifies and automates the process of removing nodes from a cluster with built-in safety checks and migration capabilities.

## Features

- **Automated Node Removal**: One-click node removal with multi-step orchestration
- **Smart VM/Container Migration**: Automatically migrate guests off the node being removed
- **Safety Checks**: Validates cluster quorum, node state, and dependencies before removal
- **Web UI Integration**: Intuitive interface within Proxmox admin panel
- **REST API**: Programmatic access to node removal operations
- **Dry-Run Mode**: Test removal process without making changes
- **Progress Tracking**: Monitor migration and removal progress
- **Audit Logging**: Track all node removal operations

## Requirements

- Proxmox VE 7.0 or later
- Perl 5.20+
- Debian-based system (Debian 10+, Ubuntu 20.04+)
- Cluster with 2+ nodes
- Sufficient storage for VM/container migrations

## Installation

### Method 1: Using the Makefile (Recommended)

1. Clone or download the addon repository
2. Navigate to the addon directory
3. Build and install:

```bash
cd proxmox-node-removal-addon
make build
make install
```

### Method 2: Manual Build

```bash
# Build the Debian package
./build.sh

# Install the package
dpkg -i .build/proxmox-node-removal-addon_1.0.0-1_all.deb
```

### Method 3: Direct dpkg Installation

If you have a pre-built `.deb` file:

```bash
dpkg -i proxmox-node-removal-addon_1.0.0-1_all.deb
```

## Usage

### Web UI

1. Log in to your Proxmox admin panel
2. Navigate to **Cluster** → **Node Removal Tool** (new menu item)
3. Select the node you want to remove
4. Review node details and warnings
5. Click **"Drain Node"** to migrate VMs/containers (optional)
6. Click **"Remove Node"** to complete removal

### REST API

#### List removable nodes

```bash
curl -X GET https://<proxmox-host>:8006/api2/json/cluster/nodes-removal \
  -H "Authorization: PVEAPIToken=<token>"
```

Response:
```json
[
  {
    "node": "node1",
    "status": "online",
    "vms": 5,
    "warnings": [],
    "valid": true
  }
]
```

#### Get node removal status

```bash
curl -X GET https://<proxmox-host>:8006/api2/json/cluster/nodes-removal/node1 \
  -H "Authorization: PVEAPIToken=<token>"
```

#### Drain a node (migrate VMs/containers)

```bash
curl -X POST https://<proxmox-host>:8006/api2/json/cluster/nodes-removal/node1/drain \
  -H "Authorization: PVEAPIToken=<token>" \
  -d 'migration-target=node2'
```

#### Remove a node

```bash
# Dry-run (validate only)
curl -X DELETE https://<proxmox-host>:8006/api2/json/cluster/nodes-removal/node1 \
  -H "Authorization: PVEAPIToken=<token>" \
  -d 'dry-run=1'

# Actual removal
curl -X DELETE https://<proxmox-host>:8006/api2/json/cluster/nodes-removal/node1 \
  -H "Authorization: PVEAPIToken=<token>"
```

## Workflow

### Standard Node Removal Workflow

1. **Validation** - Check if node can be safely removed
   - Verify cluster quorum
   - Check for running VMs/containers
   - Validate storage dependencies
   - Check for Ceph roles

2. **Drain** - Migrate guests off the node
   - Automatically select target node
   - Perform live migration
   - Handle migration failures
   - Verify all guests moved

3. **Remove** - Remove node from cluster
   - Update Corosync configuration
   - Remove node from cluster database
   - Cleanup node certificates
   - Restart cluster services

### Advanced Workflow

1. **Pre-removal Assessment**
   ```bash
   curl -X GET /api2/json/cluster/nodes-removal/nodeX
   ```

2. **Force Offline** (if node is unresponsive)
   ```bash
   curl -X DELETE /api2/json/cluster/nodes-removal/nodeX \
     -d 'force=1'
   ```

3. **Cleanup Only** (remove from cluster without migrations)
   ```bash
   curl -X DELETE /api2/json/cluster/nodes-removal/nodeX \
     -d 'cleanup-only=1'
   ```

## Safety Features

### Pre-Removal Checks

The addon performs several safety checks before removal:

- **Quorum Validation**: Ensures cluster maintains quorum after node removal
- **Guest Validation**: Lists all VMs/containers on node
- **Storage Check**: Validates storage availability
- **Network Check**: Verifies cluster network connectivity
- **Certificate Validation**: Checks node authentication

### Error Prevention

- **Confirmation Dialog**: Requires double confirmation for destructive operations
- **Type-in Confirmation**: Must type node name to confirm removal
- **Dry-Run Mode**: Test removal without making changes
- **Rollback Capability**: Can revert in certain scenarios

### Warnings

The addon provides warnings for:

- Small clusters (less than 3 nodes)
- Nodes with local storage
- Nodes with Ceph roles
- Active replication jobs
- Pending configuration changes

## Troubleshooting

### Installation Issues

**Problem**: Package installation fails with permission denied

```bash
sudo dpkg -i proxmox-node-removal-addon_1.0.0-1_all.deb
```

**Problem**: API endpoints not appearing

```bash
systemctl restart pveproxy
```

### Node Removal Issues

**Problem**: Node removal fails due to quorum

Solution: Ensure cluster has 3+ nodes or configure QDevice

**Problem**: VM migration fails

Solution: Check network connectivity, storage availability, and VM state

**Problem**: Node remains in cluster config after removal

Solution: Manually clean up with `pvecm delnode <nodename> --force`

## Uninstallation

```bash
# Using Makefile
make uninstall

# Manual uninstall
dpkg -r proxmox-node-removal-addon
systemctl restart pveproxy
```

## Configuration

Edit configuration file at `/etc/pve/node-removal-addon.conf`:

```ini
[general]
# Enable detailed logging
debug = 0

# Default migration timeout (seconds)
migration_timeout = 600

# Enable automatic backups before removal
backup_before_removal = 0

[validation]
# Require minimum cluster size
min_cluster_size = 3

# Enforce data redundancy checks
check_redundancy = 1
```

## API Reference

### GET `/cluster/nodes-removal`
List all nodes and their removal eligibility.

**Permissions**: `Sys.Audit`

**Returns**: Array of node objects with removal status

### GET `/cluster/nodes-removal/{nodename}`
Get detailed status of a specific node.

**Permissions**: `Sys.Audit` on node

**Parameters**:
- `nodename` (string, required): Proxmox node name

**Returns**: Node status with VMs, storage, and validation info

### POST `/cluster/nodes-removal/{nodename}/drain`
Migrate all VMs/containers off the node.

**Permissions**: `Sys.Modify` on node

**Parameters**:
- `nodename` (string, required): Proxmox node name
- `migration-target` (string, optional): Target node for migration

**Returns**: Migration results with success/failure list

### DELETE `/cluster/nodes-removal/{nodename}`
Remove node from cluster.

**Permissions**: `Sys.Modify` on node

**Parameters**:
- `nodename` (string, required): Proxmox node name
- `force` (boolean, optional): Force removal despite validation errors
- `dry-run` (boolean, optional): Validate without making changes

**Returns**: Removal result

## Architecture

```
┌─────────────────────────────────────────────┐
│         Proxmox Web UI                       │
│    (NodeRemovalPanel.js)                     │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│         REST API Layer                       │
│    (PVE::API2::NodeRemoval)                  │
├─────────────────────────────────────────────┤
│ - Endpoint: /cluster/nodes-removal          │
│ - Endpoint: /cluster/nodes-removal/{node}   │
│ - Endpoint: /cluster/nodes-removal/{node}/drain
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│    Business Logic Layer                      │
│    (PVE::NodeRemoval)                        │
├─────────────────────────────────────────────┤
│ - validate_node_removal()                    │
│ - drain_node()                               │
│ - remove_node()                              │
│ - get_node_vms()                             │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│    Proxmox Core APIs                         │
├─────────────────────────────────────────────┤
│ - Cluster (Corosync)                         │
│ - QEMU/LXC                                   │
│ - Storage                                    │
│ - Migration                                  │
└─────────────────────────────────────────────┘
```

## Development

### Building from Source

```bash
make clean
make build
```

### Testing

```bash
make test
```

### Code Structure

```
proxmox-node-removal-addon/
├── PVE/
│   ├── NodeRemoval.pm           # Core business logic
│   └── API2/
│       └── NodeRemoval.pm       # REST API endpoints
├── www/
│   └── manager/
│       └── node-removal/
│           └── NodeRemovalPanel.js  # Web UI component
├── debian/
│   ├── control                  # Package metadata
│   ├── postinst                 # Post-installation script
│   ├── prerm                    # Pre-removal script
│   ├── rules                    # Build rules
│   └── changelog                # Version history
├── Makefile                     # Build automation
├── build.sh                     # Build script
└── README.md                    # This file
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This addon is provided under the AGPLv3 license (same as Proxmox VE).

## Support

For issues, questions, or feature requests:

1. Check the Troubleshooting section above
2. Review Proxmox cluster documentation
3. Submit an issue on the repository

## Changelog

### Version 1.0.0 (Initial Release)
- Node removal workflow
- Automated VM/container migration
- Web UI integration
- REST API endpoints
- Safety validation checks

## Future Enhancements

- [ ] Ceph OSD automatic removal
- [ ] Scheduled removals
- [ ] Removal notifications
- [ ] Database migration
- [ ] Backup integration
- [ ] Advanced quorum detection (QDevice support)
- [ ] Removal reports and statistics

## Credits

Built for the Proxmox community.
