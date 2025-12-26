#!/usr/bin/perl

# This script patches Proxmox API to register the NodeRemoval endpoints
# Run this after package installation

use strict;
use warnings;

my $cluster_pm = '/usr/share/perl5/PVE/API2/Cluster.pm';

# Check if already patched
my $content = do {
    open my $fh, '<', $cluster_pm or die "Cannot read $cluster_pm: $!";
    local $/;
    <$fh>;
};

if ($content =~ /NodeRemoval/) {
    print "Already patched.\n";
    exit 0;
}

# Add the use statement
unless ($content =~ s/(use PVE::API2::ClusterConfig;)/$1\nuse PVE::API2::NodeRemoval;/) {
    die "Failed to add use statement\n";
}

# Add the register_method call
my $register_block = q{
__PACKAGE__->register_method({
    subclass => "PVE::API2::NodeRemoval",
    path => 'nodes-removal',
});
};

# Insert after the last register_method block for subclass
unless ($content =~ s/(__PACKAGE__->register_method\(\{\s*subclass\s*=>\s*"PVE::API2::Cluster::Jobs",\s*path\s*=>\s*'jobs',\s*\}\);)/$1\n$register_block/) {
    # Try alternative insertion point
    unless ($content =~ s/(__PACKAGE__->register_method\(\{[^}]+path\s*=>\s*'jobs'[^}]+\}\);)/$1\n$register_block/) {
        die "Failed to add register_method\n";
    }
}

# Write back
open my $fh, '>', $cluster_pm or die "Cannot write $cluster_pm: $!";
print $fh $content;
close $fh;

print "Successfully patched $cluster_pm\n";
print "Restart pveproxy: systemctl restart pveproxy\n";
