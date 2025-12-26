/*
 * Proxmox Node Removal Addon - Loader
 * 
 * This file loads the Node Removal Tool addon into the Proxmox web UI
 */

// Load the Node Removal Panel
Ext.require('PVE.NodeRemovalPanel');

// Add to Cluster navigation
Ext.define('PVE.cluster.NavTree', {
    override: 'PVE.cluster.StatusView',
    
    initComponent: function() {
        var me = this;
        
        var tree = this.getComponent('tree');
        if (tree) {
            // Insert Node Removal Tool after other cluster items
            var root = tree.getRootNode();
            if (root) {
                root.appendChild({
                    text: 'Node Removal Tool',
                    iconCls: 'pmx-iconfont-tool',
                    leaf: true,
                    id: 'node-removal-tool',
                    xtype: 'pveNodeRemovalPanel'
                });
            }
        }
        
        this.callParent();
    }
});

// Alternative approach: Register as Proxmox module
Ext.application({
    name: 'PVE.addon.noderemoval',
    
    launch: function() {
        // Panel already registered via Ext.define above
        console.log('Node Removal Addon loaded successfully');
    }
});
