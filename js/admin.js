// ============================================
// ADMIN LOGIC
// ============================================

var Admin = {

  // ── FORMATTING ────────────────────────────

  formatPrice(amount) {
    return '₦' + Number(amount).toLocaleString('en-NG');
  },

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-NG', {
      day:   'numeric',
      month: 'short',
      year:  'numeric'
    });
  },

  formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString('en-NG', {
      hour:   '2-digit',
      minute: '2-digit'
    }),

    addImageField(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var count = container.querySelectorAll('.image-field-row').length;

    var row = document.createElement('div');
    row.className = 'image-field-row';
    row.innerHTML = ''
      + '<input type="text"'
      + '       class="form-input"'
      + '       placeholder="images/products/another-image.jpg">'
      + '<span class="image-field-label">Image ' + (count + 1) + '</span>'
      + '<button type="button"'
      + '        class="image-field-remove"'
      + '        onclick="this.parentElement.remove()">'
      + '  ×'
      + '</button>';

    container.appendChild(row);
  },

  getImageUrls(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return [];

    var inputs = container.querySelectorAll('.form-input');
    var urls   = [];

    for (var i = 0; i < inputs.length; i++) {
      var url = inputs[i].value.trim();
      if (url.length > 0) {
        urls.push(url);
      }
    }

    return urls;
  };
  },

  // ── STATUS ────────────────────────────────

  getStatusBadge(status) {
    var colors = {
      pending:   'badge-warning',
      shipped:   'badge-info',
      delivered: 'badge-success',
      cancelled: 'badge-error'
    };

    var labels = {
      pending:   'Pending',
      shipped:   'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled'
    };

    var color = colors[status] || 'badge-warning';
    var label = labels[status] || status;

    return '<span class="badge ' + color + '">' + label + '</span>';
  },

  // ── DASHBOARD ─────────────────────────────

  async initDashboard() {
    AdminAuth.init();
    await this.loadDashboardStats();
    await this.loadRecentOrders();
    await this.loadLowStockProducts();
  },

  async loadDashboardStats() {
    try {
      // Get all orders
      var ordersSnap = await db.collection('orders')
        .orderBy('date', 'desc')
        .get();

      var orders       = [];
      var totalRevenue = 0;

      ordersSnap.forEach(function(doc) {
        var order = doc.data();
        orders.push(order);
        totalRevenue += order.summary.subtotal;
      });

      // Get all products
      var productsSnap = await db.collection('products').get();
      var productCount = productsSnap.size;

      // Get low stock count
      var lowStock = 0;
      productsSnap.forEach(function(doc) {
        if (doc.data().stock <= 5) lowStock++;
      });

      // Update stats cards
      this.setEl('statTotalOrders',   orders.length);
      this.setEl('statTotalRevenue',  this.formatPrice(totalRevenue));
      this.setEl('statTotalProducts', productCount);
      this.setEl('statLowStock',      lowStock);

    } catch (error) {
      console.error('Error loading stats:', error);
    }
  },

  async loadRecentOrders() {
    var container = document.getElementById('recentOrders');
    if (!container) return;

    try {
      var snap = await db.collection('orders')
        .orderBy('date', 'desc')
        .limit(5)
        .get();

      if (snap.empty) {
        container.innerHTML = '<p class="empty-state">No orders yet</p>';
        return;
      }

      var html = '';
      snap.forEach(function(doc) {
        var order = doc.data();
        html += ''
          + '<tr>'
          + '  <td><span class="order-id">' + order.id + '</span></td>'
          + '  <td>' + order.customer.name + '</td>'
          + '  <td>' + Admin.formatPrice(order.summary.subtotal) + '</td>'
          + '  <td>' + Admin.getStatusBadge(order.status) + '</td>'
          + '  <td>' + Admin.formatDate(order.date) + '</td>'
          + '  <td>'
          + '    <a href="orders.html?id=' + order.id + '"'
          + '       class="btn-table">View</a>'
          + '  </td>'
          + '</tr>';
      });

      container.innerHTML = html;

    } catch (error) {
      console.error('Error loading recent orders:', error);
    }
  },

  async loadLowStockProducts() {
    var container = document.getElementById('lowStockProducts');
    if (!container) return;

    try {
      var snap = await db.collection('products')
        .where('stock', '<=', 5)
        .get();

      if (snap.empty) {
        container.innerHTML = '<p class="empty-state">No low stock items</p>';
        return;
      }

      var html = '';
      snap.forEach(function(doc) {
        var p = doc.data();
        html += ''
          + '<tr>'
          + '  <td>' + p.name + '</td>'
          + '  <td>'
          +      (p.stock === 0
                  ? '<span class="badge badge-error">Out of Stock</span>'
                  : '<span class="badge badge-warning">' + p.stock + ' left</span>')
          + '  </td>'
          + '  <td>'
          + '    <a href="edit-product.html?id=' + p.id + '"'
          + '       class="btn-table">Edit</a>'
          + '  </td>'
          + '</tr>';
      });

      container.innerHTML = html;

    } catch (error) {
      console.error('Error loading low stock:', error);
    }
  },

  // ── ORDERS ───────────────────────────────

  async initOrdersPage() {
    AdminAuth.init();
    await this.loadAllOrders();
    this.bindOrderFilters();
  },

  async loadAllOrders(status) {
    var container = document.getElementById('ordersTableBody');
    if (!container) return;

    container.innerHTML = '<tr><td colspan="6" class="loading-row">Loading orders...</td></tr>';

    try {
      var query = db.collection('orders').orderBy('date', 'desc');

      if (status && status !== 'all') {
        query = db.collection('orders').where('status', '==', status);
      }

      var snap = await query.get();

      if (snap.empty) {
        container.innerHTML = '<tr><td colspan="6" class="empty-row">No orders found</td></tr>';
        return;
      }

      var html = '';
      snap.forEach(function(doc) {
        var order = doc.data();
        html += ''
          + '<tr>'
          + '  <td><span class="order-id">' + order.id + '</span></td>'
          + '  <td>'
          + '    <strong>' + order.customer.name + '</strong><br>'
          + '    <small>' + order.customer.phone + '</small>'
          + '  </td>'
          + '  <td>' + order.items.length + ' item' + (order.items.length !== 1 ? 's' : '') + '</td>'
          + '  <td>' + Admin.formatPrice(order.summary.subtotal) + '</td>'
          + '  <td>' + Admin.getStatusBadge(order.status) + '</td>'
          + '  <td>' + Admin.formatDate(order.date) + '</td>'
          + '  <td>'
          + '    <select class="status-select"'
          + '            onchange="Admin.updateStatus(\'' + order.id + '\', this.value)">'
          + '      <option value="pending"   ' + (order.status === 'pending'   ? 'selected' : '') + '>Pending</option>'
          + '      <option value="shipped"   ' + (order.status === 'shipped'   ? 'selected' : '') + '>Shipped</option>'
          + '      <option value="delivered" ' + (order.status === 'delivered' ? 'selected' : '') + '>Delivered</option>'
          + '      <option value="cancelled" ' + (order.status === 'cancelled' ? 'selected' : '') + '>Cancelled</option>'
          + '    </select>'
          + '  </td>'
          + '</tr>';
      });

      container.innerHTML = html;

    } catch (error) {
      console.error('Error loading orders:', error);
    }
  },

  async updateStatus(orderId, status) {
    try {
      await db.collection('orders').doc(orderId).update({
        status: status
      });
      this.showNotification('Order status updated', 'success');
    } catch (error) {
      this.showNotification('Failed to update status', 'error');
    }
  },

  bindOrderFilters() {
    var filterBtns = document.querySelectorAll('[data-status-filter]');
    var self       = this;

    filterBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        filterBtns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        self.loadAllOrders(btn.dataset.statusFilter);
      });
    });
  },

  // ── PRODUCTS ─────────────────────────────

  async initProductsPage() {
    AdminAuth.init();
    await this.loadAllProducts();
  },

  async loadAllProducts() {
    var container = document.getElementById('productsTableBody');
    if (!container) return;

    container.innerHTML = '<tr><td colspan="6" class="loading-row">Loading products...</td></tr>';

    try {
      var snap = await db.collection('products')
        .orderBy('dateAdded', 'desc')
        .get();

      if (snap.empty) {
        container.innerHTML = '<tr><td colspan="6" class="empty-row">No products found</td></tr>';
        return;
      }

      var html = '';
      snap.forEach(function(doc) {
        var p = doc.data();
        html += ''
          + '<tr>'
          + '  <td>'
          + '    <div class="product-row-info">'
          + '      <img src="../' + p.images[0] + '"'
          + '           alt="' + p.name + '"'
          + '           class="product-row-img">'
          + '      <span>' + p.name + '</span>'
          + '    </div>'
          + '  </td>'
          + '  <td>' + p.category + '</td>'
          + '  <td>' + Admin.formatPrice(p.onSale ? p.salePrice : p.price) + '</td>'
          + '  <td>'
          +      (p.stock === 0
                  ? '<span class="badge badge-error">Out of Stock</span>'
                  : p.stock <= 5
                    ? '<span class="badge badge-warning">' + p.stock + ' left</span>'
                    : '<span class="badge badge-success">' + p.stock + ' in stock</span>')
          + '  </td>'
          + '  <td>'
          +      (p.featured
                  ? '<span class="badge badge-info">Featured</span>'
                  : '<span class="badge badge-neutral">No</span>')
          + '  </td>'
          + '  <td>'
          + '    <div class="table-actions">'
          + '      <a href="edit-product.html?id=' + p.id + '"'
          + '         class="btn-table btn-table-edit">Edit</a>'
          + '      <button class="btn-table btn-table-delete"'
          + '              onclick="Admin.deleteProduct(\'' + p.id + '\', \'' + p.name + '\')">'
          + '        Delete'
          + '      </button>'
          + '    </div>'
          + '  </td>'
          + '</tr>';
      });

      container.innerHTML = html;

    } catch (error) {
      console.error('Error loading products:', error);
    }
  },

  async deleteProduct(productId, productName) {
    var confirmed = confirm('Delete "' + productName + '"?\nThis cannot be undone.');
    if (!confirmed) return;

    try {
      await db.collection('products').doc(productId).delete();
      this.showNotification('Product deleted', 'success');
      this.loadAllProducts();
    } catch (error) {
      this.showNotification('Failed to delete product', 'error');
    }
  },

  // ── ADD PRODUCT ───────────────────────────

  initAddProductPage() {
    AdminAuth.init();
    this.loadCategoriesDropdown('addCategory');
    this.bindAddProductForm();
  },

  async loadCategoriesDropdown(selectId) {
    var select = document.getElementById(selectId);
    if (!select) return;

    var snap = await db.collection('categories').get();

    var html = '<option value="">Select Category</option>';
    snap.forEach(function(doc) {
      var cat = doc.data();
      html += '<option value="' + cat.id + '">' + cat.name + '</option>';
    });

    select.innerHTML = html;
  },

  bindAddProductForm() {
    var form = document.getElementById('addProductForm');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      await Admin.submitAddProduct();
    });
  },

  async submitAddProduct() {
    var name        = document.getElementById('addName').value.trim();
    var category    = document.getElementById('addCategory').value;
    var subcategory = document.getElementById('addSubcategory').value.trim();
    var price       = parseFloat(document.getElementById('addPrice').value);
    var onSale      = document.getElementById('addOnSale').checked;
    var salePrice   = parseFloat(document.getElementById('addSalePrice').value) || 0;
    var description = document.getElementById('addDescription').value.trim();
    var stock       = parseInt(document.getElementById('addStock').value);
    var featured    = document.getElementById('addFeatured').checked;
    var images = this.getImageUrls('addImageFields');
    var tags        = document.getElementById('addTags').value
                        .split(',')
                        .map(function(t) { return t.trim(); })
                        .filter(function(t) { return t.length > 0; });
    var variantsRaw = document.getElementById('addVariants').value.trim();
    var sizesRaw    = document.getElementById('addSizes').value.trim();

    var variants = [];
    if (variantsRaw.length > 0) {
      var colorNames = variantsRaw.split(',').map(function(c) { return c.trim(); }).filter(function(c) { return c.length > 0; });
      var stockPerVariant = Math.floor(stock / colorNames.length) || 0;

      variants = colorNames.map(function(color) {
        return { color: color, stock: stockPerVariant };
      });
    }

    var sizes = [];
    if (sizesRaw.length > 0) {
      sizes = sizesRaw.split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
    }

    // Validation
    if (!name || !category || !price || !description || !stock || images.length === 0) {
      Admin.showNotification('Please fill in all required fields', 'error');
      return;
    }

    var btn = document.getElementById('addProductBtn');
    btn.textContent = 'Adding...';
    btn.disabled    = true;

    // Create product ID from name
    var productId = 'prod-' + Date.now();
    var slug      = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    var product = {
      id:               productId,
      name:             name,
      slug:             slug,
      category:         category,
      subcategory:      subcategory,
      price:            price,
      onSale:           onSale,
      salePrice:        onSale ? salePrice : price,
      description:      description,
      shortDescription: description.substring(0, 80),
      stock:            stock,
      featured:         featured,
      tags:             tags,
      images:           images,
      features:         [],
      variants:         variants,
      sizes:            sizes,
      rating:           0,
      reviewCount:      0,
      dateAdded:        new Date().toISOString().split('T')[0],
      sku:              category.toUpperCase() + '-' + Date.now()
    };

    try {
      await db.collection('products').doc(productId).set(product);
      Admin.showNotification('Product added!', 'success');

      setTimeout(function() {
        window.location.href = 'products.html';
      }, 1500);

    } catch (error) {
      Admin.showNotification('Failed to add product', 'error');
      btn.textContent = 'Add Product';
      btn.disabled    = false;
    }
  },

  // ── EDIT PRODUCT ──────────────────────────

  async initEditProductPage() {
    AdminAuth.init();
    await this.loadCategoriesDropdown('editCategory');

    var params    = new URLSearchParams(window.location.search);
    var productId = params.get('id');

    if (!productId) {
      window.location.href = 'products.html';
      return;
    }

    await this.loadProductForEdit(productId);
    this.bindEditProductForm(productId);
  },

  async loadProductForEdit(productId) {
    try {
      var doc = await db.collection('products').doc(productId).get();

      if (!doc.exists) {
        window.location.href = 'products.html';
        return;
      }

      var p = doc.data();

      // Fill form fields
      document.getElementById('editName').value        = p.name        || '';
      document.getElementById('editCategory').value    = p.category    || '';
      document.getElementById('editSubcategory').value = p.subcategory || '';
      document.getElementById('editPrice').value       = p.price       || '';
      document.getElementById('editOnSale').checked    = p.onSale      || false;
      document.getElementById('editSalePrice').value   = p.salePrice   || '';
      document.getElementById('editDescription').value = p.description || '';
      document.getElementById('editStock').value       = p.stock       || '';
      document.getElementById('editFeatured').checked  = p.featured    || false;
      document.getElementById('editImageUrl').value    = p.images[0]   || '';
      document.getElementById('editTags').value        = (p.tags || []).join(', ');

      // Show current image
      // Show current images preview
      var previewContainer = document.getElementById('currentImages');
      if (previewContainer && p.images && p.images.length > 0) {
        var previewHTML = '';
        for (var i = 0; i < p.images.length; i++) {
          previewHTML += ''
            + '<div class="current-image-item">'
            + '  <img src="../' + p.images[i] + '" alt="Image ' + (i + 1) + '">'
            + '  <span class="image-number">' + (i + 1) + '</span>'
            + '</div>';
        }
        previewContainer.innerHTML = previewHTML;
      }

      // Fill image fields
      var imageFieldsContainer = document.getElementById('editImageFields');
      if (imageFieldsContainer && p.images) {
        var fieldsHTML = '';
        for (var j = 0; j < p.images.length; j++) {
          var label = j === 0 ? 'Main Image' : 'Image ' + (j + 1);
          fieldsHTML += ''
            + '<div class="image-field-row">'
            + '  <input type="text"'
            + '         class="form-input"'
            + '         value="' + p.images[j] + '">'
            + '  <span class="image-field-label">' + label + '</span>'
            + (j > 0
              ? '<button type="button"'
                + '        class="image-field-remove"'
                + '        onclick="this.parentElement.remove()">×</button>'
              : '')
            + '</div>';
        }
        imageFieldsContainer.innerHTML = fieldsHTML;
      }

    } catch (error) {
      console.error('Error loading product:', error);
    }
  },

  bindEditProductForm(productId) {
    var form = document.getElementById('editProductForm');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      await Admin.submitEditProduct(productId);
    });
    // Variants
      var variantColors = '';
      if (p.variants && p.variants.length > 0) {
        variantColors = p.variants.map(function(v) { return v.color; }).join(', ');
      }
      document.getElementById('editVariants').value = variantColors;

      // Sizes
      document.getElementById('editSizes').value = (p.sizes || []).join(', ');
  },

  async submitEditProduct(productId) {
    var name        = document.getElementById('editName').value.trim();
    var category    = document.getElementById('editCategory').value;
    var subcategory = document.getElementById('editSubcategory').value.trim();
    var price       = parseFloat(document.getElementById('editPrice').value);
    var onSale      = document.getElementById('editOnSale').checked;
    var salePrice   = parseFloat(document.getElementById('editSalePrice').value) || 0;
    var description = document.getElementById('editDescription').value.trim();
    var stock       = parseInt(document.getElementById('editStock').value);
    var featured    = document.getElementById('editFeatured').checked;
    var images = Admin.getImageUrls('editImageFields');
    var tags        = document.getElementById('editTags').value
                        .split(',')
                        .map(function(t) { return t.trim(); })
                        .filter(function(t) { return t.length > 0; });
    var variantsRaw = document.getElementById('editVariants').value.trim();
    var sizesRaw    = document.getElementById('editSizes').value.trim();

    var variants = [];
    if (variantsRaw.length > 0) {
      var colorNames = variantsRaw.split(',').map(function(c) { return c.trim(); }).filter(function(c) { return c.length > 0; });
      var stockPerVariant = Math.floor(stock / colorNames.length) || 0;

      variants = colorNames.map(function(color) {
        return { color: color, stock: stockPerVariant };
      });
    }

    var sizes = [];
    if (sizesRaw.length > 0) {
      sizes = sizesRaw.split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
    }

    if (!name || !category || !price || !description || !stock) {
      Admin.showNotification('Please fill in all required fields', 'error');
      return;
    }

    var btn = document.getElementById('editProductBtn');
    btn.textContent = 'Saving...';
    btn.disabled    = true;

    var updates = {
      name:             name,
      category:         category,
      subcategory:      subcategory,
      price:            price,
      onSale:           onSale,
      salePrice:        onSale ? salePrice : price,
      description:      description,
      shortDescription: description.substring(0, 80),
      stock:            stock,
      featured:         featured,
      tags:             tags,
      variants:         variants,
      sizes:            sizes
    };//omo

    if (images.length > 0) {
      updates.images = images;
    }

    try {
      await db.collection('products').doc(productId).update(updates);
      Admin.showNotification('Product updated!', 'success');

      setTimeout(function() {
        window.location.href = 'products.html';
      }, 1500);

    } catch (error) {
      Admin.showNotification('Failed to update product', 'error');
      btn.textContent = 'Save Changes';
      btn.disabled    = false;
    }
  },

  // ── HELPERS ──────────────────────────────

  setEl(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  },

  showNotification(message, type) {
    var container = document.querySelector('.admin-notifications');
    if (!container) return;

    var note = document.createElement('div');
    note.className = 'admin-notification admin-notification-' + type;
    note.textContent = message;
    container.appendChild(note);

    setTimeout(function() { note.remove(); }, 3000);
  }

};