#!/bin/bash
# Build script for Proxmox Node Removal Addon

set -e

PACKAGE_NAME="proxmox-node-removal-addon"
VERSION="1.0.0"
BUILD_DIR=".build"

echo "Building $PACKAGE_NAME version $VERSION..."

# Create build directory
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

# Create the source tarball
echo "Creating source tarball..."
mkdir -p "$PACKAGE_NAME-$VERSION"
cp -r ../* "$PACKAGE_NAME-$VERSION/" 2>/dev/null || true
rm -rf "$PACKAGE_NAME-$VERSION/.build" "$PACKAGE_NAME-$VERSION/.dist" "$PACKAGE_NAME-$VERSION/.git"

tar czf "${PACKAGE_NAME}_${VERSION}.orig.tar.gz" "$PACKAGE_NAME-$VERSION"

cd "$PACKAGE_NAME-$VERSION"

# Build the Debian package
echo "Building Debian package..."
dpkg-buildpackage -us -uc

cd ../..

echo ""
echo "Build complete!"
echo "Package location: $BUILD_DIR"
ls -lh "$BUILD_DIR"/*.deb

echo ""
echo "To install the package on Proxmox:"
echo "  dpkg -i $BUILD_DIR/${PACKAGE_NAME}_${VERSION}-1_all.deb"
