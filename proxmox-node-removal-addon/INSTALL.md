# Installation Guide

## Prerequisites

Before installing the Proxmox Node Removal Addon, ensure you have:

- Proxmox VE 7.0 or later
- Root or sudo access to your Proxmox nodes
- A Proxmox cluster with at least 2 nodes
- Network connectivity between cluster nodes
- At least 100MB free disk space

## Installation Steps

### Step 1: Prepare the Build Environment

On your Proxmox system:

```bash
# Install build dependencies
apt-get update
apt-get install -y build-essential debhelper perl

# Clone the addon repository
cd /tmp
git clone https://your-repo/proxmox-node-removal-addon.git
cd proxmox-node-removal-addon
```

### Step 2: Build the Package

```bash
# Method A: Using Makefile (recommended)
make build

# Method B: Using build script
./build.sh
```

The `.deb` package will be created in the `.build` directory.

### Step 3: Install the Package

```bash
# Install using dpkg
dpkg -i .build/proxmox-node-removal-addon_1.0.0-1_all.deb

# Or install using Makefile
make install
```

### Step 4: Verify Installation

Check that the package is installed:

```bash
dpkg -l | grep proxmox-node-removal
# Output: ii  proxmox-node-removal-addon  1.0.0-1
```

Check that services have restarted:

```bash
systemctl status pveproxy
# Should show "active (running)"
```

Check API availability:

```bash
curl -s https://localhost:8006/api2/json/cluster/nodes-removal \
  -H "Authorization: PVEAPIToken=test@pam:test" \
  -k 2>/dev/null | head -20
```

### Step 5: Access the Web UI

1. Log in to your Proxmox admin panel: `https://<proxmox-host>:8006`
2. Navigate to **Cluster** menu
3. You should see **Node Removal Tool** as a new option
4. Click to open the node removal interface

## Pre-Installation Checklist

- [ ] Proxmox VE 7.0+ is installed
- [ ] Cluster has 2+ nodes
- [ ] All nodes are online and connected
- [ ] Sufficient storage for VM migrations
- [ ] Network is stable
- [ ] You have root access
- [ ] Backups are current

## Installation Troubleshooting

### Problem: Build fails with "command not found"

**Solution**: Install build dependencies

```bash
apt-get install -y build-essential debhelper perl
```

### Problem: Installation fails with "Dependency not satisfied"

**Solution**: Ensure Proxmox VE is properly installed

```bash
apt-get install proxmox-ve
```

### Problem: Web UI doesn't show the addon

**Solution**: Restart the web service and refresh browser

```bash
systemctl restart pveproxy pvedaemon
# Then refresh browser (Ctrl+F5 / Cmd+Shift+R)
```

### Problem: Permission denied during installation

**Solution**: Use sudo or log in as root

```bash
sudo dpkg -i .build/proxmox-node-removal-addon_1.0.0-1_all.deb
# Or
sudo make install
```

### Problem: API endpoints return 404

**Solution**: Verify installation and restart services

```bash
# Check if modules are in place
ls -la /usr/share/perl5/PVE/NodeRemoval.pm

# Restart services
systemctl restart pveproxy

# Wait 30 seconds and try again
sleep 30
curl -s https://localhost:8006/api2/json/cluster/nodes-removal -k
```

## Updating the Addon

### From an Older Version

```bash
# Download new version
cd /tmp/proxmox-node-removal-addon
git pull origin main

# Rebuild
make clean
make build

# Install (automatically removes old version first)
dpkg -i .build/proxmox-node-removal-addon_1.0.0-1_all.deb
```

## Uninstallation

### Using Makefile

```bash
make uninstall
```

### Manual Uninstallation

```bash
# Remove package
dpkg -r proxmox-node-removal-addon

# Restart services to clean up
systemctl restart pveproxy

# Verify removal
dpkg -l | grep proxmox-node-removal
# Should return no results
```

## Post-Installation Configuration

### Optional: Enable Debug Logging

Edit `/etc/pve/node-removal-addon.conf`:

```ini
[general]
debug = 1
migration_timeout = 600
```

Then reload:

```bash
systemctl restart pveproxy
```

### Optional: Set API Token for Programmatic Access

Create an API token for automation:

```bash
# On Proxmox node
pveum user add addon-api@pve
pveum aclmod / -user addon-api@pve -role Administrator

# Or restrict to specific permissions
pveum role add NodeRemoval -privs "Sys.Modify,Sys.Audit"
pveum aclmod /cluster -user addon-api@pve -role NodeRemoval
```

## Next Steps

- Read the [README.md](README.md) for usage instructions
- Review the [API documentation](README.md#api-reference)
- Test with a dry-run: `curl -X DELETE ... -d 'dry-run=1'`
- Check out example workflows in the README

## Getting Help

If you encounter issues:

1. Check the troubleshooting section in [README.md](README.md)
2. Review system logs: `journalctl -u pveproxy -f`
3. Check Proxmox logs: `tail -f /var/log/pve/manager/manager.log`
4. Create an issue on the repository

## System Requirements Summary

| Component | Requirement |
|-----------|-------------|
| OS | Debian 10+ / Ubuntu 20.04+ |
| Proxmox | VE 7.0+ |
| Perl | 5.20+ |
| RAM | 512MB+ |
| Disk | 100MB+ |
| Network | TCP 8006 |

## Additional Resources

- [Proxmox VE Documentation](https://pve.proxmox.com/)
- [Proxmox Cluster Management](https://pve.proxmox.com/wiki/Cluster_Manager)
- [Proxmox API Reference](https://pve.proxmox.com/pve-docs/api-viewer/index.html)
