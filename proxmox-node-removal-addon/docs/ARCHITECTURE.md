# Architecture

## Overview

This addon integrates with Proxmox VE by:
1. Registering a REST API endpoint under `/cluster/nodes-removal`
2. Injecting a UI button into the Cluster administration panel via Ext.JS override

## Components

### Backend API (`PVE/API2/NodeRemoval.pm`)

A Perl REST handler that provides two endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/cluster/nodes-removal` | GET | Lists available actions |
| `/cluster/nodes-removal/quit` | POST | Current node leaves cluster |
| `/cluster/nodes-removal/remove/{node}` | POST | Remove specified node |

The API is registered by patching `/usr/share/perl5/PVE/API2/Cluster.pm` during installation.

### Frontend UI (`www/manager/node-removal/ClusterTab.js`)

An Ext.JS 6 override that:
- Extends `PVE.ClusterAdministration`
- Adds a "Remove Node" / "Quit Cluster" button to the toolbar
- Listens to grid selection changes to update button state

## How Node Removal Works

### Quit Cluster (current node)
1. Stops corosync and pve-cluster services
2. Removes corosync configuration
3. Restarts pmxcfs in local mode
4. Node becomes standalone

### Remove Node (another node)
1. Deletes node from corosync config via `pvecm delnode`
2. Removes node's files from `/etc/pve/nodes/{nodename}`
3. Cluster continues without the removed node

## Installation Flow

```
dpkg -i package.deb
    │
    ├── Copy API module to /usr/share/perl5/pve-node-removal/
    ├── Copy JS files to /usr/share/pve-manager/js/pve-node-removal/
    ├── Patch Cluster.pm to register API
    └── Restart pveproxy
```
