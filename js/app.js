/**
 * 文创品供应商管理系统 v4
 * 视图：卡片(默认) / 表格 / 看板
 * 新增：起订量/单价/工期/所在地/定制能力/服务水平 + 材质工艺图标 + 多图片
 */

var AppState = {
  suppliers: [], taxonomy: null, thumbnails: {},
  viewMode: 'card',
  selectedCategory: null,
  selectedMaterials: [], selectedCrafts: [],
  selectedLocation: '', selectedCustomization: [], selectedService: [],
  searchQuery: '', sortField: 'name', sortAsc: true,
  deleteTargetId: null, gallerySupplierId: null, galleryImages: [], lightboxIndex: 0,
  isOnline: false, settingsTab: 'categories'
};

// ==================== DATA LOADING ====================

async function loadAllData() {
  AppState.taxonomy = loadTaxonomy();
  if (!AppState.taxonomy || !AppState.taxonomy.categories) {
    AppState.taxonomy = JSON.parse(JSON.stringify(DEFAULT_TAXONOMY));
    saveTaxonomy(AppState.taxonomy);
  }
  AppState.isOnline = initSupabase();
  if (AppState.isOnline) {
    var data = await sbFetchSuppliers();
    if (data !== null) { AppState.suppliers = data; lsSetSuppliers(data); sbFetchAllThumbnails().then(function(m) { if (m) { AppState.thumbnails = m; refreshView(); } }); finishInit(); return; }
    AppState.isOnline = false;
  }
  var cached = lsGetSuppliers();
  AppState.suppliers = (cached && cached.length > 0) ? cached : JSON.parse(JSON.stringify(SAMPLE_DATA));
  lsSetSuppliers(AppState.suppliers);
  AppState.thumbnails = {};
  finishInit();
}

function finishInit() {
  renderAll();
  setupDropZone();
  var el = document.getElementById('modeStatus'); if (el) el.textContent = AppState.isOnline ? '☁️ 云端' : '💻 本地';
}

// ==================== VIEW SWITCHING ====================

function switchView(mode) {
  AppState.viewMode = mode;
  var tabs = document.querySelectorAll('.view-tab');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('active', tabs[i].getAttribute('data-view') === mode);
  document.getElementById('viewCard').style.display = mode === 'card' ? '' : 'none';
  document.getElementById('viewTable').style.display = mode === 'table' ? '' : 'none';
  document.getElementById('viewKanban').style.display = mode === 'kanban' ? '' : 'none';
  refreshView();
}

function refreshView() {
  if (AppState.viewMode === 'card') renderCardView();
  else if (AppState.viewMode === 'table') renderTableView();
  else if (AppState.viewMode === 'kanban') renderKanbanView();
}

// ==================== FILTERS ====================

function getFiltered() {
  var r = AppState.suppliers.slice();
  if (AppState.selectedCategory) r = r.filter(function(s) { return s.cat1 === AppState.selectedCategory || s.cat2 === AppState.selectedCategory; });
  if (AppState.searchQuery) {
    var q = AppState.searchQuery.toLowerCase();
    r = r.filter(function(s) { return s.name.toLowerCase().indexOf(q) >= 0 || (s.contact && s.contact.toLowerCase().indexOf(q) >= 0) || (s.note && s.note.toLowerCase().indexOf(q) >= 0) || (s.location && s.location.toLowerCase().indexOf(q) >= 0); });
  }
  if (AppState.selectedMaterials.length > 0) r = r.filter(function(s) { if (!s.materials || !s.materials.length) return false; for (var i = 0; i < AppState.selectedMaterials.length; i++) { if (s.materials.indexOf(AppState.selectedMaterials[i]) >= 0) return true; } return false; });
  if (AppState.selectedCrafts.length > 0) r = r.filter(function(s) { if (!s.crafts || !s.crafts.length) return false; for (var i = 0; i < AppState.selectedCrafts.length; i++) { if (s.crafts.indexOf(AppState.selectedCrafts[i]) >= 0) return true; } return false; });
  if (AppState.selectedLocation) r = r.filter(function(s) { return s.location && s.location.indexOf(AppState.selectedLocation) >= 0; });
  if (AppState.selectedCustomization.length > 0) r = r.filter(function(s) { if (!s.customization || !s.customization.length) return false; for (var i = 0; i < AppState.selectedCustomization.length; i++) { if (s.customization.indexOf(AppState.selectedCustomization[i]) >= 0) return true; } return false; });
  if (AppState.selectedService.length > 0) r = r.filter(function(s) { if (!s.service_level || !s.service_level.length) return false; for (var i = 0; i < AppState.selectedService.length; i++) { if (s.service_level.indexOf(AppState.selectedService[i]) >= 0) return true; } return false; });

  r.sort(function(a, b) {
    var va, vb;
    if (AppState.sortField === 'name') { va = a.name; vb = b.name; }
    else if (AppState.sortField === 'category') { va = getCategoryPath(a.cat1, a.cat2); vb = getCategoryPath(b.cat1, b.cat2); }
    else if (AppState.sortField === 'rating') { va = a.rating || 0; vb = b.rating || 0; }
    else { va = a.name; vb = b.name; }
    var cmp = typeof va === 'string' ? va.localeCompare(vb, 'zh') : va - vb;
    return AppState.sortAsc ? cmp : -cmp;
  });
  return r;
}

function applyFilters() { AppState.searchQuery = document.getElementById('searchInput').value.trim(); refreshView(); updateFooter(); }

function toggleFilter(arr, val) { var i = arr.indexOf(val); if (i >= 0) arr.splice(i, 1); else arr.push(val); }

function selectCategory(catId) { AppState.selectedCategory = catId; renderTree(); refreshView(); updateFooter(); }

// ==================== SIDEBAR RENDER ====================

function renderTree() {
  var c = document.getElementById('treeContainer'); if (!c) return;
  var cats = AppState.taxonomy.categories;
  var h = '<div class="tree-row' + (AppState.selectedCategory === null ? ' selected' : '') + '" onclick="selectCategory(null)"><span class="tree-arrow empty">▶</span><span class="tree-icon">📋</span><span class="tree-label">全部供应商</span><span class="tree-count">' + AppState.suppliers.length + '</span></div>';
  for (var i = 0; i < cats.length; i++) {
    var root = cats[i], total = 0, cc = [];
    for (var j = 0; j < (root.children || []).length; j++) { var n = countByCategory(root.children[j].id); cc.push(n); total += n; }
    var expanded = AppState.selectedCategory === root.id;
    if (!expanded) for (var k = 0; k < (root.children || []).length; k++) { if (AppState.selectedCategory === root.children[k].id) { expanded = true; break; } }
    h += '<div class="tree-row' + (AppState.selectedCategory === root.id ? ' selected' : '') + '" onclick="selectCategory(\'' + root.id + '\')"><span class="tree-arrow' + (expanded ? ' expanded' : '') + '" onclick="event.stopPropagation();toggleTreeNode(\'' + root.id + '\')">▶</span><span class="tree-icon">' + root.icon + '</span><span class="tree-label">' + root.name + '</span><span class="tree-count">' + total + '</span></div>';
    h += '<div class="tree-children' + (expanded ? '' : ' collapsed') + '" id="treeChildren-' + root.id + '" style="max-height:' + (expanded ? (root.children || []).length * 40 : 0) + 'px">';
    for (var m = 0; m < (root.children || []).length; m++) {
      var ch = root.children[m];
      h += '<div class="tree-row' + (AppState.selectedCategory === ch.id ? ' selected' : '') + '" onclick="selectCategory(\'' + ch.id + '\')" style="padding-left:36px"><span class="tree-arrow empty">▶</span><span class="tree-icon">' + ch.icon + '</span><span class="tree-label">' + ch.name + '</span><span class="tree-count">' + cc[m] + '</span></div>';
    }
    h += '</div>';
  }
  c.innerHTML = h;
}

function toggleTreeNode(id) { var el = document.getElementById('treeChildren-' + id); if (!el) return; var coll = el.classList.contains('collapsed'); if (coll) { el.classList.remove('collapsed'); el.style.maxHeight = el.scrollHeight + 'px'; var a = el.previousElementSibling.querySelector('.tree-arrow'); if (a) a.classList.add('expanded'); } else { el.classList.add('collapsed'); el.style.maxHeight = '0px'; var b = el.previousElementSibling.querySelector('.tree-arrow'); if (b) b.classList.remove('expanded'); } }

function renderFilterChips() {
  var mc = document.getElementById('materialChips'), cc = document.getElementById('craftChips');
  if (!mc || !cc) return;
  var mh = '', ch = '';
  var mats = AppState.taxonomy.materials;
  var cras = AppState.taxonomy.crafts;
  for (var i = 0; i < mats.length; i++) mh += '<span class="filter-chip material' + (AppState.selectedMaterials.indexOf(mats[i].name) >= 0 ? ' active' : '') + '" onclick="toggleFilter(AppState.selectedMaterials,\'' + mats[i].name + '\');renderFilterChips();refreshView();updateFooter()">' + mats[i].icon + ' ' + mats[i].name + '</span>';
  for (var j = 0; j < cras.length; j++) ch += '<span class="filter-chip craft' + (AppState.selectedCrafts.indexOf(cras[j].name) >= 0 ? ' active' : '') + '" onclick="toggleFilter(AppState.selectedCrafts,\'' + cras[j].name + '\');renderFilterChips();refreshView();updateFooter()">' + cras[j].icon + ' ' + cras[j].name + '</span>';
  mc.innerHTML = mh; cc.innerHTML = ch;

  // 所在地筛选
  var lc = document.getElementById('locationChips');
  if (lc) {
    var locs = {};
    for (var li = 0; li < AppState.suppliers.length; li++) { var loc = AppState.suppliers[li].location; if (loc) locs[loc] = (locs[loc] || 0) + 1; }
    var lh = '', lkeys = Object.keys(locs).sort();
    for (var lj = 0; lj < lkeys.length; lj++) lh += '<span class="filter-chip' + (AppState.selectedLocation === lkeys[lj] ? ' active' : '') + '" onclick="if(AppState.selectedLocation===\'' + lkeys[lj] + '\')AppState.selectedLocation=\'\';else AppState.selectedLocation=\'' + lkeys[lj] + '\';renderFilterChips();refreshView();updateFooter()">📍 ' + lkeys[lj] + ' (' + locs[lkeys[lj]] + ')</span>';
    lc.innerHTML = lh || '<span style="font-size:11px;color:var(--text-muted)">暂无数据</span>';
  }

  // 定制能力筛选
  var cusc = document.getElementById('customizationChips');
  if (cusc) {
    var cusTags = AppState.taxonomy.customizationTags || [];
    var cush = '';
    for (var ci = 0; ci < cusTags.length; ci++) cush += '<span class="filter-chip' + (AppState.selectedCustomization.indexOf(cusTags[ci]) >= 0 ? ' active' : '') + '" onclick="toggleFilter(AppState.selectedCustomization,\'' + cusTags[ci] + '\');renderFilterChips();refreshView();updateFooter()">🎨 ' + cusTags[ci] + '</span>';
    cusc.innerHTML = cush;
  }

  // 服务水平筛选
  var svc = document.getElementById('serviceChips');
  if (svc) {
    var svcTags = AppState.taxonomy.serviceTags || [];
    var svh = '';
    for (var si = 0; si < svcTags.length; si++) svh += '<span class="filter-chip' + (AppState.selectedService.indexOf(svcTags[si]) >= 0 ? ' active' : '') + '" onclick="toggleFilter(AppState.selectedService,\'' + svcTags[si] + '\');renderFilterChips();refreshView();updateFooter()">📦 ' + svcTags[si] + '</span>';
    svc.innerHTML = svh;
  }
}

// ==================== CARD VIEW ====================

function renderCardView() {
  var filtered = getFiltered();
  var grid = document.getElementById('cardGrid'); if (!grid) return;
  if (filtered.length === 0) { grid.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>暂无匹配的供应商</p><button class="btn btn-primary" style="margin-top:10px" onclick="openAddModal()">＋ 新增供应商</button></div>'; return; }

  var html = '';
  for (var i = 0; i < filtered.length; i++) {
    var s = filtered[i];
    var stars = ''; for (var st = 0; st < 5; st++) stars += st < (s.rating || 0) ? '⭐' : '☆';

    // 材质/工艺标签（带图标）
    var mtags = '', ctags = '';
    if (s.materials) for (var mi = 0; mi < Math.min(s.materials.length, 4); mi++) mtags += '<span class="tag tag-material">' + getMaterialIcon(s.materials[mi]) + ' ' + escHtml(s.materials[mi]) + '</span>';
    if (s.crafts) for (var ci = 0; ci < Math.min(s.crafts.length, 3); ci++) ctags += '<span class="tag tag-craft">' + getCraftIcon(s.crafts[ci]) + ' ' + escHtml(s.crafts[ci]) + '</span>';

    // 图片
    var src = getFirstImageUrl(s) || (AppState.thumbnails[s.id] || null);
    var imgHtml;
    if (src) imgHtml = '<img src="' + src + '" class="card-img" alt="产品图" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><div class="card-img-placeholder" style="display:none">🖼️</div>';
    else { var icons = ['🎨','📦','🎁','🖼️','✨','🏆','💎','🌟','🎯','🔮']; imgHtml = '<div class="card-img-placeholder">' + icons[i % icons.length] + '</div>'; }

    // meta 信息行
    var meta = [];
    if (s.location) meta.push('📍' + escHtml(s.location));
    if (s.moq) meta.push('📦' + escHtml(s.moq));
    if (s.unit_price) meta.push('💰' + escHtml(s.unit_price));
    if (s.lead_time) meta.push('⏱' + escHtml(s.lead_time));
    var metaHtml = meta.length > 0 ? '<div class="card-meta">' + meta.map(function(m) { return '<span>' + m + '</span>'; }).join('') + '</div>' : '';

    // 定制/服务标签
    var infoTags = '';
    var allInfo = (s.customization || []).concat(s.service_level || []);
    for (var iti = 0; iti < allInfo.length; iti++) infoTags += '<span class="card-info-tag">' + escHtml(allInfo[iti]) + '</span>';

    // 图片数量徽标
    var urls = getImageUrls(s);
    var imgBadge = urls.length > 1 ? '<span class="img-count-badge">' + urls.length + '图</span>' : '';

    html += '<div class="supplier-card" onclick="openEditModal(\'' + s.id + '\')">' +
      '<div class="card-img-wrap">' + imgHtml + imgBadge +
        '<div class="card-actions">' +
          (AppState.isOnline ? '<button class="card-action-btn" onclick="event.stopPropagation();openGallery(\'' + s.id + '\')" title="产品图片">🖼️</button>' : '') +
          '<button class="card-action-btn" onclick="event.stopPropagation();openDeleteConfirm(\'' + s.id + '\')" title="删除">🗑️</button>' +
        '</div></div>' +
      '<div class="card-body">' +
        '<div class="card-name"><span class="rating-stars" style="margin-right:6px">' + stars + '</span>' + escHtml(s.name) + '</div>' +
        '<div class="card-category">' + getCategoryIcon(s.cat1) + ' ' + getCategoryPath(s.cat1, s.cat2) + '</div>' +
        '<div class="card-tags">' + mtags + ctags + '</div>' +
        metaHtml +
        (infoTags ? '<div class="card-info-tags">' + infoTags + '</div>' : '') +
        (s.contact ? '<div class="card-contact" style="margin-top:4px">👤 ' + escHtml(s.contact) + '</div>' : '') +
      '</div></div>';
  }
  grid.innerHTML = html;
}

// ==================== TABLE VIEW ====================

function setSort(f) { if (AppState.sortField === f) AppState.sortAsc = !AppState.sortAsc; else { AppState.sortField = f; AppState.sortAsc = true; } renderTableView(); }

function renderTableView() {
  var filtered = getFiltered();
  var tbody = document.getElementById('tableBody'); if (!tbody) return;
  ['name','category','rating'].forEach(function(f) { var a = document.getElementById('sortArrow-' + f); if (a) a.textContent = AppState.sortField === f ? (AppState.sortAsc ? '▲' : '▼') : ''; });
  if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="icon">📭</div><p>暂无匹配的供应商</p></div></td></tr>'; return; }

  var rows = '';
  for (var i = 0; i < filtered.length; i++) {
    var s = filtered[i];
    var src2 = getFirstImageUrl(s) || (AppState.thumbnails[s.id] || null);
    var thumbHtml = src2 ? '<img src="' + src2 + '" class="thumb-preview" onclick="event.stopPropagation();openGallery(\'' + s.id + '\')" loading="lazy" onerror="this.style.display=\'none\'">' :
      (AppState.isOnline ? '<span class="thumb-placeholder" onclick="event.stopPropagation();openGallery(\'' + s.id + '\')">📷</span>' : '<span class="thumb-placeholder offline">—</span>');

    var mtags = '', ctags = '';
    if (s.materials) for (var mi2 = 0; mi2 < s.materials.length; mi2++) mtags += '<span class="tag tag-material">' + getMaterialIcon(s.materials[mi2]) + ' ' + escHtml(s.materials[mi2]) + '</span>';
    if (s.crafts) for (var ci2 = 0; ci2 < s.crafts.length; ci2++) ctags += '<span class="tag tag-craft">' + getCraftIcon(s.crafts[ci2]) + ' ' + escHtml(s.crafts[ci2]) + '</span>';
    var stars2 = ''; for (var st2 = 0; st2 < 5; st2++) stars2 += st2 < (s.rating || 0) ? '⭐' : '☆';

    var meta = [];
    if (s.location) meta.push(escHtml(s.location));
    if (s.moq) meta.push(escHtml(s.moq));

    rows += '<tr><td class="thumb-cell">' + thumbHtml + '</td>' +
      '<td><strong>' + escHtml(s.name) + '</strong>' + (s.note ? '<br><small class="note-text">' + escHtml(s.note) + '</small>' : '') + '</td>' +
      '<td><span class="tag tag-category">' + getCategoryPath(s.cat1, s.cat2) + '</span></td>' +
      '<td>' + (mtags || '<span class="muted">-</span>') + '</td>' +
      '<td>' + (ctags || '<span class="muted">-</span>') + '</td>' +
      '<td><span class="rating-stars">' + stars2 + '</span></td>' +
      '<td>' + escHtml(s.contact || '-') + '<br><small class="note-text">' + meta.join(' | ') + '</small></td>' +
      '<td><button class="btn btn-sm btn-outline" onclick="openEditModal(\'' + s.id + '\')">✏️</button> ' +
      (AppState.isOnline ? '<button class="btn btn-sm btn-outline" style="color:var(--accent-blue);border-color:var(--accent-blue)" onclick="openGallery(\'' + s.id + '\')">🖼️</button> ' : '') +
      '<button class="btn btn-sm btn-danger" onclick="openDeleteConfirm(\'' + s.id + '\')">🗑️</button></td></tr>';
  }
  tbody.innerHTML = rows;
}

// ==================== KANBAN VIEW ====================

function renderKanbanView() {
  var board = document.getElementById('kanbanBoard'); if (!board) return;
  var cats = AppState.taxonomy.categories, filtered = getFiltered(), html = '';
  for (var i = 0; i < cats.length; i++) {
    var cat = cats[i], col = [];
    for (var j = 0; j < filtered.length; j++) { if (filtered[j].cat1 === cat.id) col.push(filtered[j]); }
    html += '<div class="kanban-col" data-cat1="' + cat.id + '" ondragover="kanbanDragOver(event)" ondragleave="kanbanDragLeave(event)" ondrop="kanbanDrop(event,\'' + cat.id + '\')"><div class="kanban-col-header">' + cat.icon + ' ' + cat.name + '<span class="kanban-col-count">' + col.length + '</span></div><div class="kanban-col-body">';
    if (col.length === 0) html += '<div class="kanban-empty">拖拽供应商卡片到此处</div>';
    else for (var k = 0; k < col.length; k++) {
      var s = col[k], stars3 = '';
      for (var st3 = 0; st3 < 5; st3++) stars3 += st3 < (s.rating || 0) ? '⭐' : '☆';
      var kmtags = '';
      if (s.materials) for (var mi3 = 0; mi3 < Math.min(s.materials.length, 3); mi3++) kmtags += '<span class="tag tag-material">' + getMaterialIcon(s.materials[mi3]) + '</span>';
      var metaShort = [s.location, s.moq, s.unit_price].filter(Boolean).join(' | ');
      html += '<div class="kanban-card" draggable="true" ondragstart="kanbanDragStart(event,\'' + s.id + '\')" ondragend="kanbanDragEnd(event)" data-id="' + s.id + '" onclick="openEditModal(\'' + s.id + '\')"><div class="kanban-card-name">' + escHtml(s.name) + '</div><div class="kanban-card-meta">' + stars3 + '</div>' + (metaShort ? '<div class="kanban-card-meta">' + escHtml(metaShort) + '</div>' : '') + '<div class="kanban-card-tags">' + kmtags + '</div></div>';
    }
    html += '</div></div>';
  }
  board.innerHTML = html;
}

// Kanban DnD
function kanbanDragStart(e, id) { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; var c = e.target.closest('.kanban-card'); if (c) setTimeout(function() { c.classList.add('dragging'); }, 0); }
function kanbanDragEnd(e) { var c = e.target.closest('.kanban-card'); if (c) c.classList.remove('dragging'); var bs = document.querySelectorAll('.kanban-col-body'); for (var i = 0; i < bs.length; i++) bs[i].classList.remove('drag-over'); }
function kanbanDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; var b = e.target.closest('.kanban-col-body'); if (b) b.classList.add('drag-over'); }
function kanbanDragLeave(e) { var b = e.target.closest('.kanban-col-body'); if (b) b.classList.remove('drag-over'); }
async function kanbanDrop(e, cat1) { e.preventDefault(); var b = e.target.closest('.kanban-col-body'); if (b) b.classList.remove('drag-over'); var id = e.dataTransfer.getData('text/plain'); if (!id) return; for (var i = 0; i < AppState.suppliers.length; i++) { if (AppState.suppliers[i].id === id) { AppState.suppliers[i].cat1 = cat1; AppState.suppliers[i].cat2 = ''; if (AppState.isOnline) await sbUpdateSupplier(id, AppState.suppliers[i]); lsSetSuppliers(AppState.suppliers); break; } } renderKanbanView(); updateFooter(); showToast('分类已更新 ✅'); }

// ==================== FOOTER ====================

function updateFooter() {
  var f = getFiltered();
  var el = document.getElementById('resultCount'); if (el) el.textContent = '找到 ' + f.length + ' 条';
  var fi = document.getElementById('footerInfo'); if (fi) fi.textContent = '共 ' + AppState.suppliers.length + ' 条记录 | ' + (AppState.isOnline ? '☁️ Supabase' : '💻 本地存储');
}

// ==================== SETTINGS MODAL ====================

function openSettingsModal() {
  document.getElementById('settingsOverlay').style.display = 'flex';
  AppState.settingsTab = 'categories';
  switchSettingsTab('categories');
  var tabs = document.querySelectorAll('.settings-tab');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('active', tabs[i].getAttribute('data-stab') === 'categories');
}

function closeSettingsModal() { document.getElementById('settingsOverlay').style.display = 'none'; saveTaxonomy(AppState.taxonomy); renderTree(); renderFilterChips(); refreshView(); }

function switchSettingsTab(tab) {
  AppState.settingsTab = tab;
  var tabs = document.querySelectorAll('.settings-tab');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('active', tabs[i].getAttribute('data-stab') === tab);
  var body = document.getElementById('settingsBody');
  if (tab === 'categories') renderSettingsCategories(body);
  else if (tab === 'materials') renderSettingsTags(body, 'materials', '材质', 'name');
  else if (tab === 'crafts') renderSettingsTags(body, 'crafts', '工艺', 'name');
  else if (tab === 'customizationTags') renderSettingsTags(body, 'customizationTags', '定制能力', null);
  else if (tab === 'serviceTags') renderSettingsTags(body, 'serviceTags', '服务水平', null);
}

function renderSettingsCategories(c) {
  var cats = AppState.taxonomy.categories, h = '';
  for (var i = 0; i < cats.length; i++) {
    var root = cats[i], cc = countByCategory(root.id);
    h += '<div class="taxonomy-item"><span class="icon">' + root.icon + '</span><span class="name"><strong>' + escHtml(root.name) + '</strong></span><span class="count">' + cc + ' 家</span><div class="actions"><button class="btn btn-sm btn-outline" onclick="editCategory(\'' + root.id + '\')">✏️</button><button class="btn btn-sm btn-danger" onclick="deleteCategory(\'' + root.id + '\')">✕</button></div></div>';
    var chs = root.children || [];
    for (var j = 0; j < chs.length; j++) { var ch = chs[j], chc = countByCategory(ch.id); h += '<div class="taxonomy-item taxonomy-child"><span class="icon">' + ch.icon + '</span><span class="name">' + escHtml(ch.name) + '</span><span class="count">' + chc + ' 家</span><div class="actions"><button class="btn btn-sm btn-outline" onclick="editSubCategory(\'' + root.id + '\',\'' + ch.id + '\')">✏️</button><button class="btn btn-sm btn-danger" onclick="deleteSubCategory(\'' + root.id + '\',\'' + ch.id + '\')">✕</button></div></div>'; }
    h += '<div class="taxonomy-add taxonomy-child"><input type="text" id="newChild-' + root.id + '" placeholder="新增二级分类..."><input type="text" id="newChildIcon-' + root.id + '" placeholder="图标" style="width:60px" value="📁"><button class="btn btn-sm btn-primary" onclick="addSubCategory(\'' + root.id + '\')">＋</button></div>';
  }
  h += '<div class="taxonomy-add" style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px"><input type="text" id="newRoot" placeholder="新增大类..."><input type="text" id="newRootIcon" placeholder="图标" style="width:60px" value="📁"><button class="btn btn-sm btn-primary" onclick="addRootCategory()">＋ 添加大类</button></div>';
  c.innerHTML = h;
}

function renderSettingsTags(c, key, label, field) {
  var items = AppState.taxonomy[key], h = '<p style="font-size:12px;color:var(--text-muted);margin-bottom:10px">点击 ✕ 删除（被使用的无法删除）</p>';
  for (var i = 0; i < items.length; i++) {
    var name = field ? items[i][field] : items[i];
    h += '<div class="taxonomy-item"><span class="name">' + (items[i].icon ? items[i].icon + ' ' : '') + escHtml(name) + '</span><span class="count" style="margin-left:auto;margin-right:8px">' + countUsage(key, name) + ' 家</span><button class="btn btn-sm btn-danger" onclick="deleteTag(\'' + key + '\',\'' + name + '\')">✕</button></div>';
  }
  h += '<div class="taxonomy-add"><input type="text" id="newTag" placeholder="新增' + label + '..."><button class="btn btn-sm btn-primary" onclick="addTag(\'' + key + '\')">＋</button></div>';
  c.innerHTML = h;
}

function countUsage(key, value) {
  var field = key === 'materials' ? 'materials' : key === 'crafts' ? 'crafts' : key === 'customizationTags' ? 'customization' : 'service_level', c = 0;
  for (var i = 0; i < AppState.suppliers.length; i++) { var arr = AppState.suppliers[i][field]; if (arr && arr.indexOf(value) >= 0) c++; }
  return c;
}

function addRootCategory() { var n = document.getElementById('newRoot').value.trim(), ic = document.getElementById('newRootIcon').value.trim() || '📁'; if (!n) return; AppState.taxonomy.categories.push({ id: 'cat_' + Date.now(), name: n, icon: ic, children: [] }); saveTaxonomy(AppState.taxonomy); switchSettingsTab('categories'); }
function editCategory(id) { var cat = getCategoryById(id); if (!cat) return; var n = prompt('编辑名称：', cat.name); if (n && n.trim()) { cat.name = n.trim(); var ic = prompt('编辑图标：', cat.icon); if (ic && ic.trim()) cat.icon = ic.trim(); saveTaxonomy(AppState.taxonomy); switchSettingsTab('categories'); } }
function deleteCategory(id) { var cat = getCategoryById(id), u = countByCategory(id); if (!cat) return; if (u > 0) { alert('该分类下有 ' + u + ' 家，请先迁移'); return; } if (!confirm('删除 "' + cat.name + '"？')) return; AppState.taxonomy.categories = AppState.taxonomy.categories.filter(function(c) { return c.id !== id; }); saveTaxonomy(AppState.taxonomy); switchSettingsTab('categories'); }
function addSubCategory(pid) { var n = document.getElementById('newChild-' + pid).value.trim(), ic = document.getElementById('newChildIcon-' + pid).value.trim() || '📁'; if (!n) return; var p = getCategoryById(pid); if (!p) return; if (!p.children) p.children = []; p.children.push({ id: 'sub_' + Date.now(), name: n, icon: ic }); saveTaxonomy(AppState.taxonomy); switchSettingsTab('categories'); }
function editSubCategory(pid, cid) { var p = getCategoryById(pid); if (!p || !p.children) return; for (var i = 0; i < p.children.length; i++) { if (p.children[i].id === cid) { var n = prompt('编辑名称：', p.children[i].name); if (n && n.trim()) p.children[i].name = n.trim(); var ic = prompt('编辑图标：', p.children[i].icon); if (ic && ic.trim()) p.children[i].icon = ic.trim(); saveTaxonomy(AppState.taxonomy); switchSettingsTab('categories'); return; } } }
function deleteSubCategory(pid, cid) { var p = getCategoryById(pid), u = countByCategory(cid); if (!p || !p.children) return; if (u > 0) { alert('该子分类下有 ' + u + ' 家，请先迁移'); return; } if (!confirm('删除此子分类？')) return; p.children = p.children.filter(function(c) { return c.id !== cid; }); saveTaxonomy(AppState.taxonomy); switchSettingsTab('categories'); }

function addTag(key) {
  var input = document.getElementById('newTag'), n = input ? input.value.trim() : ''; if (!n) return;
  if (key === 'materials' || key === 'crafts') {
    var exists = AppState.taxonomy[key].some(function(x) { return x.name === n; }); if (exists) { alert('已存在'); return; }
    AppState.taxonomy[key].push({ name: n, icon: '🏷' });
  } else if (key === 'customizationTags') {
    if (AppState.taxonomy.customizationTags.indexOf(n) >= 0) { alert('已存在'); return; }
    AppState.taxonomy.customizationTags.push(n);
  } else if (key === 'serviceTags') {
    if (AppState.taxonomy.serviceTags.indexOf(n) >= 0) { alert('已存在'); return; }
    AppState.taxonomy.serviceTags.push(n);
  }
  saveTaxonomy(AppState.taxonomy); switchSettingsTab(key); renderFilterChips();
}

function deleteTag(key, value) {
  var u = countUsage(key, value); if (u > 0) { alert('该标签被 ' + u + ' 家使用，请先移除'); return; }
  if (!confirm('删除 "' + value + '"？')) return;
  if (key === 'materials' || key === 'crafts') AppState.taxonomy[key] = AppState.taxonomy[key].filter(function(x) { return x.name !== value; });
  else if (key === 'customizationTags') AppState.taxonomy.customizationTags = AppState.taxonomy.customizationTags.filter(function(x) { return x !== value; });
  else if (key === 'serviceTags') AppState.taxonomy.serviceTags = AppState.taxonomy.serviceTags.filter(function(x) { return x !== value; });
  if (key === 'materials') AppState.selectedMaterials = AppState.selectedMaterials.filter(function(x) { return x !== value; });
  else if (key === 'crafts') AppState.selectedCrafts = AppState.selectedCrafts.filter(function(x) { return x !== value; });
  else if (key === 'customizationTags') AppState.selectedCustomization = AppState.selectedCustomization.filter(function(x) { return x !== value; });
  else if (key === 'serviceTags') AppState.selectedService = AppState.selectedService.filter(function(x) { return x !== value; });
  saveTaxonomy(AppState.taxonomy); switchSettingsTab(key); renderFilterChips();
}

// ==================== SUPPLIER CRUD ====================

function openAddModal() {
  document.getElementById('editId').value = '';
  document.getElementById('modalTitle').innerHTML = '✏️ 新增供应商';
  document.getElementById('formName').value = '';
  document.getElementById('formContact').value = '';
  document.getElementById('formRating').value = '5';
  document.getElementById('formNote').value = '';
  document.getElementById('formMoq').value = '';
  document.getElementById('formUnitPrice').value = '';
  document.getElementById('formLeadTime').value = '';
  document.getElementById('formLocation').value = '';
  document.getElementById('formImageUrl').value = '';
  buildCatSelects(); document.getElementById('formCat1').value = AppState.selectedCategory || ''; updateCat2(); document.getElementById('formCat2').value = '';
  buildTagSelects([], [], [], []);
  document.getElementById('modalOverlay').style.display = 'flex';
  setTimeout(function() { document.getElementById('formName').focus(); }, 100);
}

function openEditModal(id) {
  var s = null; for (var i = 0; i < AppState.suppliers.length; i++) { if (AppState.suppliers[i].id === id) { s = AppState.suppliers[i]; break; } }
  if (!s) return;
  document.getElementById('editId').value = s.id;
  document.getElementById('modalTitle').innerHTML = '✏️ 编辑供应商';
  document.getElementById('formName').value = s.name;
  document.getElementById('formContact').value = s.contact || '';
  document.getElementById('formRating').value = s.rating || 5;
  document.getElementById('formNote').value = s.note || '';
  document.getElementById('formMoq').value = s.moq || '';
  document.getElementById('formUnitPrice').value = s.unit_price || '';
  document.getElementById('formLeadTime').value = s.lead_time || '';
  document.getElementById('formLocation').value = s.location || '';
  document.getElementById('formImageUrl').value = s.image_url || '';
  buildCatSelects(); document.getElementById('formCat1').value = s.cat1 || ''; updateCat2(); document.getElementById('formCat2').value = s.cat2 || '';
  buildTagSelects(s.materials || [], s.crafts || [], s.customization || [], s.service_level || []);
  document.getElementById('modalOverlay').style.display = 'flex';
}

function closeModal() { document.getElementById('modalOverlay').style.display = 'none'; }

function buildCatSelects() { var s = document.getElementById('formCat1'); s.innerHTML = '<option value="">请选择</option>'; var cats = AppState.taxonomy.categories; for (var i = 0; i < cats.length; i++) s.innerHTML += '<option value="' + cats[i].id + '">' + cats[i].icon + ' ' + cats[i].name + '</option>'; }
function updateCat2() { var v = document.getElementById('formCat1').value, s = document.getElementById('formCat2'); s.innerHTML = '<option value="">请选择</option>'; var cats = AppState.taxonomy.categories; for (var i = 0; i < cats.length; i++) { if (cats[i].id === v) { var ch = cats[i].children || []; for (var j = 0; j < ch.length; j++) s.innerHTML += '<option value="' + ch[j].id + '">' + ch[j].icon + ' ' + ch[j].name + '</option>'; break; } } }

function buildTagSelects(sm, sc, scus, ssvc) {
  var mh = '', ch = '', cush = '', svh = '';
  var mats = AppState.taxonomy.materials;
  var cras = AppState.taxonomy.crafts;
  var cusTags = AppState.taxonomy.customizationTags || [];
  var svcTags = AppState.taxonomy.serviceTags || [];
  for (var i = 0; i < mats.length; i++) mh += '<span class="tag-option' + (sm.indexOf(mats[i].name) >= 0 ? ' selected' : '') + '" onclick="this.classList.toggle(\'selected\')" data-value="' + mats[i].name + '">' + mats[i].icon + ' ' + mats[i].name + '</span>';
  for (var j = 0; j < cras.length; j++) ch += '<span class="tag-option' + (sc.indexOf(cras[j].name) >= 0 ? ' selected' : '') + '" onclick="this.classList.toggle(\'selected\')" data-value="' + cras[j].name + '">' + cras[j].icon + ' ' + cras[j].name + '</span>';
  for (var k = 0; k < cusTags.length; k++) cush += '<span class="tag-option' + (scus.indexOf(cusTags[k]) >= 0 ? ' selected' : '') + '" onclick="this.classList.toggle(\'selected\')" data-value="' + cusTags[k] + '">🎨 ' + cusTags[k] + '</span>';
  for (var l = 0; l < svcTags.length; l++) svh += '<span class="tag-option' + (ssvc.indexOf(svcTags[l]) >= 0 ? ' selected' : '') + '" onclick="this.classList.toggle(\'selected\')" data-value="' + svcTags[l] + '">📦 ' + svcTags[l] + '</span>';
  document.getElementById('formMaterials').innerHTML = mh;
  document.getElementById('formCrafts').innerHTML = ch;
  document.getElementById('formCustomization').innerHTML = cush;
  document.getElementById('formServiceLevel').innerHTML = svh;
}

function getSelectedTags(cid) { var els = document.getElementById(cid).querySelectorAll('.tag-option.selected'), r = []; for (var i = 0; i < els.length; i++) r.push(els[i].getAttribute('data-value')); return r; }

async function saveSupplier() {
  var editId = document.getElementById('editId').value;
  var name = document.getElementById('formName').value.trim();
  var cat1 = document.getElementById('formCat1').value;
  var cat2 = document.getElementById('formCat2').value;
  if (!name) { alert('请输入供应商名称'); return; }
  if (!cat1) { alert('请选择一级分类'); return; }

  var data = {
    id: editId || undefined,
    name: name, cat1: cat1, cat2: cat2,
    materials: getSelectedTags('formMaterials'),
    crafts: getSelectedTags('formCrafts'),
    contact: document.getElementById('formContact').value.trim(),
    rating: parseInt(document.getElementById('formRating').value),
    note: document.getElementById('formNote').value.trim(),
    moq: document.getElementById('formMoq').value.trim(),
    unit_price: document.getElementById('formUnitPrice').value.trim(),
    lead_time: document.getElementById('formLeadTime').value.trim(),
    location: document.getElementById('formLocation').value.trim(),
    customization: getSelectedTags('formCustomization'),
    service_level: getSelectedTags('formServiceLevel'),
    image_url: document.getElementById('formImageUrl').value.trim()
  };

  if (AppState.isOnline) {
    var exists = false;
    for (var i = 0; i < AppState.suppliers.length; i++) { if (AppState.suppliers[i].id === editId) { exists = true; break; } }
    var result = exists ? await sbUpdateSupplier(editId, data) : await sbCreateSupplier(data);
    if (result) { if (exists) { for (var j = 0; j < AppState.suppliers.length; j++) { if (AppState.suppliers[j].id === editId) { AppState.suppliers[j] = result; break; } } } else AppState.suppliers.push(result); }
    else { showToast('保存失败 ❌', 'error'); return; }
  } else {
    if (editId) { for (var k = 0; k < AppState.suppliers.length; k++) { if (AppState.suppliers[k].id === editId) { AppState.suppliers[k] = data; break; } } }
    else { data.id = generateId(); AppState.suppliers.push(data); }
  }
  lsSetSuppliers(AppState.suppliers);
  closeModal(); renderAll(); showToast('保存成功 ✅');
}

// ==================== DELETE ====================

function openDeleteConfirm(id) { for (var i = 0; i < AppState.suppliers.length; i++) { if (AppState.suppliers[i].id === id) { AppState.deleteTargetId = id; document.getElementById('confirmName').textContent = AppState.suppliers[i].name; break; } } document.getElementById('confirmOverlay').style.display = 'flex'; }
function closeConfirm() { AppState.deleteTargetId = null; document.getElementById('confirmOverlay').style.display = 'none'; }
async function confirmDelete() { if (!AppState.deleteTargetId) return; if (AppState.isOnline) await sbDeleteSupplier(AppState.deleteTargetId); AppState.suppliers = AppState.suppliers.filter(function(s) { return s.id !== AppState.deleteTargetId; }); lsSetSuppliers(AppState.suppliers); AppState.deleteTargetId = null; document.getElementById('confirmOverlay').style.display = 'none'; renderAll(); showToast('已删除 🗑️'); }

// ==================== GALLERY ====================

async function openGallery(supplierId) {
  var name = ''; for (var i = 0; i < AppState.suppliers.length; i++) { if (AppState.suppliers[i].id === supplierId) { name = AppState.suppliers[i].name; break; } }
  AppState.gallerySupplierId = supplierId;
  document.getElementById('galleryTitle').textContent = '🖼️ ' + name;
  document.getElementById('galleryGrid').innerHTML = '<div class="gallery-loading">加载中...</div>';
  document.getElementById('galleryOverlay').style.display = 'flex';

  // 收集本地图片
  var supplier = AppState.suppliers.find(function(s) { return s.id === supplierId; });
  var localUrls = supplier ? getImageUrls(supplier) : [];
  var localImages = localUrls.map(function(u, i) { return { id: 'local_' + i, public_url: u, image_type: '成品图', is_local: true }; });

  // 云端图片
  var cloudImages = [];
  if (AppState.isOnline) {
    var fetched = await sbFetchImages(supplierId);
    cloudImages = fetched || [];
  }

  AppState.galleryImages = localImages.concat(cloudImages);
  renderGalleryGrid();
}

function renderGalleryGrid() {
  var grid = document.getElementById('galleryGrid'); if (!grid) return;
  if (AppState.galleryImages.length === 0) { grid.innerHTML = '<div class="gallery-empty"><p>📷</p><p>暂无产品图片</p></div>'; return; }
  var html = '';
  for (var i = 0; i < AppState.galleryImages.length; i++) {
    var img = AppState.galleryImages[i];
    html += '<div class="gallery-item"><img src="' + img.public_url + '" onclick="openLightbox(' + i + ')" loading="lazy"><span class="tag tag-img-type tag-img-' + (img.image_type || '成品图') + '">' + escHtml(img.image_type || '成品图') + '</span>' + (img.is_local ? '' : '<button class="gallery-delete-btn" onclick="event.stopPropagation();deleteGalleryImage(\'' + img.id + '\')">✕</button>') + '</div>';
  }
  grid.innerHTML = html;
}

async function handleGalleryUpload(files) {
  if (!AppState.gallerySupplierId || !files || files.length === 0) return;
  var imageType = document.getElementById('galleryImageType').value || '成品图';
  if (!AppState.isOnline) { showToast('离线模式不支持上传，请用本地图片路径', 'error'); return; }
  for (var i = 0; i < files.length; i++) {
    if (!files[i].type.match(/^image\//)) continue;
    if (i === 0) document.getElementById('galleryGrid').innerHTML = '<div class="gallery-loading">上传中...</div>';
    var result = await sbUploadImage(AppState.gallerySupplierId, files[i], imageType);
    if (result) { AppState.galleryImages.push(result); if (!AppState.thumbnails[AppState.gallerySupplierId]) AppState.thumbnails[AppState.gallerySupplierId] = result.public_url; }
  }
  renderGalleryGrid(); refreshView(); showToast('上传完成 ✅');
}

async function deleteGalleryImage(imageId) { if (!confirm('确定删除？')) return; if (await sbDeleteImage(imageId)) { AppState.galleryImages = AppState.galleryImages.filter(function(i) { return i.id !== imageId; }); if (AppState.galleryImages.length > 0) { var first = AppState.galleryImages[0]; if (!first.is_local) AppState.thumbnails[AppState.gallerySupplierId] = first.public_url; } else delete AppState.thumbnails[AppState.gallerySupplierId]; renderGalleryGrid(); refreshView(); } }
function closeGallery() { AppState.gallerySupplierId = null; AppState.galleryImages = []; document.getElementById('galleryOverlay').style.display = 'none'; }

function setupDropZone() {
  var dz = document.getElementById('dropZone'); if (!dz) return;
  dz.addEventListener('dragover', function(e) { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', function() { dz.classList.remove('drag-over'); });
  dz.addEventListener('drop', function(e) { e.preventDefault(); dz.classList.remove('drag-over'); handleGalleryUpload(e.dataTransfer.files); });
  dz.addEventListener('click', function() { document.getElementById('galleryFileInput').click(); });
}

// ==================== LIGHTBOX ====================

function openLightbox(idx) { AppState.lightboxIndex = idx; document.getElementById('lightboxImg').src = AppState.galleryImages[idx].public_url; document.getElementById('lightbox').style.display = 'flex'; updateLightboxNav(); }
function closeLightbox() { document.getElementById('lightbox').style.display = 'none'; }
function lightboxPrev() { if (AppState.lightboxIndex > 0) { AppState.lightboxIndex--; document.getElementById('lightboxImg').src = AppState.galleryImages[AppState.lightboxIndex].public_url; updateLightboxNav(); } }
function lightboxNext() { if (AppState.lightboxIndex < AppState.galleryImages.length - 1) { AppState.lightboxIndex++; document.getElementById('lightboxImg').src = AppState.galleryImages[AppState.lightboxIndex].public_url; updateLightboxNav(); } }
function updateLightboxNav() { var info = document.getElementById('lightboxInfo'); if (info) info.textContent = (AppState.lightboxIndex + 1) + ' / ' + AppState.galleryImages.length; var prev = document.getElementById('lightboxPrev'); if (prev) prev.style.visibility = AppState.lightboxIndex > 0 ? 'visible' : 'hidden'; var next = document.getElementById('lightboxNext'); if (next) next.style.visibility = AppState.lightboxIndex < AppState.galleryImages.length - 1 ? 'visible' : 'hidden'; }

// ==================== IMPORT / EXPORT ====================

function exportData() {
  var blob = new Blob([JSON.stringify({ suppliers: AppState.suppliers, taxonomy: AppState.taxonomy }, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = '文创品供应商_' + new Date().toISOString().slice(0,10) + '.json'; a.click(); URL.revokeObjectURL(url); showToast('导出成功（含分类体系）📥');
}

function importData(event) {
  var file = event.target.files[0]; if (!file) return; var reader = new FileReader();
  reader.onload = function(e) {
    try { var data = JSON.parse(e.target.result);
      if (data.suppliers && Array.isArray(data.suppliers)) { if (confirm('导入 ' + data.suppliers.length + ' 条。确定覆盖？')) { AppState.suppliers = data.suppliers; if (data.taxonomy) { AppState.taxonomy = data.taxonomy; saveTaxonomy(AppState.taxonomy); } lsSetSuppliers(AppState.suppliers); renderAll(); showToast('导入成功 ✅'); } }
      else if (Array.isArray(data)) { if (confirm('旧格式。导入 ' + data.length + ' 条？')) { AppState.suppliers = data; lsSetSuppliers(data); renderAll(); showToast('导入成功 ✅'); } }
      else throw new Error('格式错误');
    } catch(err) { alert('导入失败：文件格式不正确'); }
  };
  reader.readAsText(file); event.target.value = '';
}

function resetAllData() { if (!confirm('确定清空？建议先导出备份。')) return; AppState.suppliers = []; lsSetSuppliers([]); renderAll(); showToast('本地数据已清空'); }

// ==================== LOCAL IMAGE HELPERS ====================

function getSupplierImageSrc(supplier) { var u = getFirstImageUrl(supplier); if (u) return u; return AppState.thumbnails[supplier.id] || null; }

function pickLocalImage() {
  var input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
  input.onchange = function() {
    var names = []; for (var i = 0; i < input.files.length; i++) names.push('产品图片/' + input.files[i].name);
    var existing = document.getElementById('formImageUrl').value.trim();
    var all = existing ? existing.split(',').map(function(s) { return s.trim(); }).concat(names) : names;
    document.getElementById('formImageUrl').value = all.join(', ');
    showToast('请将图片文件复制到 产品图片/ 文件夹 📁');
  };
  input.click();
}

// ==================== RENDER ALL ====================

function renderAll() { renderTree(); renderFilterChips(); refreshView(); updateFooter(); }

// ==================== KEYBOARD ====================

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') { closeModal(); closeConfirm(); closeGallery(); closeLightbox(); closeSettingsModal(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); document.getElementById('searchInput').focus(); }
  if (e.key === 'ArrowLeft' && document.getElementById('lightbox').style.display === 'flex') lightboxPrev();
  if (e.key === 'ArrowRight' && document.getElementById('lightbox').style.display === 'flex') lightboxNext();
});

// ==================== INIT ====================

document.addEventListener('DOMContentLoaded', function() { loadAllData(); });
