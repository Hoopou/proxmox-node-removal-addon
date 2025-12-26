# Development Guide

## Project Structure

```
proxmox-node-removal-addon/
├── PVE/API2/NodeRemoval.pm   # Perl REST API
├── www/manager/node-removal/
│   └── ClusterTab.js         # Ext.JS UI override
├── debian/                   # Debian packaging
├── docs/                     # Documentation
├── build.sh                  # Build script
├── Makefile                  # Build automation
└── README.md
```

## Building

### Prerequisites

- Debian/Ubuntu system (or WSL)
- `dpkg-dev` package installed

### Build Commands

```bash
# Build the .deb package
./build.sh

# Or use make
make build
```

The package will be created in `.build/`

## Testing on Proxmox

### Deploy for testing

```bash
# Copy to Proxmox
scp .build/proxmox-node-removal-addon_1.0.0-1_all.deb root@proxmox:/tmp/

# Install
ssh root@proxmox dpkg -i /tmp/proxmox-node-removal-addon_1.0.0-1_all.deb
```

### Verify installation

```bash
# Check API is registered
pvesh get /cluster/nodes-removal

# Check logs
journalctl -u pveproxy -f
```

### Debug UI

1. Open browser DevTools (F12)
2. Check Console for errors
3. Look for `[NodeRemoval]` log messages

## Modifying the Code

### API Changes

Edit `PVE/API2/NodeRemoval.pm`, then:

```bash
# Rebuild and reinstall
./build.sh
dpkg -i .build/*.deb
```

### UI Changes

Edit `www/manager/node-removal/ClusterTab.js`, then:

```bash
# Quick test without rebuilding
scp ClusterTab.js root@proxmox:/usr/share/pve-manager/js/pve-node-removal/

# Clear browser cache and refresh
```

## Proxmox References

- [Proxmox VE API](https://pve.proxmox.com/pve-docs/api-viewer/)
- [PVE REST Handler](https://git.proxmox.com/?p=pve-common.git;a=blob;f=src/PVE/RESTHandler.pm)
- [Ext.JS 6 Docs](https://docs.sencha.com/extjs/6.2.0/)
- [pvecm man page](https://pve.proxmox.com/pve-docs/pvecm.1.html)
