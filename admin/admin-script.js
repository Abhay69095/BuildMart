// Add at the beginning of the file
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        ${message}
        <span id="notification-close">&times;</span>
    `;
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.style.display = 'block';
    }, 100);
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
    
    // Close on click
    notification.querySelector('#notification-close').addEventListener('click', () => {
        notification.remove();
    });
}

// Check admin access before loading page
async function checkAdminAccess() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const token = localStorage.getItem('token');
        
        if (!user || !token) {
            window.location.href = '../index.html';
            return false;
        }

        if (user.role !== 'admin') {
            showNotification('Admin access required', 'error');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
            return false;
        }

        // Verify token with backend
        const response = await fetch('http://localhost:3000/api/verify-admin', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Token verification failed');
        }

        return true;
    } catch (error) {
        console.error('Admin access error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../index.html';
        return false;
    }
}

// Add WebSocket connection and real-time data handling
let ws;

function initializeWebSocket() {
    try {
        ws = new WebSocket('ws://localhost:3000');
        
        ws.onopen = () => {
            console.log('WebSocket connected');
            // Send initial ping
            pingServer();
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            } catch (error) {
                console.error('Error handling WebSocket message:', error);
            }
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        ws.onclose = () => {
            console.log('WebSocket disconnected. Reconnecting...');
            setTimeout(() => {
                if (ws.readyState === WebSocket.CLOSED) {
                    initializeWebSocket();
                }
            }, 3000);
        };
    } catch (error) {
        console.error('Error initializing WebSocket:', error);
        setTimeout(initializeWebSocket, 3000);
    }
}

function pingServer() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
        setTimeout(pingServer, 25000); // Ping every 25 seconds
    }
}

function handleWebSocketMessage(data) {
    switch(data.type) {
        case 'STATS_UPDATE':
            updateDashboardStats(data.stats);
            break;
        case 'NEW_ACTIVITY':
            prependActivity(data.activity);
            break;
        case 'STOCK_ALERT':
            showNotification(`Low stock alert: ${data.productName} (${data.stock} remaining)`, 'warning');
            break;
    }
}

// Add this helper function for activity icons
function getActivityIcon(type) {
    switch (type) {
        case 'order': return 'shopping-cart';
        case 'customer': return 'user-plus';
        case 'product': return 'box';
        case 'inquiry': return 'envelope';
        case 'user': return 'user-shield';
        default: return 'info-circle';
    }
}

// Update apiRequest function
async function apiRequest(endpoint, options = {}, retries = 3) {
    const token = localStorage.getItem('token');
    const baseURL = 'http://localhost:3000/api';
    
    while (retries > 0) {
        try {
            const response = await fetch(`${baseURL}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    ...options.headers
                }
            });
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response format');
            }
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Request failed with status ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            retries--;
            if (retries === 0) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

// Add this function to handle activity item creation
function createActivityElement(activity) {
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    
    const icon = getActivityIcon(activity.type);
    const date = new Date(activity.timestamp).toLocaleString();
    
    activityItem.innerHTML = `
        <div class="activity-icon ${activity.type}">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="activity-details">
            <p>${activity.message}</p>
            <small>${date}</small>
        </div>
    `;
    
    return activityItem;
}

// Update loadDashboardData function
async function loadDashboardData() {
    try {
        const stats = await apiRequest('/stats/dashboard');
        
        // Update stats cards with null checks
        document.querySelector('[data-stat="total-value"]').textContent = 
            `$${parseFloat(stats.totalValue || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        document.querySelector('[data-stat="total-customers"]').textContent = 
            (stats.totalCustomers || 0).toLocaleString();
        document.querySelector('[data-stat="total-inquiries"]').textContent = 
            (stats.totalInquiries || 0).toLocaleString();
        document.querySelector('[data-stat="total-products"]').textContent = 
            (stats.totalProducts || 0).toLocaleString();
        
        // Load recent activities
        const activities = await apiRequest('/activity/recent');
        const activityList = document.querySelector('.activity-list');
        activityList.innerHTML = '';
        
        if (!activities || activities.length === 0) {
            activityList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No recent activities</p>
                </div>
            `;
            return;
        }
        
        activities.forEach(activity => {
            if (activity && activity.type && activity.message) {
                const activityElement = createActivityElement(activity);
                activityList.appendChild(activityElement);
            }
        });
        
    } catch (error) {
        console.error('Dashboard loading error:', error);
        showNotification('Failed to load dashboard data', 'error');
        
        // Show error states
        document.querySelectorAll('[data-stat]').forEach(el => {
            el.innerHTML = '<span class="error-text">Error loading data</span>';
        });
        
        document.querySelector('.activity-list').innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load activities</p>
                <button onclick="loadDashboardData()" class="retry-btn">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

// Add section navigation functions
async function showSection(sectionId) {
    try {
        // Hide all sections
        document.querySelectorAll('.admin-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Remove active class from all nav items
        document.querySelectorAll('.admin-nav li').forEach(item => {
            item.classList.remove('active');
        });
        
        // Show selected section and update nav
        const selectedSection = document.getElementById(sectionId);
        if (selectedSection) {
            selectedSection.style.display = 'block';
            const navItem = document.querySelector(`.admin-nav a[href="#${sectionId}"]`).parentElement;
            navItem.classList.add('active');
            
            // Load section data
            await loadSectionContent(sectionId);
        }
    } catch (error) {
        console.error('Error showing section:', error);
        showNotification('Failed to load section content', 'error');
    }
}

async function loadSectionContent(sectionId) {
    switch(sectionId) {
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'products':
            await loadProducts();
            break;
        case 'orders':
            await loadOrders();
            break;
        case 'customers':
            await loadCustomers();
            break;
        case 'inquiries':
            await loadInquiries();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// Add missing section loading functions
async function loadProducts() {
    try {
        const products = await apiRequest('/products');
        const productsList = document.querySelector('.products-list');
        productsList.innerHTML = `
            <button class="add-product-btn">
                <i class="fas fa-plus"></i>
                Add New Product
            </button>
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Name</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map(product => `
                            <tr>
                                <td><img src="${product.imageUrl}" alt="${product.name}" class="product-thumbnail"></td>
                                <td>${product.name}</td>
                                <td>${product.category}</td>
                                <td>$${product.price.toFixed(2)}</td>
                                <td>${product.stock}</td>
                                <td>
                                    <button class="action-btn edit-btn" data-id="${product._id}">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="action-btn delete-btn" data-id="${product._id}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        // Add event listener for add product button
        document.querySelector('.add-product-btn').addEventListener('click', showAddProductModal);
        
        // Add event listeners for edit and delete buttons
        addProductEventListeners();
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Failed to load products', 'error');
    }
}

function showAddProductModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2 class="modal-title">Add New Product</h2>
            <form id="addProductForm" class="product-form">
                <div class="form-group">
                    <label for="productName">Product Name</label>
                    <input type="text" id="productName" name="name" required>
                </div>
                <div class="form-group">
                    <label for="productCategory">Category</label>
                    <select id="productCategory" name="category" required>
                        <option value="">Select Category</option>
                        <option value="tools">Tools</option>
                        <option value="materials">Materials</option>
                        <option value="safety">Safety</option>
                        <option value="electrical">Electrical</option>
                        <option value="paint">Paint</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="productPrice">Price</label>
                    <input type="number" id="productPrice" name="price" step="0.01" required>
                </div>
                <div class="form-group">
                    <label for="productStock">Stock</label>
                    <input type="number" id="productStock" name="stock" required>
                </div>
                <div class="form-group full-width">
                    <label for="productDescription">Description</label>
                    <textarea id="productDescription" name="description" required></textarea>
                </div>
                <div class="form-group">
                    <label for="productImage">Image URL</label>
                    <input type="url" id="productImage" name="imageUrl" required>
                </div>
                <div class="form-group">
                    <button type="submit" class="submit-btn">Add Product</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'block';

    // Close modal functionality
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => {
        modal.remove();
    };

    // Close modal when clicking outside
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.remove();
        }
    };

    // Handle form submission
    const form = document.getElementById('addProductForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const productData = Object.fromEntries(formData);

        try {
            await apiRequest('/products', {
                method: 'POST',
                body: JSON.stringify(productData)
            });

            showNotification('Product added successfully', 'success');
            modal.remove();
            loadProducts(); // Reload products list
        } catch (error) {
            console.error('Error adding product:', error);
            showNotification('Failed to add product', 'error');
        }
    };
}

// --- Add/Edit Product Modal ---
function showEditProductModal(product) {
    // Remove any existing modal
    const existing = document.getElementById('editProductModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'editProductModal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2 class="modal-title">Edit Product</h2>
            <form id="editProductForm" class="product-form">
                <div class="form-group">
                    <label for="editProductName">Product Name</label>
                    <input type="text" id="editProductName" name="name" value="${product.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="editProductCategory">Category</label>
                    <select id="editProductCategory" name="category" required>
                        <option value="">Select Category</option>
                        <option value="tools" ${product.category === 'tools' ? 'selected' : ''}>Tools</option>
                        <option value="materials" ${product.category === 'materials' ? 'selected' : ''}>Materials</option>
                        <option value="safety" ${product.category === 'safety' ? 'selected' : ''}>Safety</option>
                        <option value="electrical" ${product.category === 'electrical' ? 'selected' : ''}>Electrical</option>
                        <option value="paint" ${product.category === 'paint' ? 'selected' : ''}>Paint</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="editProductPrice">Price</label>
                    <input type="number" id="editProductPrice" name="price" step="0.01" value="${product.price || 0}" required>
                </div>
                <div class="form-group">
                    <label for="editProductStock">Stock</label>
                    <input type="number" id="editProductStock" name="stock" value="${product.stock || 0}" required>
                </div>
                <div class="form-group full-width">
                    <label for="editProductDescription">Description</label>
                    <textarea id="editProductDescription" name="description" required>${product.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="editProductImage">Image URL</label>
                    <input type="url" id="editProductImage" name="imageUrl" value="${product.imageUrl || ''}" required>
                </div>
                <div class="form-group">
                    <button type="submit" class="submit-btn">Save Changes</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';

    // Close modal functionality
    modal.querySelector('.close').onclick = () => modal.remove();
    window.onclick = (event) => {
        if (event.target === modal) modal.remove();
    };

    // Handle form submission
    const form = document.getElementById('editProductForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const updatedProduct = Object.fromEntries(formData);
        try {
            await apiRequest(`/products/${product._id}`, {
                method: 'PUT',
                body: JSON.stringify(updatedProduct)
            });
            showNotification('Product updated successfully', 'success');
            modal.remove();
            loadProducts();
        } catch (error) {
            console.error('Error updating product:', error);
            showNotification('Failed to update product', 'error');
        }
    };
}

// --- Edit Product Handler ---
async function editProduct(productId) {
    try {
        // Use the correct API endpoint with /api prefix
        const product = await apiRequest(`/products/${productId}`);
        showEditProductModal(product);
    } catch (error) {
        console.error('Error fetching product:', error);
        showNotification('Failed to load product details', 'error');
    }
}

// --- Delete Product Handler ---
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
        await apiRequest(`/products/${productId}`, { method: 'DELETE' });
        showNotification('Product deleted successfully', 'success');
        loadProducts();
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Failed to delete product', 'error');
    }
}

async function loadOrders() {
    try {
        const orders = await apiRequest('/orders');
        const ordersList = document.querySelector('.orders-list');
        ordersList.innerHTML = `
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.map(order => `
                            <tr>
                                <td>${order._id}</td>
                                <td>${order.customerName}</td>
                                <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                                <td>$${order.total.toFixed(2)}</td>
                                <td><span class="status-badge ${order.status.toLowerCase()}">${order.status}</span></td>
                                <td>
                                    <button class="action-btn view-btn" data-id="${order._id}">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        // Add event listeners for view buttons
        addOrderEventListeners();
    } catch (error) {
        console.error('Error loading orders:', error);
        showNotification('Failed to load orders', 'error');
    }
}

async function loadCustomers() {
    try {
        const customers = await apiRequest('/customers');
        const customersList = document.querySelector('.customers-list');
        customersList.innerHTML = `
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Joined</th>
                            <th>Orders</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customers.map(customer => `
                            <tr>
                                <td>${customer.name}</td>
                                <td>${customer.email}</td>
                                <td>${new Date(customer.createdAt).toLocaleDateString()}</td>
                                <td>${customer.orderCount || 0}</td>
                                <td>
                                    <button class="action-btn view-btn" data-id="${customer._id}">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        // Add event listeners for view buttons
        addCustomerEventListeners();
    } catch (error) {
        console.error('Error loading customers:', error);
        showNotification('Failed to load customers', 'error');
    }
}

async function loadInquiries() {
    try {
        // Fetch inquiries from your database
        const inquiries = await apiRequest('/contacts');
        const inquiriesList = document.querySelector('.contacts-list');
        inquiriesList.innerHTML = `
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Message</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${inquiries.map(inquiry => `
                            <tr>
                                <td>${inquiry.name || 'N/A'}</td>
                                <td>${inquiry.email || 'N/A'}</td>
                                <td>
                                    <span class="inquiry-message-short" data-id="${inquiry._id}">
                                        ${inquiry.message ? inquiry.message.substring(0, 50) + (inquiry.message.length > 50 ? '...' : '') : 'No message'}
                                    </span>
                                </td>
                                <td>${new Date(inquiry.createdAt).toLocaleDateString()}</td>
                                <td><span class="status-badge ${inquiry.status || 'pending'}">${inquiry.status || 'pending'}</span></td>
                                <td>
                                    <button class="action-btn respond-btn" data-id="${inquiry._id}">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        // Add event listeners for respond/view buttons and message preview
        addInquiryEventListeners();
        document.querySelectorAll('.inquiry-message-short').forEach(span => {
            span.style.cursor = 'pointer';
            span.title = 'Click to view full message';
            span.addEventListener('click', () => showInquiryModal(span.dataset.id, inquiries));
        });
    } catch (error) {
        console.error('Error loading inquiries:', error);
        showNotification('Failed to load inquiries', 'error');
        document.querySelector('.contacts-list').innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load inquiries</p>
                <button onclick="loadInquiries()" class="retry-btn">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

// Show full inquiry message in a modal
function showInquiryModal(inquiryId, inquiriesArr) {
    const inquiry = (inquiriesArr || []).find(i => i._id === inquiryId);
    if (!inquiry) return;

    // Remove any existing modal
    const existing = document.getElementById('inquiryModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'inquiryModal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2 class="modal-title">Inquiry from ${inquiry.name || 'N/A'}</h2>
            <div class="mb-3"><strong>Email:</strong> ${inquiry.email || 'N/A'}</div>
            <div class="mb-3"><strong>Date:</strong> ${new Date(inquiry.createdAt).toLocaleString()}</div>
            <div class="mb-3"><strong>Status:</strong> <span class="status-badge">${inquiry.status || 'pending'}</span></div>
            <div class="mb-3"><strong>Message:</strong><br><div style="white-space:pre-line; background:#f8f9fa; padding:1rem; border-radius:6px;">${inquiry.message || ''}</div></div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';

    // Close modal functionality
    modal.querySelector('.close').onclick = () => modal.remove();
    window.onclick = (event) => {
        if (event.target === modal) modal.remove();
    };
}

// Add event listeners for respond/view buttons
function addInquiryEventListeners() {
    document.querySelectorAll('.respond-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            // Fetch latest inquiries to ensure up-to-date data
            const inquiries = await apiRequest('/contacts');
            showInquiryModal(btn.dataset.id, inquiries);
        });
    });
}

function loadSettings() {
    const settingsContainer = document.querySelector('.settings-container');
    settingsContainer.innerHTML = `
        <form id="settingsForm" class="admin-form">
            <div class="form-group">
                <h3>Store Settings</h3>
                <label for="storeName">Store Name</label>
                <input type="text" id="storeName" name="storeName" value="BuildMart">
                
                <label for="storeEmail">Contact Email</label>
                <input type="email" id="storeEmail" name="storeEmail" value="contact@buildmart.com">
            </div>
            
            <div class="form-group">
                <h3>Admin Account</h3>
                <label for="currentPassword">Current Password</label>
                <input type="password" id="currentPassword" name="currentPassword">
                
                <label for="newPassword">New Password</label>
                <input type="password" id="newPassword" name="newPassword">
                
                <label for="confirmPassword">Confirm Password</label>
                <input type="password" id="confirmPassword" name="confirmPassword">
            </div>
            
            <div class="form-actions">
                <button type="submit" class="save-btn">Save Changes</button>
            </div>
        </form>
    `;

    // Add event listener for settings form
    document.getElementById('settingsForm').addEventListener('submit', handleSettingsSubmit);
}

// Add event listener functions
function addProductEventListeners() {
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editProduct(btn.dataset.id));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
    });
}

function addOrderEventListeners() {
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => viewOrder(btn.dataset.id));
    });
}

function addCustomerEventListeners() {
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => viewCustomer(btn.dataset.id));
    });
}

async function handleSettingsSubmit(event) {
    event.preventDefault();
    // Add settings submission logic here
    showNotification('Settings saved successfully', 'success');
}

// Update page initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (await checkAdminAccess()) {
            // Initialize WebSocket
            initializeWebSocket();
            
            // Add navigation event listeners
            document.querySelectorAll('.admin-nav a').forEach(link => {
                link.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const sectionId = e.currentTarget.getAttribute('href').substring(1);
                    await showSection(sectionId);
                });
            });
            
            // Show dashboard by default
            await showSection('dashboard');
        }
    } catch (error) {
        console.error('Error initializing admin page:', error);
        showNotification('Error loading admin dashboard', 'error');
    }
});
