/* Consolidated app.js - concatenated inline script blocks in original order.
   This file preserves initialization guards (DOMContentLoaded/window.onload) where present.
   Note: Keep this file loaded with `defer` in index.html to preserve DOM availability semantics.
*/

// Minimal globals and storage helpers
const STORAGE_KEYS = {
  PREFS: 'ultre_user_preferences_v2',
  USERS: 'ultre_users',
  BLOG_POSTS: 'ultre_blog_posts',
  BLOG_WRITERS: 'ultre_blog_writers',
  IS_LOGGED_IN: 'ultre_isLoggedIn',
  CURRENT_USER: 'ultre_current_user',
  WISHLIST: 'wishlist',
  CART: 'cart_items',
};

function setCookie(name, value, days) {
  let expires = '';
  if (typeof days === 'number') {
    const date = new Date();
    date.setTime(date.getTime() + (days*24*60*60*1000));
    expires = '; expires=' + date.toUTCString();
  }
  document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/';
}

function getCookie(name) {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i=0;i<ca.length;i++) {
    let c = ca[i];
    while (c.charAt(0)==' ') c = c.substring(1,c.length);
    if (c.indexOf(nameEQ) == 0) return decodeURIComponent(c.substring(nameEQ.length,c.length));
  }
  return null;
}

function deleteCookie(name){ setCookie(name,'',-1); }

function saveToStorage(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function loadFromStorage(key, fallback){ try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(e){ return fallback; } }

// SHA-256 helper for demo password hashing
async function sha256Hex(str){
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// Users management (simple demo)
function _loadUsers(){ return loadFromStorage(STORAGE_KEYS.USERS, []); }
function _saveUsers(users){ saveToStorage(STORAGE_KEYS.USERS, users); }

function findUserByEmail(email){ return _loadUsers().find(u => u.email && u.email.toLowerCase()===String(email).toLowerCase()); }

async function handleSignup(form){
  const email = (form.querySelector('[name="email"]').value || '').trim();
  const password = (form.querySelector('[name="password"]').value || '').trim();
  if (!email || !password) { showMessageBox('Email and password required', 2500, true); return; }
  if (findUserByEmail(email)) { showMessageBox('Account already exists', 2500, true); return; }
  const passHash = await sha256Hex(password);
  const users = _loadUsers();
  const newUser = { id: 'u_' + Date.now(), email, passwordHash: passHash, displayName: email.split('@')[0] };
  users.push(newUser);
  _saveUsers(users);
  // auto sign in
  localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));
  setCookie('ultre_userEmail', email, 7);
  setCookie('ultre_isLoggedIn', 'true', 7);
  updateAuthUi();
  closeAuthModal();
  showMessageBox('Signed up and logged in', 2000);
}

async function handleSignin(form){
  const email = (form.querySelector('[name="email"]').value || '').trim();
  const password = (form.querySelector('[name="password"]').value || '').trim();
  if (!email || !password) { showMessageBox('Provide email and password', 2000, true); return; }
  const user = findUserByEmail(email);
  if (!user) { showMessageBox('No account found', 2000, true); return; }
  const hash = await sha256Hex(password);
  if (hash !== user.passwordHash) { showMessageBox('Incorrect password', 2000, true); return; }
  localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  setCookie('ultre_userEmail', email, 7);
  setCookie('ultre_isLoggedIn', 'true', 7);
  updateAuthUi();
  closeAuthModal();
  showMessageBox('Signed in', 1500);
}

function signOut(){
  localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'false');
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  deleteCookie('ultre_userEmail');
  deleteCookie('ultre_isLoggedIn');
  updateAuthUi();
  showMessageBox('Signed out', 1000);
}

// Message box utility
function showMessageBox(message, duration=2500, isError=false){
  let box = document.getElementById('message-box');
  if (!box){ box = document.createElement('div'); box.id='message-box'; document.body.appendChild(box); }
  box.textContent = message;
  box.style.backgroundColor = isError ? '#c53030' : '#28a745';
  box.classList.add('show');
  clearTimeout(box._t);
  box._t = setTimeout(()=>{ box.classList.remove('show'); }, duration);
}

function closeAuthModal(){ const m = document.getElementById('auth-modal'); if (m) m.classList.remove('show'); }
function openAuthModal(){ const m = document.getElementById('auth-modal'); if (m) m.classList.add('show'); }

// Settings: basic persistence and theme handling
function migrateLegacyPreferences(prefs){
  // No-op for now but reserved for migrating older keys
  return prefs;
}

function applySettingsFromLocalStorage(){
  const prefs = migrateLegacyPreferences(loadFromStorage(STORAGE_KEYS.PREFS, { theme: 'dark' }));
  // apply theme class to document
  if (prefs.theme === 'light'){
    document.documentElement.classList.add('light-mode');
    document.documentElement.classList.remove('dark-mode');
    // inject small override to ensure white background + black text for light
    let el = document.getElementById('ultre-theme-overrides');
    if (!el){ el = document.createElement('style'); el.id = 'ultre-theme-overrides'; document.head.appendChild(el); }
    el.innerHTML = 'html,body,section,#main-website-content-wrapper{ background: #ffffff !important; color: #000000 !important; } img.logo-img{ filter: none !important; }';
    // swap logo image if present
    const logos = document.querySelectorAll('.logo img');
    logos.forEach(img => { if (img.dataset && img.dataset.lightSrc){ img.src = img.dataset.lightSrc; } });
  } else {
    // dark
    document.documentElement.classList.remove('light-mode');
    document.documentElement.classList.add('dark-mode');
    const el = document.getElementById('ultre-theme-overrides'); if (el) el.remove();
    const logos = document.querySelectorAll('.logo img');
    logos.forEach(img => { if (img.dataset && img.dataset.darkSrc){ img.src = img.dataset.darkSrc; } });
  }
}

function bindAutoSettings(){
  document.querySelectorAll('[data-setting-key]').forEach(control => {
    const key = control.dataset.settingKey;
    if (!key) return;
    // set initial value
    const prefs = loadFromStorage(STORAGE_KEYS.PREFS, {});
    if (control.type === 'checkbox') control.checked = !!prefs[key];
    else control.value = prefs[key] !== undefined ? prefs[key] : control.value;

    control.addEventListener('change', () => {
      const p = loadFromStorage(STORAGE_KEYS.PREFS, {});
      if (control.type === 'checkbox') p[key] = !!control.checked; else p[key] = control.value;
      saveToStorage(STORAGE_KEYS.PREFS, p);
      applySettingsFromLocalStorage();
    });
  });
}

// Navigation indicator
function updateNavIndicator(activeSelector){
  const indicator = document.getElementById('nav-indicator');
  if (!indicator) return;
  const el = document.querySelector(activeSelector);
  if (!el) { indicator.style.opacity = 0; return; }
  const r = el.getBoundingClientRect();
  // position relative to parent ul
  const parent = el.closest('ul');
  const parentRect = parent ? parent.getBoundingClientRect() : { left: 0 };
  const left = (r.left - parentRect.left) + (r.width/2) - (indicator.offsetWidth/2);
  indicator.style.left = left + 'px';
  indicator.style.opacity = 1;
}

// Blog: basic rendering and gating
function renderBlogList(){
  const list = document.getElementById('blog-list'); if (!list) return;
  const posts = loadFromStorage(STORAGE_KEYS.BLOG_POSTS, []);
  const isLoggedIn = localStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN) === 'true';
  list.innerHTML = '';
  posts.forEach(p => {
    const li = document.createElement('div');
    li.className = 'blog-card';
    li.innerHTML = `<h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.excerpt || (p.content || '').slice(0,200))}...</p><button data-id="${p.id}" class="read-post-btn">Read</button>`;
    list.appendChild(li);
  });
  // bind read buttons
  list.querySelectorAll('.read-post-btn').forEach(btn => {
    btn.addEventListener('click', (e)=>{
      const id = btn.dataset.id; openPostInline(id);
    });
  });
  // hide if not logged in
  const blogSection = document.getElementById('blog-section'); if (blogSection) blogSection.style.display = isLoggedIn ? 'block' : 'none';
}

function openPostInline(id){
  const posts = loadFromStorage(STORAGE_KEYS.BLOG_POSTS, []);
  const post = posts.find(p => p.id === id);
  if (!post) return showMessageBox('Post not found',1500,true);
  const viewer = document.getElementById('inline-post-viewer');
  if (!viewer) return;
  viewer.querySelector('.title').textContent = post.title;
  viewer.querySelector('.content').innerHTML = post.content; // content assumed sanitized from author in this demo
  viewer.classList.add('open');
  // micro-animations for the loaded content
  applyMicroAnimationsToArticle(viewer.querySelector('.content'));
}

function closeInlinePost(){ const v = document.getElementById('inline-post-viewer'); if (v) v.classList.remove('open'); }

function escapeHtml(unsafe){ return String(unsafe).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[m]; }); }

function applyMicroAnimationsToArticle(container){ if (!container) return; const text = container.innerText || container.textContent; container.innerHTML = '';
  const words = text.split(/(\s+)/);
  words.forEach((w,i) => {
    const span = document.createElement('span');
    span.className = 'animated-letter';
    span.textContent = w;
    span.style.animationDelay = (i * 0.02) + 's';
    container.appendChild(span);
  });
}

// Demo: seed default blog posts if none
(function seedBlog(){
  const existing = loadFromStorage(STORAGE_KEYS.BLOG_POSTS, []);
  if (existing && existing.length>0) return;
  const now = Date.now();
  const posts = [
    { id: 'post_' + (now+1), title: 'Style Tips for 2025: Minimalist Streetwear', excerpt: 'Discover clean silhouettes, neutral palettes, and texture play for a refined street look.', content: `<p>Minimalism continues to dominate the streetwear scene in 2025. Designers are focusing on clean silhouettes, thoughtful materials, and small, considered details that elevate a look without loud branding.</p><p>Start with neutral tones—black, white, beige—and introduce texture with loopback fleece, ripstop nylon, or brushed cotton. Keep logos subtle and integrate functional details like reinforced seams and adjustable hems.</p><p>Micro animations: Each paragraph subtly animates in, creating a smooth reading flow that helps readers engage with the long-form content.</p>` },
    { id: 'post_' + (now+2), title: 'Sustainable Fabrics: What to Look For', excerpt: 'A buyer\'s guide to recycled fibers, low-impact dyes, and long-lasting craftsmanship.', content: `<p>Sustainable fabrics are not just a trend; they\'re becoming the industry standard. Recycled polyester, organic cotton, and hemp blends offer reduced environmental impact when sourced correctly.</p><p>Look for certifications and transparency from brands to ensure materials are ethically produced.</p>` },
    { id: 'post_' + (now+3), title: 'Behind The Scenes: How We Make Our Shirts', excerpt: 'From patterning to finishing, a peek into production.', content: `<p>We partner with factories that emphasize careful craftsmanship. Patterns are graded to create consistent sizing, and fabric inspection ensures minimal defects before cutting.</p><p>Finishing touches like pre-washing and enzyme washing extend the life and feel of the garment.</p>` }
  ];
  saveToStorage(STORAGE_KEYS.BLOG_POSTS, posts);
})();

// Simple DOM ready initializer
document.addEventListener('DOMContentLoaded', () => {
  // wire up auth form handlers if present
  const signUpForm = document.getElementById('auth-signup-form');
  if (signUpForm) signUpForm.addEventListener('submit', function(e){ e.preventDefault(); handleSignup(this); });
  const signInForm = document.getElementById('auth-signin-form');
  if (signInForm) signInForm.addEventListener('submit', function(e){ e.preventDefault(); handleSignin(this); });

  // bind settings controls
  bindAutoSettings();
  applySettingsFromLocalStorage();

  // render blog list
  renderBlogList();

  // nav indicator: set initial after a small delay to allow layout
  setTimeout(()=>{ updateNavIndicator('nav ul li a.active-nav-link') }, 120);

  // profile menu sign out wiring
  const signOutBtn = document.getElementById('signout-button'); if (signOutBtn) signOutBtn.addEventListener('click', ()=>signOut());

  // inline post close
  const closeBtn = document.getElementById('inline-post-close'); if (closeBtn) closeBtn.addEventListener('click', ()=>closeInlinePost());

  // profile open auth
  const authButtons = document.querySelectorAll('.open-auth-btn'); authButtons.forEach(b => b.addEventListener('click', openAuthModal));

  // delegated handlers for wishlist buttons moved from inline templates
  document.body.addEventListener('click', function(e){
    const atc = e.target.closest && e.target.closest('.add-to-cart-from-wishlist');
    if (atc){
      const id = atc.dataset.itemId;
      const name = atc.dataset.itemName;
      const price = parseFloat(atc.dataset.itemPrice || 0);
      const image = atc.dataset.itemImage;
      addToCart({ id, name, price, imageUrl: image, size: 'M' });
      showMessageBox(`${name} (Size: M) added to cart from wishlist.`);
      return;
    }
    const rem = e.target.closest && e.target.closest('.remove-from-wishlist-btn');
    if (rem){
      const id = rem.dataset.removeId;
      removeFromWishlist(id);
      return;
    }
    const dashAtc = e.target.closest && e.target.closest('.dashboard-add-to-cart');
    if (dashAtc){
      const id = dashAtc.dataset.itemId;
      const name = dashAtc.dataset.itemName;
      const price = parseFloat(dashAtc.dataset.itemPrice || 0);
      const image = dashAtc.dataset.itemImage;
      addToCart({ id, name, price, imageUrl: image, size: 'M' });
      showMessageBox(`${name} added to cart.`);
      return;
    }
    const dashRem = e.target.closest && e.target.closest('.dashboard-remove-from-wishlist');
    if (dashRem){
      const id = dashRem.dataset.removeId;
      removeFromWishlist(id);
      return;
    }
    const compAtc = e.target.closest && e.target.closest('.comparison-add-to-cart');
    if (compAtc){
      const id = compAtc.dataset.itemId;
      const name = compAtc.dataset.itemName;
      const price = parseFloat(compAtc.dataset.itemPrice || 0);
      const image = compAtc.dataset.itemImage;
      addToCart({ id, name, price, imageUrl: image, size: 'M' });
      showMessageBox(`${name} added to cart.`);
      return;
    }
  });

  // Additional delegated handlers for migrated onclicks/data-attributes
  document.body.addEventListener('click', function(e){
    const toggle = e.target.closest && e.target.closest('.toggle-comparison-btn');
    if (toggle){
      const id = toggle.dataset.itemId;
      if (typeof window.toggleComparison === 'function') return window.toggleComparison(id);
      // fallback: store in comparison list
      const key = 'ultre_comparison_items'; const cur = loadFromStorage(key, []);
      const exists = cur.indexOf(id) !== -1;
      if (exists) { const out = cur.filter(x=> x !== id); saveToStorage(key, out); showMessageBox('Removed from comparison'); }
      else { cur.push(id); saveToStorage(key, cur); showMessageBox('Added to comparison'); }
      return;
    }

    const openComp = e.target.closest && e.target.closest('.open-comparison-modal-btn');
    if (openComp){ if (typeof window.showComparisonModal === 'function') return window.showComparisonModal(); try{ const modal = document.getElementById('product-comparison-modal'); if (modal) modal.style.display = 'block'; }catch(e){} return; }

    const openBlog = e.target.closest && e.target.closest('.open-blog-post-card');
    if (openBlog){ const pid = openBlog.dataset.postId; if (pid) return openPostInline(pid); }

    const openItem = e.target.closest && e.target.closest('.open-item-detail-card');
    if (openItem){ const iid = openItem.dataset.itemId; if (iid && typeof window.openItemDetail === 'function') return window.openItemDetail(iid); }
  });

  updateAuthUi();
});

function updateAuthUi(){
  const isLogged = localStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN) === 'true';
  const acct = document.getElementById('account-area');
  const profileMenu = document.getElementById('profile-piece');
  if (acct) acct.style.display = isLogged ? 'block' : 'none';
  if (profileMenu) profileMenu.style.display = isLogged ? 'block' : 'none';
  const signInButtons = document.querySelectorAll('.open-auth-btn'); signInButtons.forEach(b=> b.style.display = isLogged ? 'none' : 'inline-block');
  renderBlogList();
}

// expose some functions for inline onclick handlers if present
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.openPostInline = openPostInline;
window.signOut = signOut;
window.applySettingsFromLocalStorage = applySettingsFromLocalStorage;

// End of app.js

/* --- Migrated inline scripts from index.html --- */

// Safe message helper and settings binding augmentation
(function(){
  // Helper: safe message box fallback
  function _msg(text, ms=3000, isError=false){
    try { if (typeof showMessageBox === 'function') return showMessageBox(text, ms, isError); } catch(e){}
    if (isError) console.error(text); else console.log(text);
    // last-resort UI
    const id = 'ultre-inline-msg';
    let el = document.getElementById(id);
    if (!el) { el = document.createElement('div'); el.id = id; el.style.position='fixed'; el.style.right='16px'; el.style.bottom='16px'; el.style.zIndex=99999; document.body.appendChild(el); }
    el.textContent = text;
    el.style.background = isError ? 'rgba(220,38,38,0.9)' : 'rgba(55,65,81,0.9)';
    el.style.color='#fff'; el.style.padding='10px 14px'; el.style.borderRadius='8px';
    setTimeout(()=>{ if (el) el.textContent=''; }, ms);
  }

  // SETTINGS: wire up data-setting-key handlers if not already bound
  if (typeof applySettingsFromLocalStorage === 'function'){
    // attach delegated change handlers for controls with data-setting-key
    document.querySelectorAll('[data-setting-key]').forEach(el => {
      if (el._ultre_change_handler) return; // already bound
      const handler = function(){
        try{
          const key = el.getAttribute('data-setting-key');
          const saved = loadFromStorage(STORAGE_KEYS.PREFS, {});
          let val;
          if (el.getAttribute('data-is-dark-checkbox') === 'true') {
            val = el.checked ? 'dark' : 'light';
            saved.theme = val; saved.darkMode = (val === 'dark');
          } else if (el.type === 'checkbox') val = !!el.checked; else val = el.value;
          if (key === 'theme'){ saved.theme = val; saved.darkMode = (val === 'dark'); }
          else if (key === 'animationsEnabled') saved.animationsEnabled = !!val;
          else saved[key] = val;
          saveToStorage(STORAGE_KEYS.PREFS, saved);
          applySettingsFromLocalStorage();
          // mark pending changes
          window._ultre_pending_setting_changes = window._ultre_pending_setting_changes || [];
          const oldVal = null;
          window._ultre_pending_setting_changes.push({ key, oldValue: oldVal, newValue: saved[key], when: Date.now(), source: 'inline' });
          try{ el.classList.add('ultre-setting-pending'); }catch(e){}
          _msg('Setting selected (will be logged on Save)');
        }catch(err){ _msg('Failed to save setting',2000,true); }
      };
      el.addEventListener('change', handler);
      el._ultre_change_handler = handler;
    });
  }
})();

/* Shop / Comparison / Dashboard helpers (migration for inline templates) */
(function(){
  // Avoid redefining if already present
  if (typeof window.renderFilteredProducts === 'function') return;

  // Basic state backed by localStorage
  const COMPARISON_KEY = 'ultre_comparison_items';
  window.localClothingItems = window.localClothingItems || loadFromStorage('ultre_localClothingItems', []);
  window.cart = window.cart || loadFromStorage(STORAGE_KEYS.CART, {});
  window.wishlist = window.wishlist || loadFromStorage(STORAGE_KEYS.WISHLIST, []);
  let comparisonList = loadFromStorage(COMPARISON_KEY, []);

  function saveComparison(){ saveToStorage(COMPARISON_KEY, comparisonList); }

  function updateComparisonUI(){
    const comparisonBtn = document.getElementById('comparison-btn') || document.querySelector('[data-action="open-comparison"]');
    if (comparisonBtn){ comparisonBtn.innerHTML = `Compare (${comparisonList.length})`; comparisonBtn.disabled = comparisonList.length < 2; }
  }

  function addToComparison(id){ if (!id) return; if (comparisonList.indexOf(id)!==-1) return; if (comparisonList.length>=4) { showMessageBox('Maximum 4 items can be compared at once',3000,true); return; } comparisonList.push(id); saveComparison(); updateComparisonUI(); }
  function removeFromComparison(id){ comparisonList = comparisonList.filter(x=> x!==id); saveComparison(); updateComparisonUI(); }
  function toggleComparison(id){ if (!id) return; if (comparisonList.indexOf(id)!==-1) removeFromComparison(id); else addToComparison(id); renderFilteredProducts(window.localClothingItems || []); }

  async function showComparisonModal(){
    if (comparisonList.length < 2) { showMessageBox('Please select at least 2 items to compare',3000,true); return; }
    const comparisonContent = document.getElementById('comparison-content'); if (!comparisonContent) return;
    const productsToCompare = (window.localClothingItems||[]).filter(i=> comparisonList.indexOf(i.id)!==-1);
    // Build a simple table
    let html = '<div class="comparison-table overflow-x-auto"><table class="w-full text-sm"><thead><tr class="border-b border-gray-600"><th class="p-3 text-left text-white">Features</th>';
    productsToCompare.forEach(p=>{
      html += `<th class="p-3 text-center text-white"><div class="product-comparison-header"><img src="${p.imageUrl||'logo.png'}" alt="${escapeHtml(p.name||'')}" class="w-16 h-16 object-cover rounded mx-auto mb-2"><h4 class="font-semibold">${escapeHtml(p.name||'')}</h4><p class="text-blue-400">$${(p.price||0).toFixed(2)}</p><button data-remove-id="${p.id}" class="text-red-400 hover:text-red-300 text-xs remove-from-comparison-btn"><i class="fas fa-times"></i> Remove</button></div></th>`;
    });
    html += '</tr></thead><tbody>';
    const rows = [ ['Category','category'], ['Material','material'], ['Style','style'], ['Sizes Available', 'sizes'], ['Colors','colors'] ];
    rows.forEach(r=>{
      html += `<tr class="border-b border-gray-700"><td class="p-3 text-white font-semibold">${r[0]}</td>`;
      productsToCompare.forEach(p=>{ const v = p[r[1]]; html += `<td class="p-3 text-center text-gray-300">${Array.isArray(v)? escapeHtml((v||[]).join(', ')) : escapeHtml(String(v||''))}</td>`; });
      html += '</tr>';
    });
    // Features row
    html += `<tr class="border-b border-gray-700"><td class="p-3 text-white font-semibold">Features</td>`;
    productsToCompare.forEach(p=>{ html += `<td class="p-3 text-center text-gray-300"><ul class="text-xs space-y-1">${(p.features||[]).map(f=>`<li>• ${escapeHtml(f)}</li>`).join('')}</ul></td>`; });
    html += '</tr>';
    // Actions row
    html += `<tr><td class="p-3 text-white font-semibold">Actions</td>`;
    productsToCompare.forEach(p=>{ html += `<td class="p-3 text-center"><button class="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors comparison-add-to-cart" data-item-id="${p.id}" data-item-name="${escapeHtml(p.name||'')}" data-item-price="${p.price||0}" data-item-image="${p.imageUrl||''}">Add to Cart</button></td>`; });
    html += '</tr>';
    html += '</tbody></table></div>';
    comparisonContent.innerHTML = html;
    const modal = document.getElementById('product-comparison-modal'); if (modal) modal.classList.add('show');
  }

  // Product rendering: scans for container with id items-grid or class items-grid
  window.renderFilteredProducts = function(products){
    const itemsGrid = document.getElementById('items-grid') || document.querySelector('.items-grid') || document.getElementById('itemsGrid');
    if (!itemsGrid) return;
    itemsGrid.innerHTML = '';
    if (!products || products.length===0){ itemsGrid.innerHTML = `<div class="col-span-full text-center py-12"><span class="text-6xl mb-4 block">🔍</span><p class="text-xl text-gray-300 mb-2">No products found</p><p class="text-gray-500">Try adjusting your search or filters</p></div>`; return; }
    products.forEach((item, index)=>{
      const isInWishlist = (window.wishlist||[]).some(w=> w.id===item.id);
      const isInComparison = (comparisonList||[]).indexOf(item.id)!==-1;
      const card = document.createElement('div');
      card.className = 'bg-gray-800 rounded-lg shadow-lg overflow-hidden transform transition-transform duration-300 hover:scale-105 flex flex-col cursor-pointer product-card';
      card.style.animationDelay = (0.1 * index) + 's';
      card.dataset.itemId = item.id; card.dataset.itemName = item.name; card.dataset.itemPrice = item.price; card.dataset.itemImage = item.imageUrl;
      const tags = (item.tags||[]).slice(0,3).map(t=> `<span class="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">${escapeHtml(t)}</span>`).join('');
      card.innerHTML = `<div class="relative"><img src="${item.imageUrl||'logo.png'}" alt="${escapeHtml(item.name||'')}" class="w-full h-48 object-cover"><button class="wishlist-btn ${isInWishlist? 'active' : ''}" data-item-id="${item.id}"><i class="fas fa-heart"></i></button><button class="compare-btn ${isInComparison? 'active' : ''} toggle-comparison-btn" data-item-id="${item.id}"><i class="fas fa-balance-scale"></i></button><div class="product-badges absolute top-2 left-2 flex gap-2">${item.brand==='premium'? '<span class="bg-yellow-600 text-white text-xs px-2 py-1 rounded">Premium</span>' : ''}${item.inStock? '<span class="bg-green-600 text-white text-xs px-2 py-1 rounded">In Stock</span>' : '<span class="bg-red-600 text-white text-xs px-2 py-1 rounded">Out of Stock</span>'}</div></div><div class="p-4 flex flex-col justify-between flex-grow"><div><h3 class="text-xl font-semibold text-white mb-2">${escapeHtml(item.name||'')}</h3><p class="text-gray-300 text-sm mb-2">${escapeHtml([item.category||'', item.material||'', item.style||''].filter(Boolean).join(' • '))}</p><p class="text-gray-300 text-lg mb-4">$${(item.price||0).toFixed(2)}</p><div class="product-tags flex flex-wrap gap-1 mb-3">${tags}</div></div><div class="flex gap-2"><button class="add-to-cart-btn flex-1 bg-white text-gray-900 font-bold py-2 px-4 rounded-md hover:bg-gray-200 transition-colors" data-item-id="${item.id}" data-item-name="${escapeHtml(item.name||'')}" data-item-price="${item.price||0}" data-item-image="${item.imageUrl||''}">Add to Cart</button><button class="compare-btn bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-500 transition-colors ${isInComparison ? 'bg-blue-600' : ''} toggle-comparison-btn" data-item-id="${item.id}"><i class="fas fa-balance-scale"></i></button></div></div>`;
      itemsGrid.appendChild(card);
    });
  };

  // Attach as globals for other code
  window.addToComparison = addToComparison;
  window.removeFromComparison = removeFromComparison;
  window.toggleComparison = toggleComparison;
  window.showComparisonModal = showComparisonModal;

  // Initialize UI on DOM ready
  document.addEventListener('DOMContentLoaded', ()=>{
    updateComparisonUI();
    // wire remove-from-comparison buttons via delegation (handled elsewhere too)
    document.body.addEventListener('click', function(e){
      const rem = e.target.closest && e.target.closest('.remove-from-comparison-btn');
      if (rem){ const id = rem.dataset.removeId; if (id) removeFromComparison(id); if (document.getElementById('product-comparison-modal')) document.getElementById('product-comparison-modal').classList.remove('show'); }
    });
  });

})();

/* BLOG: writer signup/modal, persisted posts, and enhanced renderers */
(function(){
  const BLOG_USER_KEY = STORAGE_KEYS.BLOG_WRITERS || 'ultre_blog_writers';
  const BLOG_POSTS_KEY = STORAGE_KEYS.BLOG_POSTS || 'ultre_blog_posts';
  function _loadWriters(){ try{ return loadFromStorage(BLOG_USER_KEY, []); }catch(e){return[];} }
  function _saveWriters(list){ saveToStorage(BLOG_USER_KEY, list); }
  function _loadPosts(){ try{ return loadFromStorage(BLOG_POSTS_KEY, []); }catch(e){return[];} }
  function _savePosts(list){ saveToStorage(BLOG_POSTS_KEY, list); }

  function _ensureBlogModals(){
    if (document.getElementById('ultre-writer-signup')) return;
    const css = document.createElement('style'); css.id='ultre-writer-styles'; css.textContent=`
      .ultre-modal{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:99999;background:#0b1220;color:#fff;padding:18px;border-radius:10px;min-width:320px;box-shadow:0 8px 30px rgba(2,6,23,0.7)}
      .ultre-modal h3{margin:0 0 8px 0}
      .ultre-modal input, .ultre-modal textarea{width:100%;padding:8px;margin:6px 0;border-radius:6px;border:1px solid rgba(255,255,255,0.06);background:transparent;color:#fff}
      .ultre-modal .row{display:flex;gap:8px}
      .ultre-modal .actions{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}
    `; document.head.appendChild(css);

    const signup = document.createElement('div'); signup.id='ultre-writer-signup'; signup.className='ultre-modal'; signup.style.display='none';
    signup.innerHTML = `
      <h3>Writer Signup / Verify</h3>
      <input id='writer-name' placeholder='Full name' />
      <input id='writer-email' placeholder='Email' />
      <div class='row'>
        <button id='writer-send-code' class='shop-button'>Send verification code</button>
        <button id='writer-close' class='shop-button'>Close</button>
      </div>
      <div id='writer-code-row' style='display:none;margin-top:8px'>
        <input id='writer-code' placeholder='Enter code' />
        <div class='actions'><button id='writer-verify' class='shop-button'>Verify</button></div>
      </div>
    `; document.body.appendChild(signup);

    const postModal = document.createElement('div'); postModal.id='ultre-blog-post-modal'; postModal.className='ultre-modal'; postModal.style.display='none';
    postModal.innerHTML = `
      <h3>Create Blog Post (verified writers only)</h3>
      <input id='post-title' placeholder='Title' />
      <input id='post-email' placeholder='Your verified email' />
      <textarea id='post-content' placeholder='Write post content (HTML allowed)'></textarea>
      <div class='actions'>
        <button id='post-publish' class='shop-button'>Publish</button>
        <button id='post-close' class='shop-button'>Close</button>
      </div>
    `; document.body.appendChild(postModal);

    document.getElementById('writer-send-code').addEventListener('click', ()=>{
      const name = document.getElementById('writer-name').value.trim();
      const email = document.getElementById('writer-email').value.trim().toLowerCase();
      if (!name || !email){ _msg('Please enter name and email',3000,true); return; }
      const code = Math.floor(100000 + Math.random()*899999).toString();
      const writers = _loadWriters();
      const idx = writers.findIndex(w=>w.email===email);
      const entry = { name, email, verified:false, code, codeSentAt:Date.now() };
      if (idx===-1) writers.push(entry); else writers[idx] = Object.assign(writers[idx], entry);
      _saveWriters(writers);
      _msg('Verification code sent (for demo it is shown in console).');
      console.info('ULTRE VERIFICATION CODE for', email, ':', code);
      document.getElementById('writer-code-row').style.display='block';
    });

    document.getElementById('writer-verify').addEventListener('click', ()=>{
      const email = document.getElementById('writer-email').value.trim().toLowerCase();
      const code = document.getElementById('writer-code').value.trim();
      const writers = _loadWriters();
      const w = writers.find(x=>x.email===email);
      if (!w){ _msg('No verification request found for that email',3000,true); return; }
      if (!w.code || (Date.now()- (w.codeSentAt||0)) > 1000*60*60){ _msg('Verification code expired; request a new one',3000,true); return; }
      if (w.code !== code){ _msg('Invalid code',3000,true); return; }
      w.verified = true; delete w.code; delete w.codeSentAt; _saveWriters(writers);
      _msg('Email verified! You can now publish posts.');
      setTimeout(()=>{ document.getElementById('ultre-writer-signup').style.display='none'; document.getElementById('writer-code-row').style.display='none'; }, 800);
    });

    document.getElementById('writer-close').addEventListener('click', ()=>{ document.getElementById('ultre-writer-signup').style.display='none'; document.getElementById('writer-code-row').style.display='none'; });

    document.getElementById('post-publish').addEventListener('click', ()=>{
      const title = document.getElementById('post-title').value.trim();
      const email = document.getElementById('post-email').value.trim().toLowerCase();
      const content = document.getElementById('post-content').value.trim();
      if (!title || !email || !content){ _msg('Please fill title, your verified email and content',3000,true); return; }
      const writers = _loadWriters(); const w = writers.find(x=>x.email===email && x.verified);
      if (!w){ _msg('Email not verified for publishing. Please verify first.',3000,true); return; }
      const posts = _loadPosts();
      posts.unshift({ id: 'post_'+Date.now(), title, content, author: w.name, email: w.email, verified:true, date: new Date().toISOString() });
      _savePosts(posts);
      _msg('Post published');
      document.getElementById('ultre-blog-post-modal').style.display='none';
      try{ if (typeof renderBlogPosts === 'function') renderBlogPosts(currentBlogCategory || 'all'); }catch(e){}
    });

    document.getElementById('post-close').addEventListener('click', ()=>{ document.getElementById('ultre-blog-post-modal').style.display='none'; });
  }

  window.openWriterSignup = function(){ _ensureBlogModals(); document.getElementById('ultre-writer-signup').style.display='block'; };
  window.openBlogPostCreator = function(){ _ensureBlogModals(); document.getElementById('ultre-blog-post-modal').style.display='block'; };

  // Expose render override (will be used if page expects it)
  window.renderBlogPosts = window.renderBlogPosts || function(category){
    const container = document.getElementById('blog-posts-container'); if (!container) return;
    const persisted = _loadPosts();
    const builtin = (window.blogPosts && Array.isArray(window.blogPosts))? window.blogPosts.slice() : [];
    const merged = persisted.concat(builtin).filter(p=>{ if (!category || category==='all') return true; return (p.category||'').toLowerCase() === category.toLowerCase(); });
    if (merged.length===0){ container.innerHTML = '<div class="p-6 text-gray-300">No posts yet.</div>'; return; }
    function stripHtml(html){ return (html||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim(); }
    function truncate(s,len){ return s.length>len? s.slice(0,len-1)+'…': s; }
    function escapeHtml(unsafe){ return (unsafe||'').replace(/[&<>\"]/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]; }); }
    container.innerHTML = merged.map(post=>{
      const author = post.author || 'Ultre Team';
      const verified = post.verified ? '<span style="color:#60a5fa;margin-left:8px;font-weight:700">✔ Verified</span>' : '';
      const img = post.image || 'logo.png';
      const excerpt = truncate(stripHtml(post.content||post.excerpt||''), 180);
      return `
        <div class="blog-post-card bg-gray-800 rounded-lg overflow-hidden p-4" data-id="${post.id}">
          <div style="display:flex;gap:12px">
            <img src="${img}" alt="${escapeHtml(post.title)}" style="width:120px;height:80px;object-fit:cover;border-radius:6px" onerror="this.src='logo.png'"/>
            <div style="flex:1">
              <h4 style="margin:0 0 6px 0">${escapeHtml(post.title)}</h4>
              <div style="font-size:12px;color:#9ca3af;margin-bottom:8px">By ${escapeHtml(author)} ${verified} · ${post.readTime||''}</div>
              <div style="color:#cbd5e1">${escapeHtml(excerpt)}</div>
              <div style="margin-top:8px"><button class="shop-button read-more" data-id="${post.id}">Read more</button></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    container.querySelectorAll('.read-more').forEach(btn=> btn.addEventListener('click', ()=> openPostInline(btn.getAttribute('data-id'))));
  };
})();

/* Reading progress, inline viewer, recently-viewed, micro-animations */
(function(){
  function ensureReadingProgressBar(){ if (document.getElementById('reading-progress')) return; const bar = document.createElement('div'); bar.id='reading-progress'; bar.style.position='fixed'; bar.style.left='0'; bar.style.top='0'; bar.style.height='3px'; bar.style.width='0%'; bar.style.background='linear-gradient(90deg,#60a5fa,#8b5cf6)'; bar.style.zIndex='999999'; bar.style.transition='width 120ms linear'; document.body.appendChild(bar); }
  function updateReadingProgressForContainer(container){ const bar = document.getElementById('reading-progress'); if(!bar) return; let scrollTop = 0, scrollHeight = 0, clientHeight = 0; if (container === document.body || container === document.documentElement) { scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0; scrollHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight); clientHeight = window.innerHeight; } else { scrollTop = container.scrollTop; scrollHeight = container.scrollHeight; clientHeight = container.clientHeight; } const denom = Math.max(1, scrollHeight - clientHeight); const pct = Math.min(100, Math.max(0, (scrollTop / denom) * 100)); bar.style.width = pct + '%'; }
  function attachReadingProgress(container){ ensureReadingProgressBar(); const handler = () => updateReadingProgressForContainer(container); container._ultre_reading_handler = handler; container.addEventListener('scroll', handler, { passive:true }); window.addEventListener('scroll', handler, { passive:true }); setTimeout(handler, 80); }
  function detachReadingProgress(container){ try{ const h = container && container._ultre_reading_handler; if (h){ container.removeEventListener('scroll', h); window.removeEventListener('scroll', h); delete container._ultre_reading_handler; } }catch(e){} const bar = document.getElementById('reading-progress'); if (bar) bar.style.width = '0%'; }

  function ensureInlineViewer(){ if (document.getElementById('inline-post-viewer')) return; const v = document.createElement('div'); v.id = 'inline-post-viewer'; v.className = 'inline-post-viewer'; Object.assign(v.style, { position:'fixed', right:'16px', bottom:'16px', width:'420px', maxHeight:'70vh', overflow:'auto', background:'#0b1220', color:'#e5e7eb', border:'1px solid rgba(255,255,255,0.04)', borderRadius:'10px', padding:'12px', zIndex:999998, boxShadow:'0 12px 30px rgba(0,0,0,0.6)'}); v.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><strong>Article</strong><div><button id="inline-close" class="shop-button">Close</button></div></div><div id="inline-post-content" style="font-size:14px;line-height:1.6"></div>'; document.body.appendChild(v); document.getElementById('inline-close').addEventListener('click', closeInlinePost); v.style.display = 'none'; }

  window.openPostInline = window.openPostInline || function(postId){ if (localStorage.getItem('isLoggedIn') !== 'true'){ try{ if (typeof showPage === 'function') showPage('sign-in-main'); }catch(e){}; return; } ensureInlineViewer(); const persisted = loadFromStorage(STORAGE_KEYS.BLOG_POSTS, []); const builtin = (window.blogPosts && Array.isArray(window.blogPosts))? window.blogPosts.slice(): []; const merged = persisted.concat(builtin); const post = merged.find(p => p.id === postId); if (!post) { return; } const container = document.getElementById('inline-post-content'); container.innerHTML = '<h3 style="margin-top:0">'+escapeHtml(post.title)+'</h3><div style="font-size:12px;color:#9ca3af;margin-bottom:8px">By '+escapeHtml(post.author||'Ultre')+' · '+(post.date?new Date(post.date).toLocaleString():'')+'</div><div>'+ (post.content||'') +'</div>'; try{ const prefs = loadFromStorage(STORAGE_KEYS.PREFS, {}); if (prefs.animationsEnabled !== false && !document.documentElement.classList.contains('reduced-animations')) applyMicroAnimationsToArticle(container); }catch(e){} const viewer = document.getElementById('inline-post-viewer'); viewer.style.display = 'block'; attachReadingProgress(viewer); pushRecentlyViewed({ id: post.id, title: post.title||'' }); };

  function closeInlinePost(){ const v = document.getElementById('inline-post-viewer'); if (!v) return; detachReadingProgress(v); v.style.display = 'none'; }

  function pushRecentlyViewed(post){ try{ const key = 'ultre_recently_viewed'; const max = 12; const cur = loadFromStorage(key, []); const filtered = cur.filter(i=> i.id !== post.id); filtered.unshift({ id: post.id, title: post.title||'', seenAt: Date.now() }); const out = filtered.slice(0,max); saveToStorage(key, out); renderRecentlyViewedPanel(); }catch(e){} }

  function renderRecentlyViewedPanel(){ let panel = document.getElementById('recently-viewed-panel'); if (!panel){ panel = document.createElement('div'); panel.id = 'recently-viewed-panel'; Object.assign(panel.style, { position:'fixed', right:'16px', bottom:'86px', width:'320px', maxHeight:'60vh', overflow:'auto', background:'#071028', color:'#e6eef8', border:'1px solid rgba(255,255,255,0.04)', borderRadius:'10px', padding:'10px', zIndex:999998, boxShadow:'0 12px 30px rgba(0,0,0,0.6)'}); panel.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><strong>Recently read</strong><button id="recently-close" class="shop-button">Close</button></div><div id="recently-list"></div>'; document.body.appendChild(panel); document.getElementById('recently-close').addEventListener('click', ()=>{ panel.style.display='none'; }); } const listEl = document.getElementById('recently-list'); const items = loadFromStorage('ultre_recently_viewed', []); if (!items || items.length===0){ listEl.innerHTML = '<div style="color:#9ca3af">No recently viewed posts.</div>'; panel.style.display='none'; return; } listEl.innerHTML = items.map(it=>`<div style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.03);cursor:pointer" data-id="${it.id}"><div style="font-weight:700">${escapeHtml(it.title)}</div><div style="font-size:12px;color:#9ca3af">${new Date(it.seenAt).toLocaleString()}</div></div>`).join(''); listEl.querySelectorAll('[data-id]').forEach(el=> el.addEventListener('click', ()=> { openPostInline(el.getAttribute('data-id')); panel.style.display='none'; })); panel.style.display = 'block'; }

  function ensureRecentlyButton(){ if (document.getElementById('recently-btn')) return; const b = document.createElement('button'); b.id='recently-btn'; b.className='shop-button'; b.textContent='Recently'; Object.assign(b.style, { position:'fixed', right:'16px', bottom:'16px', zIndex:999997, padding:'8px 10px', borderRadius:'999px' }); document.body.appendChild(b); b.addEventListener('click', ()=>{ renderRecentlyViewedPanel(); }); }

  function applyMicroAnimationsToArticle(container){ try{ const nodes = container.querySelectorAll('p, h2, h3, li, blockquote'); nodes.forEach(n=>{ if (n.dataset.ultreAnimated) return; n.dataset.ultreAnimated='1'; n.style.opacity='0'; n.style.transform='translateY(8px)'; n.style.transition='opacity 420ms ease, transform 420ms ease'; }); const io = new IntersectionObserver((entries, obs)=>{ entries.forEach(entry=>{ if (entry.isIntersecting){ entry.target.style.opacity='1'; entry.target.style.transform='translateY(0)'; obs.unobserve(entry.target); } }); }, { root: container, threshold: 0.08 }); nodes.forEach(n=> io.observe(n)); }catch(e){} }

  document.addEventListener('DOMContentLoaded', ()=>{ try{ ensureReadingProgressBar(); ensureRecentlyButton(); }catch(e){} window.openPostInline = window.openPostInline || openPostInline; window.closeInlinePost = window.closeInlinePost || closeInlinePost; window.renderRecentlyViewedPanel = window.renderRecentlyViewedPanel || renderRecentlyViewedPanel; });
})();

/* Migration helper */
function migrateLegacyPreferences(){
  try{
    const legacyKeys = ['theme','darkMode','animationsEnabled','highContrast','screenReader','userFirstName','userLastName','userEmail','rememberMe','primaryColor','ultre_darkMode'];
    const prefs = loadFromStorage(STORAGE_KEYS.PREFS, {});
    let changed = false;
    legacyKeys.forEach(k => {
      try{
        if (typeof prefs[k] === 'undefined'){
          const v = localStorage.getItem(k);
          if (typeof v !== 'undefined' && v !== null){
            if (v === 'true') { prefs[k] = true; changed = true; }
            else if (v === 'false') { prefs[k] = false; changed = true; }
            else { prefs[k] = v; changed = true; }
          }
        }
      }catch(e){}
    });
    try{ const uld = localStorage.getItem('ultre_darkMode'); if (typeof prefs.darkMode === 'undefined' && uld !== null) { prefs.darkMode = (uld==='1'); changed = true; } }catch(e){}
    if (changed) saveToStorage(STORAGE_KEYS.PREFS, prefs);
  }catch(e){ console.warn('migration failed', e); }
}

/* Settings modal, logo fixes, and enhanced blog renderers (already attached via DOMContentLoaded in above IIFEs) */
(function(){
  function ensureSettingsModal(){ if (document.getElementById('settings-modal')) return; const modal = document.createElement('div'); modal.id = 'settings-modal'; modal.className = 'ultre-modal'; modal.style.display = 'none'; modal.innerHTML = `
      <div style="min-width:320px;max-width:720px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <h3 id="settingsContentTitle">Settings</h3>
          <button id="settings-close" class="shop-button">Close</button>
        </div>
        <div style="display:flex;gap:12px">
          <div style="min-width:140px">
            <ul id="settings-cats" style="list-style:none;padding:0;margin:0">
              <li><button class="settings-cat-btn" data-cat="general">General</button></li>
              <li><button class="settings-cat-btn" data-cat="appearance">Appearance</button></li>
              <li><button class="settings-cat-btn" data-cat="account">Account</button></li>
              <li><button class="settings-cat-btn" data-cat="notifications">Notifications</button></li>
              <li><button class="settings-cat-btn" data-cat="blog">Blog</button></li>
            </ul>
          </div>
          <div style="flex:1">
            <div id="settings-modal-content-area"></div>
            <div style="text-align:right;margin-top:8px">
              <button id="settings-save" class="shop-button">Save</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('settings-close').addEventListener('click', ()=> modal.style.display = 'none');
    document.getElementById('settings-save').addEventListener('click', ()=> {
      document.querySelectorAll('#settings-modal [data-setting-key]').forEach(el => { const evt = new Event('change', { bubbles: true }); el.dispatchEvent(evt); });
      try{ bindAutoSettings(); }catch(e){}
      try{ const prefs = loadFromStorage(STORAGE_KEYS.PREFS, {}); if (prefs.rememberMe) setCookie('ultre_rememberMe','true', 30); else deleteCookie('ultre_rememberMe'); if (prefs.userEmail) setCookie('ultre_userEmail', prefs.userEmail, 30); if (typeof prefs.darkMode !== 'undefined') setCookie('ultre_darkMode', prefs.darkMode ? '1' : '0', 30); if (prefs.primaryColor) setCookie('ultre_primaryColor', prefs.primaryColor, 30); }catch(e){}
      try{ const pending = window._ultre_pending_setting_changes || []; if (pending && pending.length){ const key = 'ultre_setting_change_logs'; const existing = loadFromStorage(key, []); const combined = existing.concat(pending.map(p => Object.assign({}, p, { committedAt: Date.now() }))); saveToStorage(key, combined); document.querySelectorAll('[data-setting-key].ultre-setting-pending').forEach(el=> el.classList.remove('ultre-setting-pending')); window._ultre_pending_setting_changes = []; } }catch(e){}
      try{ applySettingsFromLocalStorage(); }catch(e){}
      try{ window.dispatchEvent(new CustomEvent('ultre:settings-saved', { detail: { when: Date.now() } })); }catch(e){}
    });
    document.querySelectorAll('.settings-cat-btn').forEach(btn => { btn.addEventListener('click', ()=> updateSettingsModalContent(btn.getAttribute('data-cat'))); });
  }

  function updateSettingsModalContent(category){ ensureSettingsModal(); const titleEl = document.getElementById('settingsContentTitle'); const content = document.getElementById('settings-content-area'); titleEl.textContent = category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ') + ' Settings'; const prefs = loadFromStorage(STORAGE_KEYS.PREFS, {});
    const templates = {
      general: `
        <div style="display:flex;flex-direction:column;gap:8px">
          <label>First name<input data-setting-key="userFirstName" value="${prefs.userFirstName||''}" class="form-input"/></label>
          <label>Last name<input data-setting-key="userLastName" value="${prefs.userLastName||''}" class="form-input"/></label>
          <label>Email<input data-setting-key="userEmail" value="${prefs.userEmail||''}" class="form-input"/></label>
        </div>
      `,
      appearance: `
        <div style="display:flex;flex-direction:column;gap:8px">
          <label><input type="checkbox" data-setting-key="darkMode" ${prefs.darkMode?'checked':''}/> Dark mode</label>
          <label>Primary color<input type="color" data-setting-key="primaryColor" value="${prefs.primaryColor||'#2563EB'}"/></label>
        </div>
      `,
      account: `
        <div style="display:flex;flex-direction:column;gap:8px">
          <label>Remember me<input type="checkbox" data-setting-key="rememberMe" ${prefs.rememberMe==='true'?'checked':''}/></label>
          <label>Public profile<input type="checkbox" data-setting-key="publicProfile" ${prefs.publicProfile?'checked':''}/></label>
        </div>
      `,
      notifications: `
        <div style="display:flex;flex-direction:column;gap:8px">
          <label><input type="checkbox" data-setting-key="notifyOrders" ${prefs.notifyOrders?'checked':''}/> Order updates</label>
          <label><input type="checkbox" data-setting-key="notifyMarketing" ${prefs.notifyMarketing?'checked':''}/> Marketing emails</label>
        </div>
      `,
      blog: `
        <div style="display:flex;flex-direction:column;gap:8px">
          <label><input type="checkbox" data-setting-key="allowBlogNotifications" ${prefs.allowBlogNotifications?'checked':''}/> Enable blog notifications</label>
          <label>Default post visibility
            <select data-setting-key="defaultPostVisibility">
              <option value="public" ${prefs.defaultPostVisibility==='public'?'selected':''}>Public</option>
              <option value="members" ${prefs.defaultPostVisibility==='members'?'selected':''}>Members</option>
            </select>
          </label>
        </div>
      `
    };
    if (templates.appearance) { templates.appearance = templates.appearance.replace(/data-setting-key="darkMode"/g, 'data-setting-key="theme" data-is-dark-checkbox="true"'); }
    const modalContent = document.getElementById('settings-modal-content-area') || content;
    modalContent.innerHTML = templates[category] || '<div>No options for this section.</div>';
    try{ bindAutoSettings(); }catch(e){}
  }

  window.openSettingsModal = function(category='general'){ ensureSettingsModal(); document.getElementById('settings-modal').style.display = 'block'; updateSettingsModalContent(category); };

  // image/logo helpers
  function fixBrokenImages(){ document.querySelectorAll('img').forEach(img => { try{ const src = img.getAttribute('src') || ''; const alt = (img.getAttribute('alt')||'').toLowerCase(); if (!(src.toLowerCase().indexOf('logo') !== -1 || alt === 'logo' || alt.indexOf('logo') !== -1)) return; if (img.dataset._fallback) return; img.addEventListener('error', function(){ try{ if (this.dataset._fallback) return; this.dataset._fallback = '1'; this.src = 'logo.png'; this.alt = this.alt || 'logo'; }catch(e){} }); }catch(e){} }); }

  function applyLogoFilterToExistingImages(){ try{ const isLight = loadFromStorage(STORAGE_KEYS.PREFS, {}).theme === 'light'; document.querySelectorAll('img').forEach(img => { try{ if (!img.src) return; if ((img.src.indexOf('logo.png') !== -1 || img.getAttribute('alt') === 'logo') ){ if (isLight){ if (!img.src.endsWith('logo-light.svg')){ img.dataset._origSrc = img.src; img.src = 'logo-light.svg'; img.onerror = function(){ try{ if (img.dataset._origSrc) img.src = img.dataset._origSrc; img.style.filter = 'invert(1) brightness(0.92) contrast(1.06) saturate(0.9)'; img.style.filter = 'drop-shadow(0 8px 20px rgba(0,0,0,0.36))'; }catch(e){} }; } try{ img.style.filter = 'drop-shadow(0 8px 20px rgba(0,0,0,0.36))'; }catch(e){} } else { if (img.dataset._origSrc) { try{ img.src = img.dataset._origSrc; delete img.dataset._origSrc; }catch(e){} } img.style.filter = ''; } } }catch(e){} }); }catch(e){}
  }

  window.addEventListener('ultre:settings-saved', function(){ try{ applyLogoFilterToExistingImages(); }catch(e){} });
  window.addEventListener('ultre:settings-saved', function(){ try{ const isLight = loadFromStorage(STORAGE_KEYS.PREFS, {}).theme === 'light'; document.querySelectorAll('input[type="text"], input[type="email"], textarea, .form-input').forEach(el=>{ try{ if (isLight){ el.style.background='#fff'; el.style.color='#0f172a'; el.style.borderColor='#cbd5e1'; } else { el.style.background=''; el.style.color=''; el.style.borderColor=''; } }catch(e){} }); document.querySelectorAll('.shop-button, button').forEach(b=>{ try{ if (isLight){ b.style.background='#fff'; b.style.color='#0f172a'; b.style.border='1px solid #d1d5db'; } else { b.style.background=''; b.style.color=''; b.style.border=''; } }catch(e){} }); }catch(e){} });

  document.addEventListener('DOMContentLoaded', ()=>{ try{ fixBrokenImages(); ensureSettingsModal(); const settingsLaunchers = document.querySelectorAll('[data-open-settings]'); settingsLaunchers.forEach(el=> el.addEventListener('click', ()=> openSettings(el.getAttribute('data-settings-section')||'general'))); }catch(e){} });
})();
