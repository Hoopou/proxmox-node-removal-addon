package PVE::NodeRemoval;

use strict;
use warnings;
use PVE::Cluster qw(cfs_read_file cfs_write_file);
use PVE::Tools;
use PVE::INotify;
use PVE::QemuServer;
use PVE::LXC;

=head1 PVE::NodeRemoval

Module for managing node removal from Proxmox cluster with safety checks and automation.

=cut

sub validate_node_removal {
    my ($nodename) = @_;

    my $errors = [];
    my $warnings = [];

    # Check if node exists
    my $nodes = PVE::Cluster::get_nodelist();
    if (!grep { $_ eq $nodename } @$nodes) {
        push @$errors, "Node '$nodename' does not exist in cluster";
        return { valid => 0, errors => $errors, warnings => $warnings };
    }

    # Check cluster size
    if (scalar(@$nodes) < 3) {
        push @$warnings, "Cluster has " . scalar(@$nodes) . " node(s). Ensure sufficient quorum remains.";
    }

    # Check if node is online
    my $status = PVE::Cluster::check_node_status($nodename);
    if ($status && $status eq 'online') {
        push @$warnings, "Node is currently online. It will be powered off during removal.";
    }

    # Check for VMs/containers on node
    my $vms = _get_node_vms($nodename);
    if (@$vms) {
        push @$warnings, "Found " . scalar(@$vms) . " VM(s)/Container(s) on node. They must be migrated.";
    }

    return { valid => 1, errors => $errors, warnings => $warnings };
}

sub get_node_vms {
    my ($nodename) = @_;
    return _get_node_vms($nodename);
}

sub _get_node_vms {
    my ($nodename) = @_;
    
    my $vms = [];
    
    # Get QEMU VMs on node
    my $qemu_cfg = PVE::QemuServer::load_config();
    foreach my $vmid (keys %$qemu_cfg) {
        my $conf = $qemu_cfg->{$vmid};
        if ($conf->{node} && $conf->{node} eq $nodename) {
            push @$vms, { type => 'qemu', id => $vmid, name => $conf->{name} || "VM $vmid" };
        }
    }

    # Get LXC containers on node
    my $lxc_cfg = PVE::LXC::load_config();
    foreach my $ctid (keys %$lxc_cfg) {
        my $conf = $lxc_cfg->{$ctid};
        if ($conf->{node} && $conf->{node} eq $nodename) {
            push @$vms, { type => 'lxc', id => $ctid, name => $conf->{hostname} || "Container $ctid" };
        }
    }

    return $vms;
}

sub get_node_storage {
    my ($nodename) = @_;
    
    my $storage = [];
    my $cfg = PVE::Storage::config();
    
    foreach my $storeid (keys %{$cfg->{ids}}) {
        my $scfg = $cfg->{ids}->{$storeid};
        if (!$scfg->{nodes} || $scfg->{nodes}->{$nodename}) {
            push @$storage, { id => $storeid, type => $scfg->{type} };
        }
    }
    
    return $storage;
}

sub drain_node {
    my ($nodename, $migration_target) = @_;
    
    my $vms = _get_node_vms($nodename);
    my $results = { migrated => [], failed => [] };
    
    foreach my $vm (@$vms) {
        eval {
            if ($vm->{type} eq 'qemu') {
                _migrate_qemu_vm($vm->{id}, $migration_target);
            } elsif ($vm->{type} eq 'lxc') {
                _migrate_lxc_ct($vm->{id}, $migration_target);
            }
            push @{$results->{migrated}}, $vm;
        };
        if ($@) {
            push @{$results->{failed}}, { vm => $vm, error => $@ };
        }
    }
    
    return $results;
}

sub _migrate_qemu_vm {
    my ($vmid, $target_node) = @_;
    
    # Execute Proxmox migration command
    my $cmd = [
        '/usr/bin/qm',
        'migrate',
        $vmid,
        $target_node,
        '--online',
        '1'
    ];
    
    PVE::Tools::run_command($cmd);
}

sub _migrate_lxc_ct {
    my ($ctid, $target_node) = @_;
    
    # Execute Proxmox migration command
    my $cmd = [
        '/usr/bin/pct',
        'migrate',
        $ctid,
        $target_node,
        '--online',
        '1'
    ];
    
    PVE::Tools::run_command($cmd);
}

sub remove_node {
    my ($nodename, $force) = @_;
    
    $force //= 0;
    
    # Validate before removal
    my $validation = validate_node_removal($nodename);
    if (!$validation->{valid} && !$force) {
        die "Node removal validation failed: " . join(", ", @{$validation->{errors}});
    }
    
    # Execute node removal
    my $cmd = ['/usr/bin/pvecm', 'delnode', $nodename];
    
    if ($force) {
        push @$cmd, '--force';
    }
    
    PVE::Tools::run_command($cmd);
    
    return { success => 1, node => $nodename };
}

sub get_removal_status {
    my ($nodename) = @_;
    
    my $status = {
        node => $nodename,
        vms => _get_node_vms($nodename),
        storage => get_node_storage($nodename),
        online => PVE::Cluster::check_node_status($nodename) eq 'online',
    };
    
    return $status;
}

1;
