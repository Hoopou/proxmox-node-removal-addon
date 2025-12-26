# Proxmox Node Removal Addon - Makefile

.PHONY: build install clean test help

PACKAGE_NAME=proxmox-node-removal-addon
VERSION=1.0.0
BUILD_DIR=.build
INSTALL_PREFIX=/opt/pve-addons

help:
	@echo "$(PACKAGE_NAME) Makefile targets:"
	@echo "  make build    - Build the .deb package"
	@echo "  make clean    - Clean build artifacts"
	@echo "  make test     - Run tests"
	@echo "  make help     - Show this help message"

build:
	@echo "Building $(PACKAGE_NAME)..."
	@mkdir -p $(BUILD_DIR)
	@cd $(BUILD_DIR) && \
	mkdir -p $(PACKAGE_NAME)-$(VERSION) && \
	cp -r ../* $(PACKAGE_NAME)-$(VERSION)/ 2>/dev/null || true && \
	rm -rf $(PACKAGE_NAME)-$(VERSION)/.build $(PACKAGE_NAME)-$(VERSION)/.dist $(PACKAGE_NAME)-$(VERSION)/.git && \
	tar czf $(PACKAGE_NAME)_$(VERSION).orig.tar.gz $(PACKAGE_NAME)-$(VERSION) && \
	cd $(PACKAGE_NAME)-$(VERSION) && \
	dpkg-buildpackage -us -uc
	@echo "Build complete. Package: $(BUILD_DIR)/$(PACKAGE_NAME)_$(VERSION)-1_all.deb"

install: build
	@echo "Installing $(PACKAGE_NAME)..."
	@dpkg -i $(BUILD_DIR)/$(PACKAGE_NAME)_$(VERSION)-1_all.deb

uninstall:
	@echo "Uninstalling $(PACKAGE_NAME)..."
	@dpkg -r $(PACKAGE_NAME) || true
	@systemctl restart pveproxy || true

clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(BUILD_DIR)

test:
	@echo "Running tests..."
	@echo "Testing Perl modules..."
	@perl -c PVE/API2/NodeRemoval.pm
	@echo "All tests passed!"

.SILENT: help clean
