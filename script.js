// ==================== FIREBASE CONFIGURATION ====================
const firebaseConfig = {
  apiKey: "AIzaSyAVvPXFzwbprJFHGk3iYOrUuWLdKZkI0VU",
  authDomain: "catlery-a4306.firebaseapp.com",
  projectId: "catlery-a4306",
  storageBucket: "catlery-a4306.firebasestorage.app",
  messagingSenderId: "931850924132",
  appId: "1:931850924132:web:be2ab4be301a803f832f71"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let currentRole = 'user';
let activeCategory = 'All';
let isRegisterMode = false;
let productsCache = [];
let categoriesCache = [];

// ==================== MODERN CENTERED CUSTOM ALERT MODAL ====================
function showCustomAlert(message) {
    let modal = document.getElementById('custom-alert-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'custom-alert-modal';
        modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); backdrop-filter: blur(4px); justify-content:center; align-items:center; z-index:9999;';
        modal.innerHTML = `
            <div style="background: #ffffff; padding: 30px 40px; border-radius: 16px; text-align: center; max-width: 420px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                <div style="font-size: 40px; margin-bottom: 10px;">✨</div>
                <p id="custom-alert-msg" style="margin-bottom: 25px; font-size: 16px; color: #333; line-height: 1.6; font-weight: 500;"></p>
                <button onclick="closeCustomAlert()" style="padding: 12px 30px; background: linear-gradient(135deg, #ff416c, #ff4b2b); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 15px; box-shadow: 0 4px 15px rgba(255, 65, 108, 0.4);">Got It</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    document.getElementById('custom-alert-msg').innerText = message;
    modal.style.display = 'flex';
}

function closeCustomAlert() {
    const modal = document.getElementById('custom-alert-modal');
    if (modal) modal.style.display = 'none';
}

// ==================== AUTH & SESSION LISTENER ====================
auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    const welcomeElem = document.getElementById('user-welcome-msg');
    const authBtn = document.getElementById('nav-auth-btn');
    const logoutBtn = document.getElementById('nav-logout-btn');
    const ordersNav = document.getElementById('nav-orders');
    const adminLink = document.getElementById('nav-admin-link');
    const sidebar = document.getElementById('sidebar');

    if (user) {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            currentRole = userDoc.data().role || 'user';
        } else {
            currentRole = 'user';
            await db.collection('users').doc(user.uid).set({
                email: user.email,
                role: 'user',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        if (welcomeElem) {
            welcomeElem.innerText = `Hi, ${user.email.split('@')[0]}`;
            welcomeElem.style.display = 'inline-block';
        }
        if (authBtn) authBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (ordersNav) ordersNav.style.display = 'inline-block';
        if (currentRole === 'admin' && adminLink) adminLink.style.display = 'inline-block';

        const mainCont = document.getElementById('admin-main-container');
        const loginCont = document.getElementById('admin-login-container');

        if (mainCont || loginCont) {
            if (currentRole === 'admin') {
                if (mainCont) mainCont.style.display = 'block';
                if (loginCont) loginCont.style.display = 'none';
                if (sidebar) sidebar.style.display = 'flex';
            } else {
                if (mainCont) mainCont.style.display = 'none';
                if (loginCont) loginCont.style.display = 'block';
                if (sidebar) sidebar.style.display = 'none';
            }
        }

        loadUserCart();
    } else {
        currentRole = 'user';
        if (welcomeElem) welcomeElem.style.display = 'none';
        if (authBtn) authBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (ordersNav) ordersNav.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
        if (sidebar) sidebar.style.display = 'none';

        const mainCont = document.getElementById('admin-main-container');
        const loginCont = document.getElementById('admin-login-container');
        if (mainCont) mainCont.style.display = 'none';
        if (loginCont) loginCont.style.display = 'block';

        updateCartUI([]);
    }

    if (typeof loadStorefrontData === 'function') loadStorefrontData();
    if (typeof loadAdminData === 'function' && currentRole === 'admin') loadAdminData();
});

function logoutUser() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}

// ==================== AUTH MODAL LOGIC ====================
function openAuthModal() { document.getElementById('auth-modal').style.display = 'flex'; }
function closeAuthModal() { document.getElementById('auth-modal').style.display = 'none'; }
function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    document.getElementById('auth-title').innerText = isRegisterMode ? 'Create Account' : 'Login to Your Account';
    document.getElementById('auth-submit-btn').innerText = isRegisterMode ? 'Register' : 'Login';
    document.getElementById('auth-switch-text').innerText = isRegisterMode ? 'Already have an account?' : "Don't have an account?";
}

async function handleAuthSubmit() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    if (!email || !password) {
        showCustomAlert('Please enter email and password.');
        return;
    }

    try {
        if (isRegisterMode) {
            const cred = await auth.createUserWithEmailAndPassword(email, password);
            await db.collection('users').doc(cred.user.uid).set({
                email: email,
                role: 'user',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showCustomAlert('Account registered successfully!');
        } else {
            await auth.signInWithEmailAndPassword(email, password);
            showCustomAlert('Logged in successfully!');
        }
        closeAuthModal();
    } catch (error) {
        showCustomAlert(error.message);
    }
}

// ==================== CONTACT US MODAL ====================
function openContactModal() { document.getElementById('contact-modal').style.display = 'flex'; }
function closeContactModal() { document.getElementById('contact-modal').style.display = 'none'; }

async function submitContactForm() {
    const name = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const message = document.getElementById('contact-msg').value.trim();

    if (!name || !email || !message) {
        showCustomAlert('Please fill all fields.');
        return;
    }

    try {
        await db.collection('contacts').add({
            name, email, message,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showCustomAlert('Your message has been sent successfully!');
        document.getElementById('contact-name').value = '';
        document.getElementById('contact-email').value = '';
        document.getElementById('contact-msg').value = '';
        closeContactModal();
    } catch (err) {
        showCustomAlert('Error: ' + err.message);
    }
}

// ==================== STOREFRONT LOGIC ====================
async function loadStorefrontData() {
    const catSnap = await db.collection('categories').get();
    categoriesCache = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderCategoryChips();

    const prodSnap = await db.collection('products').get();
    productsCache = prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderProductGrid();
}

function renderCategoryChips() {
    const container = document.getElementById('category-chips');
    if (!container) return;
    
    let html = `<div class="chip ${activeCategory === 'All' ? 'active' : ''}" onclick="filterCategory('All')">All Products</div>`;
    categoriesCache.forEach(cat => {
        html += `<div class="chip ${activeCategory === cat.name ? 'active' : ''}" onclick="filterCategory('${cat.name}')">${cat.name}</div>`;
    });
    container.innerHTML = html;
}

function filterCategory(catName) {
    activeCategory = catName;
    renderCategoryChips();
    renderProductGrid();
}

function renderProductGrid() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    let filtered = productsCache;
    if (activeCategory !== 'All') {
        filtered = productsCache.filter(p => p.category === activeCategory);
    }

    if (filtered.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; padding: 30px;">No products found in this category.</p>`;
        return;
    }

    let html = '';
    filtered.forEach(p => {
        let images = p.images || [];
        let primaryImg = images.length > 0 ? images[0] : 'https://via.placeholder.com/300';
        
        let thumbDotsHtml = '';
        if (images.length > 1) {
            images.forEach((img, idx) => {
                thumbDotsHtml += `<div class="swap-dot ${idx === 0 ? 'active' : ''}" onclick="event.stopPropagation(); switchCardImage('${p.id}', '${img}', this)" style="width:10px; height:10px; border-radius:50%; background:${idx === 0 ? 'var(--primary-color)' : '#ccc'}; cursor:pointer;"></div>`;
            });
        }

        let sizeHtml = '';
        if (p.sizeType === 'checkbox') {
            sizeHtml = `<div style="font-size:13px; color:#28a745; margin-bottom:8px;">✓ Standard Sizes Available</div>`;
        } else if (p.sizeType === 'manual' && p.sizes) {
            let sizeOpts = p.sizes.split(',').map(s => s.trim());
            sizeHtml = `<select class="product-sizes-select" id="size-select-${p.id}" onclick="event.stopPropagation()">`;
            sizeOpts.forEach(s => sizeHtml += `<option value="${s}">${s}</option>`);
            sizeHtml += `</select>`;
        }

        html += `
            <div class="product-card" onclick="openProductDetail('${p.id}')" style="cursor:pointer; background:#fff; border-radius:10px; padding:15px; box-shadow:0 4px 10px rgba(0,0,0,0.05); transition:transform 0.2s;">
                <div class="image-swapper" id="swapper-${p.id}" style="position:relative; background:#f9f9f9; border-radius:8px; overflow:hidden;">
                    <img src="${primaryImg}" id="main-img-${p.id}" alt="${p.title}" style="width:100%; height:200px; object-fit:cover; display:block; border-radius:8px;">
                    <div class="swap-dots" style="display:flex; justify-content:center; gap:6px; margin-top:8px; padding-bottom:4px;">${thumbDotsHtml}</div>
                </div>
                <div class="product-info" style="margin-top:10px;">
                    <div class="product-title"><strong>${p.title}</strong></div>
                    <div class="product-price" style="color:var(--primary-color); font-weight:bold; margin:4px 0;">$${parseFloat(p.price).toFixed(2)}</div>
                    <div class="product-desc" style="font-size:13px; color:#666; margin:5px 0; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${p.description}</div>
                    ${sizeHtml}
                </div>
                <div class="card-actions" style="display:flex; gap:10px; margin-top:12px;">
                    <button class="btn btn-secondary" style="flex:1;" onclick="event.stopPropagation(); addToCart('${p.id}', true)">Add to Cart</button>
                    <button class="btn" style="flex:1;" onclick="event.stopPropagation(); buyNow('${p.id}')">Buy Now</button>
                </div>
            </div>
        `;
    });
    grid.innerHTML = html;
}

function switchCardImage(productId, imgUrl, dotElem) {
    const mainImg = document.getElementById(`main-img-${productId}`);
    if (mainImg) mainImg.src = imgUrl;

    const parentSwapper = dotElem.parentElement;
    parentSwapper.querySelectorAll('.swap-dot').forEach(d => {
        d.classList.remove('active');
        d.style.background = '#ccc';
    });
    dotElem.classList.add('active');
    dotElem.style.background = 'var(--primary-color)';
}

// ==================== PRODUCT DETAIL MODAL ====================
function openProductDetail(productId) {
    const product = productsCache.find(p => p.id === productId);
    if (!product) return;

    let modal = document.getElementById('product-detail-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'product-detail-modal';
        modal.className = 'modal';
        modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); justify-content:center; align-items:center; z-index:9999;';
        modal.innerHTML = `
            <div class="modal-content" style="background:#fff; padding:30px; border-radius:16px; max-width:600px; width:90%; position:relative; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
                <span class="close-modal" onclick="closeProductDetail()" style="position:absolute; top:15px; right:20px; font-size:24px; cursor:pointer; font-weight:bold; color:#888;">&times;</span>
                <div id="detail-modal-body"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    let images = product.images || [];
    let galleryHtml = '';
    images.forEach((img, idx) => {
        galleryHtml += `<img src="${img}" style="width:70px; height:70px; object-fit:cover; border-radius:8px; cursor:pointer; border:2px solid ${idx === 0 ? 'var(--primary-color)' : '#ddd'}; transition:all 0.2s;" onclick="changeDetailMainImage('${img}', this)">`;
    });

    let body = document.getElementById('detail-modal-body');
    body.innerHTML = `
        <div style="text-align:center; margin-bottom:15px; background:#f9f9f9; border-radius:10px; padding:10px;">
            <img id="detail-main-img" src="${images[0] || ''}" style="width:100%; max-height:300px; object-fit:contain; border-radius:8px;">
        </div>
        <div style="display:flex; gap:10px; margin-bottom:15px; justify-content:center; overflow-x:auto; padding-bottom:5px;">
            ${galleryHtml}
        </div>
        <h2 style="margin-bottom:5px;">${product.title}</h2>
        <h3 style="color:var(--primary-color); margin:5px 0;">$${parseFloat(product.price).toFixed(2)}</h3>
        <p style="color:#555; margin:10px 0; line-height:1.5;">${product.description}</p>
        <p style="font-size:12px; color:#888; background:#f1f1f1; padding:8px; border-radius:6px; margin-top:10px;">💡 Click on the thumbnail images above to check multiple views of this product.</p>
    `;

    modal.style.display = 'flex';
}

function changeDetailMainImage(imgUrl, thumbElem) {
    document.getElementById('detail-main-img').src = imgUrl;
    thumbElem.parentElement.querySelectorAll('img').forEach(img => img.style.borderColor = '#ddd');
    thumbElem.style.borderColor = 'var(--primary-color)';
}

function closeProductDetail() {
    const modal = document.getElementById('product-detail-modal');
    if (modal) modal.style.display = 'none';
}

// ==================== PERSISTENT CART LOGIC ====================
async function loadUserCart() {
    if (!currentUser) return;
    const cartDoc = await db.collection('carts').doc(currentUser.uid).get();
    if (cartDoc.exists) {
        updateCartUI(cartDoc.data().items || []);
    } else {
        updateCartUI([]);
    }
}

async function saveUserCart(items) {
    if (!currentUser) return;
    await db.collection('carts').doc(currentUser.uid).set({ items });
}

async function addToCart(productId, showAlert = true) {
    if (!currentUser) {
        showCustomAlert('Please login first to add items to your cart.');
        openAuthModal();
        return false;
    }

    const product = productsCache.find(p => p.id === productId);
    if (!product) return false;

    let selectedSize = 'Standard';
    if (product.sizeType === 'manual') {
        const selectElem = document.getElementById(`size-select-${productId}`);
        if (selectElem) selectedSize = selectElem.value;
    }

    const cartDoc = await db.collection('carts').doc(currentUser.uid).get();
    let items = cartDoc.exists ? (cartDoc.data().items || []) : [];

    const existingIndex = items.findIndex(item => item.productId === productId && item.size === selectedSize);
    if (existingIndex > -1) {
        items[existingIndex].qty += 1;
    } else {
        items.push({
            productId: product.id,
            title: product.title,
            price: product.price,
            image: (product.images && product.images[0]) || '',
            size: selectedSize,
            qty: 1,
            selected: true
        });
    }

    await saveUserCart(items);
    updateCartUI(items);
    if (showAlert) {
        showCustomAlert('Product added to cart successfully!');
    }
    return true;
}

function updateCartUI(items) {
    const countElem = document.getElementById('cart-count');
    if (countElem) countElem.innerText = items.length;

    const container = document.getElementById('cart-items-container');
    const totalElem = document.getElementById('cart-total');
    if (!container || !totalElem) return;

    if (items.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#777; padding:20px;">Your cart is empty.</p>`;
        totalElem.innerText = '0.00';
        return;
    }

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #f1f1f1;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">
                <input type="checkbox" id="cart-select-all" onclick="toggleCartSelectAll(this)" style="width: 18px; height: 18px; cursor: pointer;"> Select All
            </label>
            <button class="btn btn-danger" style="padding: 4px 10px; font-size: 12px; border-radius: 4px;" onclick="removeSelectedCartItems()">Remove Selected</button>
        </div>
    `;

    let total = 0;
    items.forEach((item, idx) => {
        let isChecked = item.selected !== false;
        let subtotal = item.price * item.qty;
        if (isChecked) {
            total += subtotal;
        }

        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #eee; padding-bottom:12px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <input type="checkbox" class="cart-item-checkbox" ${isChecked ? 'checked' : ''} onchange="toggleCartItemSelection(${idx}, this.checked)" style="width:18px; height:18px; cursor:pointer;">
                    <img src="${item.image || 'https://via.placeholder.com/50'}" style="width:55px; height:55px; object-fit:cover; border-radius:8px; border:1px solid #ddd;">
                    <div>
                        <strong style="font-size:15px; color:#333;">${item.title}</strong><br>
                        <small style="color:#666;">Size: ${item.size} | Unit: $${item.price}</small>
                        
                        <div style="display:flex; align-items:center; gap:8px; margin-top:6px;">
                            <button onclick="changeCartItemQty(${idx}, -1)" style="width:24px; height:24px; background:#f1f1f1; border:1px solid #ccc; border-radius:4px; cursor:pointer; font-weight:bold; display:flex; align-items:center; justify-content:center;">-</button>
                            <span style="font-weight:bold; font-size:14px; min-width:20px; text-align:center;">${item.qty}</span>
                            <button onclick="changeCartItemQty(${idx}, 1)" style="width:24px; height:24px; background:#f1f1f1; border:1px solid #ccc; border-radius:4px; cursor:pointer; font-weight:bold; display:flex; align-items:center; justify-content:center;">+</button>
                        </div>
                    </div>
                </div>
                
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
                    <span style="font-weight:bold; font-size:15px; color:var(--primary-color);">$${subtotal.toFixed(2)}</span>
                    <button class="btn btn-danger" style="padding: 3px 8px; font-size:11px; border-radius:4px;" onclick="removeCartItem(${idx})">Remove</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    totalElem.innerText = total.toFixed(2);
}

async function toggleCartSelectAll(masterCheckbox) {
    if (!currentUser) return;
    const cartDoc = await db.collection('carts').doc(currentUser.uid).get();
    if (!cartDoc.exists) return;
    let items = cartDoc.data().items || [];
    
    items.forEach(item => {
        item.selected = masterCheckbox.checked;
    });

    await saveUserCart(items);
    updateCartUI(items);
}

async function removeSelectedCartItems() {
    if (!currentUser) return;
    const cartDoc = await db.collection('carts').doc(currentUser.uid).get();
    if (!cartDoc.exists) return;
    let items = cartDoc.data().items || [];

    let remainingItems = items.filter(item => item.selected === false);

    if (remainingItems.length === items.length) {
        showCustomAlert('Please select at least one item to remove.');
        return;
    }

    await saveUserCart(remainingItems);
    updateCartUI(remainingItems);
    showCustomAlert('Selected items removed successfully!');
}

async function toggleCartItemSelection(index, isChecked) {
    if (!currentUser) return;
    const cartDoc = await db.collection('carts').doc(currentUser.uid).get();
    if (!cartDoc.exists) return;
    let items = cartDoc.data().items || [];
    if (items[index]) {
        items[index].selected = isChecked;
        await saveUserCart(items);
        updateCartUI(items);
    }
}

async function changeCartItemQty(index, change) {
    if (!currentUser) return;
    const cartDoc = await db.collection('carts').doc(currentUser.uid).get();
    if (!cartDoc.exists) return;
    
    let items = cartDoc.data().items || [];
    if (items[index]) {
        items[index].qty += change;
        if (items[index].qty <= 0) {
            items.splice(index, 1);
        }
        await saveUserCart(items);
        updateCartUI(items);
    }
}

async function removeCartItem(index) {
    if (!currentUser) return;
    const cartDoc = await db.collection('carts').doc(currentUser.uid).get();
    if (!cartDoc.exists) return;
    let items = cartDoc.data().items || [];
    items.splice(index, 1);
    await saveUserCart(items);
    updateCartUI(items);
}

function openCartModal() {
    if (!currentUser) {
        showCustomAlert('Please login to view your cart.');
        openAuthModal();
        return;
    }
    loadUserCart();
    document.getElementById('cart-modal').style.display = 'flex';
}
function closeCartModal() { document.getElementById('cart-modal').style.display = 'none'; }

// ==================== CHECKOUT & ORDERS ====================
async function checkoutOrder() {
    if (!currentUser) {
        showCustomAlert('Please login to checkout.');
        openAuthModal();
        return;
    }

    const cartDoc = await db.collection('carts').doc(currentUser.uid).get();
    if (!cartDoc.exists || !cartDoc.data().items || cartDoc.data().items.length === 0) {
        showCustomAlert('Your cart is empty.');
        return;
    }

    const allItems = cartDoc.data().items;
    const selectedItems = allItems.filter(item => item.selected !== false);

    if (selectedItems.length === 0) {
        showCustomAlert('Please select at least one item to checkout.');
        return;
    }

    let total = selectedItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

    try {
        await db.collection('orders').add({
            userId: currentUser.uid,
            userEmail: currentUser.email,
            items: selectedItems,
            totalAmount: total,
            status: 'Order Successfully Placed',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const remainingItems = allItems.filter(item => item.selected === false);
        await db.collection('carts').doc(currentUser.uid).set({ items: remainingItems });
        
        updateCartUI(remainingItems);
        closeCartModal();
        showCustomAlert('Selected order(s) successfully placed!');
    } catch (err) {
        showCustomAlert('Checkout error: ' + err.message);
    }
}

function openOrdersModal() {
    if (!currentUser) return;
    loadUserOrders();
    document.getElementById('orders-modal').style.display = 'flex';
}
function closeOrdersModal() { document.getElementById('orders-modal').style.display = 'none'; }

async function loadUserOrders() {
    const container = document.getElementById('orders-list-container');
    if (!container) return;

    const snap = await db.collection('orders').where('userId', '==', currentUser.uid).get();
    let orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    orders.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

    if (orders.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#777; padding: 20px;">No order history found.</p>`;
        return;
    }

    let html = '';
    orders.forEach(ord => {
        let dateStr = ord.createdAt ? ord.createdAt.toDate().toLocaleString() : 'Just now';
        
        let itemsHtml = '';
        ord.items.forEach(item => {
            let imgSrc = item.image || 'https://via.placeholder.com/50';
            itemsHtml += `
                <div style="display:flex; align-items:center; gap:12px; margin-top:8px; background:#fff; padding:10px; border-radius:8px; border:1px solid #eee;">
                    <img src="${imgSrc}" style="width:50px; height:50px; object-fit:cover; border-radius:6px; border: 1px solid #ddd;">
                    <div style="line-height:1.4;">
                        <div style="font-weight:bold; font-size:14px; color:#333;">${item.title}</div>
                        <div style="font-size:13px; color:#666;">Size: ${item.size} &nbsp;|&nbsp; Qty: ${item.qty}</div>
                    </div>
                </div>
            `;
        });

        html += `
            <div style="background:#f8f9fa; padding:15px; border-radius:12px; margin-bottom:15px; border:1px solid #e1e1e1; box-shadow: 0 3px 6px rgba(0,0,0,0.03);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                    <div>
                        <strong style="color:#222; font-size:15px;">Order ID: ${ord.id}</strong><br>
                        <small style="color:#777;">Date: ${dateStr}</small>
                    </div>
                    <span style="background:#d4edda; color:#155724; padding:5px 12px; border-radius:8px; font-size:12px; font-weight:bold;">${ord.status}</span>
                </div>
                
                <div style="margin:12px 0;">
                    ${itemsHtml}
                </div>
                
                <div style="text-align:right; margin-top:12px; padding-top:12px; border-top:1px dashed #ccc;">
                    <span style="font-size:15px; color:#555;">Total Amount:</span>
                    <span style="color:var(--primary-color); font-weight:bold; font-size:18px; margin-left:8px;">$${ord.totalAmount.toFixed(2)}</span>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

async function buyNow(productId) {
    if (!currentUser) {
        showCustomAlert('Please login to purchase items.');
        openAuthModal();
        return;
    }
    const success = await addToCart(productId, false);
    if (success) {
        openCartModal();
    }
}

// ==================== ADMIN DASHBOARD LOGIC ====================
function toggleSizeInputs() {
    const type = document.getElementById('size-type-select').value;
    const manualGroup = document.getElementById('manual-size-group');
    if (type === 'manual') manualGroup.style.display = 'block';
    else manualGroup.style.display = 'none';
}

async function loadDashboardStats() {
    try {
        const prodSnap = await db.collection("products").get();
        const statProd = document.getElementById("stat-total-products");
        if (statProd) statProd.innerText = prodSnap.size;

        const catSnap = await db.collection("categories").get();
        const statCat = document.getElementById("stat-total-categories");
        if (statCat) statCat.innerText = catSnap.size;

        const userSnap = await db.collection("users").get();
        const statUser = document.getElementById("stat-total-users");
        if (statUser) statUser.innerText = userSnap.size;

        const orderSnap = await db.collection("orders").get();
        const statOrder = document.getElementById("stat-total-orders");
        if (statOrder) statOrder.innerText = orderSnap.size;
    } catch (err) {
        console.error("Error loading dashboard stats: ", err);
    }
}

function toggleSelectAll(masterCheckbox, className) {
    const checkboxes = document.querySelectorAll('.' + className);
    checkboxes.forEach(cb => cb.checked = masterCheckbox.checked);
}

async function loadAdminOrders() {
    const container = document.getElementById('admin-orders-list');
    if (!container) return;

    try {
        const snap = await db.collection('orders').get();
        let orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        orders.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

        if (orders.length === 0) {
            container.innerHTML = `<p style="text-align:center; color:#777; padding: 20px;">No customer orders found.</p>`;
            return;
        }

        let html = `<table><tr>
            <th><input type="checkbox" onclick="toggleSelectAll(this, 'order-checkbox')"> Select All</th>
            <th>Order ID</th><th>Customer</th><th>Date & Time</th><th>Total Amount</th><th>Action</th>
        </tr>`;

        orders.forEach(ord => {
            let dateStr = ord.createdAt ? ord.createdAt.toDate().toLocaleString() : 'Just now';
            let userEmail = ord.userEmail || 'Unknown User';
            
            let itemsHtml = '';
            if (ord.items && ord.items.length > 0) {
                ord.items.forEach(item => {
                    let imgSrc = item.image || 'https://via.placeholder.com/50';
                    itemsHtml += `
                        <div style="display:flex; align-items:center; gap:12px; margin-top:6px; background:#fff; padding:8px; border-radius:6px; border:1px solid #eee;">
                            <img src="${imgSrc}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
                            <div style="line-height:1.3; font-size:13px;">
                                <div><b>${item.title}</b></div>
                                <div style="color:#666;">Size: ${item.size} | Qty: ${item.qty} | $${parseFloat(item.price).toFixed(2)}</div>
                            </div>
                        </div>
                    `;
                });
            }

            html += `<tr>
                <td><input type="checkbox" class="order-checkbox" value="${ord.id}"></td>
                <td><b>${ord.id}</b><div style="margin-top:6px;">${itemsHtml}</div></td>
                <td>${userEmail}</td>
                <td>${dateStr}</td>
                <td><strong style="color:var(--primary-color);">$${Number(ord.totalAmount || 0).toFixed(2)}</strong></td>
                <td><button class="btn btn-danger" onclick="deleteSingleOrder('${ord.id}')">Delete</button></td>
            </tr>`;
        });
        html += `</table>`;
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = `<p style="text-align:center; color:red; padding:20px;">Error loading orders: ${err.message}</p>`;
    }
}

async function loadAdminData() {
    if (currentRole !== 'admin') return;

    loadDashboardStats();

    const catSnap = await db.collection('categories').get();
    categoriesCache = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const selectElem = document.getElementById('prod-category');
    if (selectElem) {
        selectElem.innerHTML = categoriesCache.length > 0 ? 
            categoriesCache.map(c => `<option value="${c.name}">${c.name}</option>`).join('') :
            `<option value="">No categories available</option>`;
    }

    const catList = document.getElementById('admin-categories-list');
    if (catList) {
        catList.innerHTML = categoriesCache.length > 0 ? 
            `<table><tr>
                <th style="width:50px;"><input type="checkbox" onclick="toggleSelectAll(this, 'cat-checkbox')"></th>
                <th>Category Name</th><th>Action</th>
             </tr>` + 
            categoriesCache.map(c => `<tr>
                <td><input type="checkbox" class="cat-checkbox" value="${c.id}"></td>
                <td>${c.name}</td>
                <td><button class="btn btn-danger" style="padding:4px 8px; font-size:12px;" onclick="deleteCategory('${c.id}')">Delete</button></td>
            </tr>`).join('') + `</table>` :
            `<p>No categories added yet.</p>`;
    }

    const prodSnap = await db.collection('products').get();
    productsCache = prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const prodList = document.getElementById('admin-products-list');
    if (prodList) {
        prodList.innerHTML = productsCache.length > 0 ?
            `<table><tr>
                <th style="width:50px;"><input type="checkbox" onclick="toggleSelectAll(this, 'prod-checkbox')"></th>
                <th>Title</th><th>Category</th><th>Price</th><th>Action</th>
             </tr>` + 
            productsCache.map(p => `<tr>
                <td><input type="checkbox" class="prod-checkbox" value="${p.id}"></td>
                <td>${p.title}</td>
                <td>${p.category}</td>
                <td>$${p.price}</td>
                <td><button class="btn btn-danger" style="padding:4px 8px; font-size:12px;" onclick="deleteProduct('${p.id}')">Delete</button></td>
            </tr>`).join('') + `</table>` :
            `<p>No products added yet.</p>`;
    }

    const userSnap = await db.collection('users').get();
    const userList = document.getElementById('admin-users-list');
    if (userList) {
        const users = userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        userList.innerHTML = users.length > 0 ?
            `<table><tr>
                <th style="width:50px;"><input type="checkbox" onclick="toggleSelectAll(this, 'user-checkbox')"></th>
                <th>Email</th><th>Role</th><th>Action</th>
             </tr>` + 
            users.map(u => `<tr>
                <td>${u.role !== 'admin' ? `<input type="checkbox" class="user-checkbox" value="${u.id}">` : ''}</td>
                <td>${u.email}</td>
                <td>${u.role || 'user'}</td>
                <td>${u.role !== 'admin' ? `<button class="btn btn-danger" style="padding:4px 8px; font-size:12px;" onclick="deleteUserDoc('${u.id}')">Delete</button>` : 'Protected'}</td>
            </tr>`).join('') + `</table>` :
            `<p>No users found.</p>`;
    }
}

async function deleteSelectedProducts() {
    const checkboxes = document.querySelectorAll('.prod-checkbox:checked');
    if (checkboxes.length === 0) {
        showCustomAlert('Please select at least one product to delete.');
        return;
    }
    if (confirm(`Are you sure you want to delete ${checkboxes.length} selected product(s)?`)) {
        for (let cb of checkboxes) {
            await db.collection('products').doc(cb.value).delete();
        }
        loadAdminData();
        showCustomAlert('Selected products deleted successfully!');
    }
}

async function deleteSelectedCategories() {
    const checkboxes = document.querySelectorAll('.cat-checkbox:checked');
    if (checkboxes.length === 0) {
        showCustomAlert('Please select at least one category to delete.');
        return;
    }
    if (confirm(`Are you sure you want to delete ${checkboxes.length} selected category(ies)?`)) {
        for (let cb of checkboxes) {
            await db.collection('categories').doc(cb.value).delete();
        }
        loadAdminData();
        showCustomAlert('Selected categories deleted successfully!');
    }
}

async function deleteSelectedOrders() {
    const checkboxes = document.querySelectorAll('.order-checkbox:checked');
    if (checkboxes.length === 0) {
        showCustomAlert('Please select at least one order to delete.');
        return;
    }
    if (confirm(`Are you sure you want to delete ${checkboxes.length} selected order(s)?`)) {
        for (let cb of checkboxes) {
            await db.collection('orders').doc(cb.value).delete();
        }
        loadAdminOrders();
        loadDashboardStats();
        showCustomAlert('Selected orders deleted successfully!');
    }
}

async function deleteSelectedUsers() {
    const checkboxes = document.querySelectorAll('.user-checkbox:checked');
    if (checkboxes.length === 0) {
        showCustomAlert('Please select at least one user to delete.');
        return;
    }
    if (confirm(`Are you sure you want to delete ${checkboxes.length} selected user(s)?`)) {
        for (let cb of checkboxes) {
            await db.collection('users').doc(cb.value).delete();
        }
        loadAdminData();
        showCustomAlert('Selected users deleted successfully!');
    }
}

async function handleAddCategory() {
    const name = document.getElementById('cat-name').value.trim();
    if (!name) {
        showCustomAlert('Enter category name.');
        return;
    }
    try {
        await db.collection('categories').add({ name });
        document.getElementById('cat-name').value = '';
        await loadAdminData();
        showCustomAlert('Category added successfully!');
    } catch (err) {
        showCustomAlert('Error adding category: ' + err.message);
    }
}

async function deleteCategory(id) {
    if (confirm('Delete this category?')) {
        await db.collection('categories').doc(id).delete();
        loadAdminData();
    }
}

async function handleAddProduct() {
    const category = document.getElementById('prod-category').value;
    const title = document.getElementById('prod-title').value.trim();
    const price = parseFloat(document.getElementById('prod-price').value);
    const description = document.getElementById('prod-desc').value.trim();
    const sizeType = document.getElementById('size-type-select').value;
    const sizes = document.getElementById('prod-manual-sizes').value.trim();
    const fileInput = document.getElementById('prod-images');

    if (!category) {
        showCustomAlert('Please select or add a category first.');
        return;
    }
    if (!title || isNaN(price)) {
        showCustomAlert('Please fill required product details.');
        return;
    }
    if (fileInput.files.length < 2 || fileInput.files.length > 3) {
        showCustomAlert('Please upload between 2 and 3 images (minimum 2, maximum 3).');
        return;
    }

    let base64Images = [];
    for (let i = 0; i < fileInput.files.length; i++) {
        let base64 = await convertFileToBase64(fileInput.files[i]);
        base64Images.push(base64);
    }

    try {
        await db.collection('products').add({
            category,
            title,
            price,
            description,
            sizeType,
            sizes,
            images: base64Images,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showCustomAlert('Product added successfully!');
        location.reload();
    } catch (err) {
        showCustomAlert('Error adding product: ' + err.message);
    }
}

// ==================== COMPRESSED FILE TO BASE64 (UPDATED) ====================
function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                const MAX_WIDTH = 1024;
                const MAX_HEIGHT = 1024;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width = Math.round((width * MAX_HEIGHT) / height);
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                let quality = 0.9;
                let dataUrl = canvas.toDataURL('image/jpeg', quality);

                // Ensure individual image file size stays under 1MB (1,048,576 bytes)
                while (dataUrl.length > 1048576 * 1.33 && quality > 0.1) {
                    quality -= 0.1;
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                }

                resolve(dataUrl);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
}

async function deleteProduct(id) {
    if (confirm('Delete this product?')) {
        await db.collection('products').doc(id).delete();
        loadAdminData();
    }
}

async function deleteSingleOrder(id) {
    if (confirm('Delete this order?')) {
        await db.collection('orders').doc(id).delete();
        loadAdminOrders();
        loadDashboardStats();
    }
}

async function deleteUserDoc(id) {
    if (confirm('Delete user profile record?')) {
        await db.collection('users').doc(id).delete();
        loadAdminData();
    }
}