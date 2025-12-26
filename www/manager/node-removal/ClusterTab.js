// Node Removal Tool - Cluster panel override
// Behavior:
// - Button disabled if only 1 node in cluster
// - No selection + multiple nodes: "Quit Cluster" - removes CURRENT node (self)
// - Node selected: "Remove Node" - removes SELECTED node (other node)

Ext.define("PVE.NodeRemoval.ClusterOverride", {
    override: "PVE.ClusterAdministration",
    initComponent: function() {
        var me = this;
        me.callParent(arguments);

        var infoPanel = me.items.items[0];
        if (infoPanel && infoPanel.dockedItems) {
            var toolbar = infoPanel.getDockedItems("toolbar[dock=top]")[0];
            var grid = me.down("grid");

            if (toolbar && grid) {
                var currentNode = Proxmox.NodeName;

                var removeBtn = Ext.create("Ext.button.Button", {
                    text: "Quit Cluster",
                    iconCls: "fa fa-sign-out",
                    disabled: true,
                    handler: function() {
                        var selection = grid.getSelection();
                        var store = grid.getStore();
                        var nodeCount = store.getCount();

                        if (nodeCount <= 1) {
                            Ext.Msg.alert("Error", "Cannot remove the only node in the cluster");
                            return;
                        }

                        var isQuitMode = !selection || selection.length === 0;
                        var targetNode = isQuitMode ? currentNode : selection[0].get("name");

                        if (!isQuitMode && targetNode === currentNode) {
                            Ext.Msg.alert("Error", "To remove yourself from the cluster, deselect all nodes and click Quit Cluster");
                            return;
                        }

                        var title, msg, apiUrl, successMsg;

                        if (isQuitMode) {
                            title = "Quit Cluster";
                            msg = "Are you sure you want to leave the cluster?<br><br><b>This node (" + currentNode + ") will:</b><br>- Be detached from the cluster<br>- Become a standalone Proxmox server<br>- Keep all local VMs/containers<br><br><i>You will need to reconnect to this node directly after leaving.</i>";
                            apiUrl = "/cluster/nodes-removal/quit";
                            successMsg = "Successfully left the cluster. This node is now standalone.";
                        } else {
                            title = "Remove Node";
                            msg = "Remove node " + targetNode + " from the cluster?<br><br><b>WARNING:</b><br>- Node will become standalone<br>- Quorum votes will be updated<br><br><i>Ensure no shared resources are in use.</i>";
                            apiUrl = "/cluster/nodes-removal/remove/" + targetNode;
                            successMsg = "Node " + targetNode + " has been removed from the cluster.";
                        }

                        Ext.Msg.show({
                            title: title,
                            msg: msg,
                            buttons: Ext.Msg.YESNO,
                            icon: Ext.Msg.WARNING,
                            fn: function(btn) {
                                if (btn === "yes") {
                                    Proxmox.Utils.API2Request({
                                        url: apiUrl,
                                        method: "POST",
                                        waitMsgTarget: grid,
                                        failure: function(response) {
                                            Ext.Msg.alert("Error", response.htmlStatus);
                                        },
                                        success: function() {
                                            Ext.Msg.alert("Success", successMsg);
                                            if (!isQuitMode) {
                                                store.reload();
                                            }
                                        }
                                    });
                                }
                            }
                        });
                    }
                });

                toolbar.add(removeBtn);

                var updateButtonState = function() {
                    var store = grid.getStore();
                    var nodeCount = store.getCount();
                    var selection = grid.getSelection();

                    if (nodeCount <= 1) {
                        removeBtn.setDisabled(true);
                        removeBtn.setText("Remove Node");
                        removeBtn.setIconCls("fa fa-trash-o");
                        return;
                    }

                    removeBtn.setDisabled(false);

                    if (!selection || selection.length === 0) {
                        removeBtn.setText("Quit Cluster");
                        removeBtn.setIconCls("fa fa-sign-out");
                    } else {
                        var selectedNode = selection[0].get("name");
                        if (selectedNode === currentNode) {
                            removeBtn.setText("Quit Cluster");
                            removeBtn.setIconCls("fa fa-sign-out");
                        } else {
                            removeBtn.setText("Remove Node");
                            removeBtn.setIconCls("fa fa-trash-o");
                        }
                    }
                };

                grid.on("selectionchange", updateButtonState);
                grid.getStore().on("load", updateButtonState);
                grid.getStore().on("datachanged", updateButtonState);
                Ext.defer(updateButtonState, 500);
            }
        }
    }
});
console.log("PVE Node Removal: loaded");
