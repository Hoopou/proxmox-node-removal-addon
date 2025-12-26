Ext.define('PVE.NodeRemovalPanel', {
    extend: 'Ext.panel.Panel',
    xtype: 'pveNodeRemovalPanel',
    
    title: 'Node Removal Tool',
    layout: 'border',
    
    initComponent: function() {
        let me = this;
        
        me.nodeListGrid = Ext.create('Ext.grid.Panel', {
            region: 'center',
            title: 'Removable Nodes',
            store: Ext.create('Ext.data.Store', {
                fields: ['node', 'status', 'vms', 'online', 'valid'],
                proxy: {
                    type: 'proxmox',
                    url: '/api2/json/cluster/nodes-removal'
                },
                autoLoad: true
            }),
            columns: [
                { text: 'Node', dataIndex: 'node', flex: 1 },
                {
                    text: 'Status',
                    dataIndex: 'online',
                    width: 80,
                    renderer: function(value) {
                        return value ? '<span style="color: green;">●</span> Online' : '<span style="color: red;">●</span> Offline';
                    }
                },
                { text: 'VMs/CTs', dataIndex: 'vms', width: 80 },
                {
                    text: 'Removable',
                    dataIndex: 'valid',
                    width: 80,
                    renderer: function(value) {
                        return value ? '<span style="color: green;">Yes</span>' : '<span style="color: red;">No</span>';
                    }
                }
            ],
            listeners: {
                selectionchange: function(selModel, selection) {
                    if (selection.length > 0) {
                        let node = selection[0].data.node;
                        me.loadNodeDetails(node);
                        me.updateButtonStates(node);
                    }
                }
            },
            dockedItems: [{
                xtype: 'toolbar',
                dock: 'bottom',
                items: [
                    {
                        text: 'Refresh',
                        handler: function() {
                            me.nodeListGrid.store.load();
                        }
                    }
                ]
            }],
            margin: '5'
        });
        
        me.detailPanel = Ext.create('Ext.panel.Panel', {
            region: 'east',
            width: '35%',
            title: 'Node Details',
            layout: 'fit',
            items: [{
                xtype: 'panel',
                bodyPadding: 10,
                html: '<p style="color: #999;">Select a node to view details</p>',
                itemId: 'detailContent'
            }],
            dockedItems: [{
                xtype: 'toolbar',
                dock: 'bottom',
                items: [
                    {
                        text: 'Drain Node',
                        itemId: 'drainBtn',
                        disabled: true,
                        handler: function() {
                            me.drainNode();
                        }
                    },
                    {
                        text: 'Remove Node',
                        itemId: 'removeBtn',
                        disabled: true,
                        handler: function() {
                            me.removeNode();
                        }
                    }
                ]
            }],
            margin: '5'
        });
        
        Ext.apply(me, {
            items: [me.nodeListGrid, me.detailPanel]
        });
        
        me.callParent();
    },
    
    loadNodeDetails: function(nodename) {
        let me = this;
        let detailContent = me.detailPanel.getComponent('detailContent');
        
        Ext.Ajax.request({
            url: '/api2/json/cluster/nodes-removal/' + nodename,
            method: 'GET',
            success: function(response) {
                let data = Ext.decode(response.responseText);
                let html = me.renderNodeDetails(data);
                detailContent.update(html);
            },
            failure: function() {
                detailContent.update('<p style="color: red;">Failed to load node details</p>');
            }
        });
    },
    
    renderNodeDetails: function(data) {
        let html = '<div style="font-size: 12px;">';
        
        html += '<h3>' + data.node + '</h3>';
        html += '<p><strong>Status:</strong> ' + (data.online ? 'Online' : 'Offline') + '</p>';
        html += '<p><strong>VMs/Containers:</strong> ' + data.vms.length + '</p>';
        
        if (data.vms.length > 0) {
            html += '<h4>Running Guests:</h4><ul>';
            data.vms.forEach(function(vm) {
                html += '<li>' + vm.name + ' (' + vm.type + ' ' + vm.id + ')</li>';
            });
            html += '</ul>';
        }
        
        if (data.validation && data.validation.warnings && data.validation.warnings.length > 0) {
            html += '<h4 style="color: #ff6600;">Warnings:</h4><ul>';
            data.validation.warnings.forEach(function(warning) {
                html += '<li>' + warning + '</li>';
            });
            html += '</ul>';
        }
        
        html += '</div>';
        return html;
    },
    
    updateButtonStates: function(nodename) {
        let me = this;
        let drainBtn = me.detailPanel.down('#drainBtn');
        let removeBtn = me.detailPanel.down('#removeBtn');
        
        Ext.Ajax.request({
            url: '/api2/json/cluster/nodes-removal/' + nodename,
            method: 'GET',
            success: function(response) {
                let data = Ext.decode(response.responseText);
                let vmsPresent = data.vms.length > 0;
                
                drainBtn.setDisabled(false);
                removeBtn.setDisabled(vmsPresent);
            }
        });
        
        me.selectedNode = nodename;
    },
    
    drainNode: function() {
        let me = this;
        let nodename = me.selectedNode;
        
        Ext.MessageBox.confirm('Confirm', 'Migrate all VMs/containers off this node?', function(btn) {
            if (btn === 'yes') {
                Ext.MessageBox.wait('Draining node...', 'Please wait');
                
                Ext.Ajax.request({
                    url: '/api2/json/cluster/nodes-removal/' + nodename + '/drain',
                    method: 'POST',
                    success: function(response) {
                        Ext.MessageBox.hide();
                        let data = Ext.decode(response.responseText);
                        Ext.Msg.alert('Success', 'Migrated ' + data.migrated.length + ' VM(s)/Container(s)');
                        me.nodeListGrid.store.load();
                    },
                    failure: function() {
                        Ext.MessageBox.hide();
                        Ext.Msg.alert('Error', 'Failed to drain node');
                    }
                });
            }
        });
    },
    
    removeNode: function() {
        let me = this;
        let nodename = me.selectedNode;
        
        Ext.MessageBox.confirm('Confirm', 'Remove node "' + nodename + '" from cluster? This cannot be undone.', function(btn) {
            if (btn === 'yes') {
                // Double confirmation
                Ext.MessageBox.prompt('Confirm', 'Type "' + nodename + '" to confirm:', function(btn2, text) {
                    if (btn2 === 'ok' && text === nodename) {
                        Ext.MessageBox.wait('Removing node...', 'Please wait');
                        
                        Ext.Ajax.request({
                            url: '/api2/json/cluster/nodes-removal/' + nodename,
                            method: 'DELETE',
                            success: function() {
                                Ext.MessageBox.hide();
                                Ext.Msg.alert('Success', 'Node removed from cluster');
                                me.nodeListGrid.store.load();
                            },
                            failure: function(response) {
                                Ext.MessageBox.hide();
                                let error = 'Failed to remove node';
                                try {
                                    let data = Ext.decode(response.responseText);
                                    error = data.message || error;
                                } catch (e) {}
                                Ext.Msg.alert('Error', error);
                            }
                        });
                    }
                });
            }
        });
    }
});

// Register the panel in the Proxmox web UI
Ext.define('PVE.panel.NodeRemovalPanel', {
    extend: 'PVE.NodeRemovalPanel'
});
