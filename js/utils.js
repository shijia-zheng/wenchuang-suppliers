/**
 * 文创品供应商管理系统 — 工具函数
 */

// ==================== 分类路径 ====================
function getCategoryPath(cat1, cat2) {
  var cats = AppState.taxonomy.categories;
  for (var i = 0; i < cats.length; i++) {
    if (cats[i].id === cat1) {
      if (!cat2) return cats[i].name;
      var chs = cats[i].children || [];
      for (var j = 0; j < chs.length; j++) { if (chs[j].id === cat2) return cats[i].name + ' › ' + chs[j].name; }
      return cats[i].name;
    }
  }
  return cat1 || '未分类';
}

function getCategoryById(id) {
  var cats = AppState.taxonomy.categories;
  for (var i = 0; i < cats.length; i++) {
    if (cats[i].id === id) return cats[i];
    var chs = cats[i].children || [];
    for (var j = 0; j < chs.length; j++) { if (chs[j].id === id) return chs[j]; }
  }
  return null;
}

function getCategoryIcon(catId) {
  var cat = getCategoryById(catId);
  return cat ? cat.icon : '📁';
}

function countByCategory(catId) {
  if (!catId) return AppState.suppliers.length;
  var c = 0;
  for (var i = 0; i < AppState.suppliers.length; i++) {
    if (AppState.suppliers[i].cat1 === catId || AppState.suppliers[i].cat2 === catId) c++;
  }
  return c;
}

// ==================== 材质/工艺图标 ====================
function getMaterialIcon(name) {
  var mats = AppState.taxonomy.materials;
  for (var i = 0; i < mats.length; i++) {
    if (mats[i].name === name) return mats[i].icon;
  }
  return '🏷';
}

function getCraftIcon(name) {
  var cras = AppState.taxonomy.crafts;
  for (var i = 0; i < cras.length; i++) {
    if (cras[i].name === name) return cras[i].icon;
  }
  return '🔧';
}

// 兼容旧版：获取材质/工艺的纯名称列表
function getMaterialNames() {
  return AppState.taxonomy.materials.map(function(m) { return m.name; });
}

function getCraftNames() {
  return AppState.taxonomy.crafts.map(function(c) { return c.name; });
}

// 兼容旧版：根据名称列表查找完整对象
function findMaterialByName(name) {
  return AppState.taxonomy.materials.find(function(m) { return m.name === name; });
}

function findCraftByName(name) {
  return AppState.taxonomy.crafts.find(function(c) { return c.name === name; });
}

// ==================== 图片 URL 拆分 ====================
function getImageUrls(supplier) {
  if (!supplier.image_url) return [];
  return supplier.image_url.split(',').map(function(u) { return u.trim(); }).filter(Boolean);
}

function getFirstImageUrl(supplier) {
  var urls = getImageUrls(supplier);
  return urls.length > 0 ? urls[0] : null;
}

// ==================== HTML 转义 ====================
function escHtml(str) {
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(str || ''));
  return d.innerHTML;
}

// ==================== Toast ====================
function showToast(msg, type) {
  var e = document.querySelector('.toast'); if (e) e.remove();
  var t = document.createElement('div');
  t.className = 'toast' + (type ? ' toast-' + type : '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { t.remove(); }, 2200);
}

// ==================== ID / 日期 ====================
function generateId() { return 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); }
function formatDate(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

// ==================== Taxonomy 持久化 ====================
var LS_KEY_TAXONOMY = 'wenchuang_taxonomy_v4';

function loadTaxonomy() {
  var t = null;
  try {
    var raw = localStorage.getItem(LS_KEY_TAXONOMY);
    if (raw) t = JSON.parse(raw);
  } catch(e) {}
  if (!t) t = migrateOldTaxonomy();
  if (!t || !t.categories) t = JSON.parse(JSON.stringify(DEFAULT_TAXONOMY));

  // 确保是对象格式
  // 从 DEFAULT_TAXONOMY 中查找匹配图标
  var def = DEFAULT_TAXONOMY;
  var defMats = def.materials, defCras = def.crafts;
  if (t.materials) {
    t.materials = t.materials.map(function(m) {
      if (typeof m === 'object' && m.name && m.icon && m.icon !== '🏷') return m;
      var name = typeof m === 'string' ? m : m.name;
      var found = defMats.find(function(d) { return d.name === name; });
      return { name: name, icon: found ? found.icon : '🏷' };
    });
  }
  if (t.crafts) {
    t.crafts = t.crafts.map(function(c) {
      if (typeof c === 'object' && c.name && c.icon && c.icon !== '🔧') return c;
      var name = typeof c === 'string' ? c : c.name;
      var found = defCras.find(function(d) { return d.name === name; });
      return { name: name, icon: found ? found.icon : '🔧' };
    });
  }

  // 合并 DEFAULT_TAXONOMY 中缺失的 key（确保新字段始终存在）
  if (!t.customizationTags) t.customizationTags = JSON.parse(JSON.stringify(def.customizationTags));
  if (!t.serviceTags) t.serviceTags = JSON.parse(JSON.stringify(def.serviceTags));

  return t;
}

function migrateOldTaxonomy() {
  // 尝试读取 v3 旧格式，只做数据提取，图标匹配由 loadTaxonomy 统一处理
  try {
    var old = localStorage.getItem('wenchuang_taxonomy_v3');
    if (old) return JSON.parse(old);
  } catch(e) {}
  return JSON.parse(JSON.stringify(DEFAULT_TAXONOMY));
}

function saveTaxonomy(t) {
  try { localStorage.setItem(LS_KEY_TAXONOMY, JSON.stringify(t)); } catch(e) {}
}

// ==================== Suppliers 持久化 ====================
var LS_KEY_SUPPLIERS = 'wenchuang_suppliers_v4';

function lsGetSuppliers() {
  try { var r = localStorage.getItem(LS_KEY_SUPPLIERS); return r ? JSON.parse(r) : null; }
  catch(e) { return null; }
}
function lsSetSuppliers(d) { try { localStorage.setItem(LS_KEY_SUPPLIERS, JSON.stringify(d)); } catch(e) {} }

// 图片缓存
var LS_KEY_IMAGES = 'wenchuang_images_cache_v4';
function lsGetImagesCache() { try { var r = localStorage.getItem(LS_KEY_IMAGES); return r ? JSON.parse(r) : {}; } catch(e) { return {}; } }
function lsSetImagesCache(d) { try { localStorage.setItem(LS_KEY_IMAGES, JSON.stringify(d)); } catch(e) {} }
