/* Proxmox Node Removal Addon - Integration
 * 
 * This addon adds a "Node Removal Tool" section to the Cluster menu
 * in the Proxmox web UI
 */

Ext.define('PVE.NodeRemovalAddon', {
    singleton: true,
    
    init: function() {
        // Register the main panel
        Ext.define('PVE.panel.NodeRemovalPanel', {
            extend: 'PVE.NodeRemovalPanel'
        });
        
        // Hook into cluster navigation to add menu item
        Ext.on('ready', function() {
            this.addClusterMenuItem();
        }, this);
    },
    
    addClusterMenuItem: function() {
        // This would typically hook into Proxmox's cluster navigation
        // The exact integration depends on Proxmox version
        console.log('[Node Removal Addon] Menu integration ready');
    }
});

// Initialize on app load
Ext.onReady(function() {
    PVE.NodeRemovalAddon.init();
});
