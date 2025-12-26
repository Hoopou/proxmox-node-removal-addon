package PVE::API2::NodeRemoval;

use strict;
use warnings;

use JSON;
use PVE::JSONSchema qw(get_standard_option);
use PVE::RESTHandler;
use PVE::Cluster;
use PVE::Tools;
use PVE::INotify;

use base qw(PVE::RESTHandler);

__PACKAGE__->register_method ({
    name => 'index',
    path => '',
    method => 'GET',
    description => "Node removal API index.",
    permissions => { user => 'all' },
    parameters => {
        additionalProperties => 0,
        properties => {},
    },
    returns => {
        type => 'array',
        items => {
            type => 'object',
            properties => {
                name => { type => 'string' },
            },
        },
    },
    code => sub {
        return [
            { name => 'quit' },
            { name => 'remove' },
        ];
    }
});

__PACKAGE__->register_method ({
    name => 'quit_cluster',
    path => 'quit',
    method => 'POST',
    protected => 1,
    permissions => { check => ['perm', '/', ['Sys.Modify']] },
    description => "Leave the cluster. This node will become a standalone Proxmox server.",
    parameters => {
        additionalProperties => 0,
        properties => {},
    },
    returns => {
        type => 'object',
        properties => {
            success => { type => 'boolean' },
            message => { type => 'string' },
        },
    },
    code => sub {
        my ($param) = @_;

        my $nodename = PVE::INotify::nodename();
        my $nodes = PVE::Cluster::get_nodelist();

        if (scalar(@$nodes) <= 1) {
            die "Cannot quit cluster: this is the only node in the cluster.\n";
        }

        eval {
            PVE::Tools::run_command(['systemctl', 'stop', 'corosync']);
            
            if (-f '/etc/corosync/corosync.conf') {
                my $backup = '/etc/corosync/corosync.conf.backup.' . time();
                rename('/etc/corosync/corosync.conf', $backup);
            }
            
            if (-f '/etc/pve/corosync.conf') {
                my $backup = '/etc/pve/corosync.conf.backup.' . time();
                rename('/etc/pve/corosync.conf', $backup);
            }
            
            PVE::Tools::run_command(['systemctl', 'restart', 'pve-cluster']);
        };
        if (my $err = $@) {
            eval { PVE::Tools::run_command(['systemctl', 'start', 'corosync']); };
            eval { PVE::Tools::run_command(['systemctl', 'restart', 'pve-cluster']); };
            die "Failed to quit cluster: $err\n";
        }

        return {
            success => JSON::true,
            message => "Successfully left the cluster. Node '$nodename' is now standalone.",
        };
    }
});

__PACKAGE__->register_method ({
    name => 'remove_node',
    path => 'remove/{nodename}',
    method => 'POST',
    protected => 1,
    permissions => { check => ['perm', '/', ['Sys.Modify']] },
    description => "Remove a node from the cluster.",
    parameters => {
        additionalProperties => 0,
        properties => {
            nodename => {
                type => 'string',
                description => 'The name of the node to remove from the cluster.',
            },
        },
    },
    returns => {
        type => 'object',
        properties => {
            success => { type => 'boolean' },
            message => { type => 'string' },
        },
    },
    code => sub {
        my ($param) = @_;

        my $target_node = $param->{nodename};
        my $current_node = PVE::INotify::nodename();
        my $nodes = PVE::Cluster::get_nodelist();

        if ($target_node eq $current_node) {
            die "Cannot remove current node. Use Quit Cluster to leave the cluster.\n";
        }

        if (!grep { $_ eq $target_node } @$nodes) {
            die "Node '$target_node' is not a member of this cluster.\n";
        }

        if (scalar(@$nodes) <= 1) {
            die "Cannot remove node: this is the only node in the cluster.\n";
        }

        eval {
            PVE::Tools::run_command(['pvecm', 'delnode', $target_node]);
        };
        if (my $err = $@) {
            eval { _remove_node_manual($target_node); };
            if (my $err2 = $@) {
                die "Failed to remove node '$target_node': $err\n";
            }
        }

        eval {
            my $node_dir = "/etc/pve/nodes/$target_node";
            if (-d $node_dir) {
                PVE::Tools::run_command(['rm', '-rf', $node_dir]);
            }
        };

        return {
            success => JSON::true,
            message => "Node '$target_node' has been removed from the cluster.",
        };
    }
});

sub _remove_node_manual {
    my ($nodename) = @_;

    my $conf_file = '/etc/pve/corosync.conf';
    die "Corosync config not found\n" unless -f $conf_file;

    my $conf = PVE::Tools::file_get_contents($conf_file);
    my @lines = split /\n/, $conf;
    my @new_lines;
    my $in_target_node = 0;
    my $brace_depth = 0;
    my $node_start_idx = -1;

    for (my $i = 0; $i < @lines; $i++) {
        my $line = $lines[$i];

        if ($line =~ /^\s*node\s*\{/) {
            $node_start_idx = scalar(@new_lines);
            $brace_depth = 1;
            push @new_lines, $line;
            next;
        }

        if ($brace_depth > 0) {
            $brace_depth++ if $line =~ /\{/;
            $brace_depth-- if $line =~ /\}/;

            if ($line =~ /name:\s*(\S+)/ && $1 eq $nodename) {
                $in_target_node = 1;
            }

            if ($brace_depth == 0) {
                if ($in_target_node) {
                    splice(@new_lines, $node_start_idx);
                    $in_target_node = 0;
                } else {
                    push @new_lines, $line;
                }
            } else {
                push @new_lines, $line unless $in_target_node;
            }
        } else {
            push @new_lines, $line;
        }
    }

    my $new_conf = join("\n", @new_lines);
    if ($new_conf =~ /config_version:\s*(\d+)/) {
        my $new_version = $1 + 1;
        $new_conf =~ s/config_version:\s*\d+/config_version: $new_version/;
    }

    PVE::Tools::file_set_contents($conf_file, $new_conf);
    PVE::Tools::run_command(['corosync-cfgtool', '-R']);
}

1;
