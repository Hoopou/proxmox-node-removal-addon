/*
 * Node Removal Tool - Proxmox Web UI Integration
 * 
 * This file integrates the Node Removal Panel into the Proxmox web UI
 * by adding it to the Cluster menu
 */

Ext.define('PVE.cluster.NodeRemovalTool', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.pveClusterNodeRemovalTool',
    
    title: 'Node Removal Tool',
    layout: 'fit',
    
    initComponent: function() {
        this.items = [
            Ext.create('PVE.NodeRemovalPanel')
        ];
        this.callParent();
    }
});

// Register in cluster section
Ext.define('PVE.panel.ClusterNodeRemovalTool', {
    extend: 'PVE.cluster.NodeRemovalTool'
});
