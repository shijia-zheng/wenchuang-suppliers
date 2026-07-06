/**
 * 文创品供应商管理系统 — Supabase 客户端模块
 *
 * 依赖：config.js → utils.js → supabase.js（在 index.html 中按此顺序加载）
 *       @supabase/supabase-js CDN（在 index.html 中引入）
 */

var sbClient = null;
var BUCKET_NAME = 'product-images';

// ==================== 初始化 ====================
function initSupabase() {
  if (!isSupabaseEnabled()) return false;
  try {
    sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return true;
  } catch (e) {
    console.error('[Supabase] 初始化失败:', e.message);
    return false;
  }
}

// ==================== 供应商 CRUD ====================

async function sbFetchSuppliers() {
  if (!sbClient) return null;
  try {
    var result = await sbClient.from('suppliers').select('*').order('created_at', { ascending: false });
    if (result.error) throw result.error;
    return result.data || [];
  } catch (e) { console.error('[Supabase] 查询供应商失败:', e.message); return null; }
}

async function sbCreateSupplier(data) {
  if (!sbClient) return null;
  try {
    var row = { name: data.name, cat1: data.cat1 || '', cat2: data.cat2 || '', materials: data.materials || [], crafts: data.crafts || [], contact: data.contact || '', rating: data.rating || 5, note: data.note || '', image_url: data.image_url || '', moq: data.moq || '', unit_price: data.unit_price || '', lead_time: data.lead_time || '', location: data.location || '', customization: data.customization || [], service_level: data.service_level || [] };
    var result = await sbClient.from('suppliers').insert(row).select().single();
    if (result.error) throw result.error;
    return result.data;
  } catch (e) { console.error('[Supabase] 创建供应商失败:', e.message); return null; }
}

async function sbUpdateSupplier(id, data) {
  if (!sbClient) return null;
  try {
    var row = { name: data.name, cat1: data.cat1 || '', cat2: data.cat2 || '', materials: data.materials || [], crafts: data.crafts || [], contact: data.contact || '', rating: data.rating || 5, note: data.note || '', image_url: data.image_url || '', moq: data.moq || '', unit_price: data.unit_price || '', lead_time: data.lead_time || '', location: data.location || '', customization: data.customization || [], service_level: data.service_level || [] };
    var result = await sbClient.from('suppliers').update(row).eq('id', id).select().single();
    if (result.error) throw result.error;
    return result.data;
  } catch (e) { console.error('[Supabase] 更新供应商失败:', e.message); return null; }
}

async function sbDeleteSupplier(id) {
  if (!sbClient) return null;
  try {
    await sbDeleteSupplierStorageFiles(id);
    var result = await sbClient.from('suppliers').delete().eq('id', id);
    if (result.error) throw result.error;
    return true;
  } catch (e) { console.error('[Supabase] 删除供应商失败:', e.message); return null; }
}

// ==================== 图片 ====================

async function sbFetchImages(supplierId) {
  if (!sbClient) return null;
  try {
    var result = await sbClient.from('supplier_images').select('*').eq('supplier_id', supplierId).order('sort_order', { ascending: true });
    if (result.error) throw result.error;
    var images = result.data || [];
    for (var i = 0; i < images.length; i++) {
      images[i].public_url = sbClient.storage.from(BUCKET_NAME).getPublicUrl(images[i].storage_path).data.publicUrl;
    }
    return images;
  } catch (e) { console.error('[Supabase] 查询图片失败:', e.message); return null; }
}

async function sbUploadImage(supplierId, file, imageType) {
  if (!sbClient) return null;
  try {
    var ext = file.name.split('.').pop() || 'jpg';
    var filename = Date.now() + '_' + Math.random().toString(36).slice(2, 6) + '.' + ext;
    var storagePath = supplierId + '/' + filename;
    var uploadResult = await sbClient.storage.from(BUCKET_NAME).upload(storagePath, file, { upsert: false });
    if (uploadResult.error) throw uploadResult.error;
    var dbResult = await sbClient.from('supplier_images').insert({ supplier_id: supplierId, storage_path: storagePath, image_type: imageType || '成品图', sort_order: 0 }).select().single();
    if (dbResult.error) throw dbResult.error;
    dbResult.data.public_url = sbClient.storage.from(BUCKET_NAME).getPublicUrl(storagePath).data.publicUrl;
    return dbResult.data;
  } catch (e) { console.error('[Supabase] 上传图片失败:', e.message); return null; }
}

async function sbDeleteImage(imageId) {
  if (!sbClient) return null;
  try {
    var getResult = await sbClient.from('supplier_images').select('storage_path').eq('id', imageId).single();
    if (getResult.error) throw getResult.error;
    await sbClient.storage.from(BUCKET_NAME).remove([getResult.data.storage_path]);
    var delResult = await sbClient.from('supplier_images').delete().eq('id', imageId);
    if (delResult.error) throw delResult.error;
    return true;
  } catch (e) { console.error('[Supabase] 删除图片失败:', e.message); return null; }
}

async function sbDeleteSupplierStorageFiles(supplierId) {
  if (!sbClient) return;
  try {
    var listResult = await sbClient.storage.from(BUCKET_NAME).list(supplierId);
    if (listResult.error) return;
    var files = listResult.data || [];
    if (files.length > 0) {
      var paths = [];
      for (var i = 0; i < files.length; i++) paths.push(supplierId + '/' + files[i].name);
      await sbClient.storage.from(BUCKET_NAME).remove(paths);
    }
  } catch (e) { /* ignore */ }
}

async function sbFetchAllThumbnails() {
  if (!sbClient) return null;
  try {
    var allImages = await sbClient.from('supplier_images').select('supplier_id,storage_path').order('sort_order');
    if (allImages.error) throw allImages.error;
    var thumbMap = {};
    for (var i = 0; i < allImages.data.length; i++) {
      var img = allImages.data[i];
      if (!thumbMap[img.supplier_id]) {
        thumbMap[img.supplier_id] = sbClient.storage.from(BUCKET_NAME).getPublicUrl(img.storage_path).data.publicUrl;
      }
    }
    return thumbMap;
  } catch (e) { console.error('[Supabase] 获取缩略图失败:', e.message); return null; }
}
