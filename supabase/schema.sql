-- ============================================================
-- 文创品供应商管理系统 — Supabase 数据库 Schema
-- ============================================================
-- 使用方法：
--   1. 登录 Supabase Dashboard → SQL Editor
--   2. 粘贴本文件全部内容 → 点击 Run
--   3. 然后去 Storage 页面创建 bucket（见文件末尾说明）
-- ============================================================

-- ---------- 供应商表 ----------
CREATE TABLE IF NOT EXISTS suppliers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  cat1        TEXT NOT NULL DEFAULT '',       -- 一级分类ID (net/expo/brand)
  cat2        TEXT DEFAULT '',                -- 二级分类ID
  materials   JSONB DEFAULT '[]'::jsonb,      -- ["纸质","木质",...]
  crafts      JSONB DEFAULT '[]'::jsonb,      -- ["烫金","电镀",...]
  contact     TEXT DEFAULT '',
  rating      INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  note        TEXT DEFAULT '',
  image_url   TEXT DEFAULT '',                -- 本地图片路径或网络链接
  moq         TEXT DEFAULT '',                -- 起订量
  unit_price  TEXT DEFAULT '',                -- 单价
  lead_time   TEXT DEFAULT '',                -- 工期
  location    TEXT DEFAULT '',                -- 所在地
  customization JSONB DEFAULT '[]'::jsonb,    -- 定制能力
  service_level JSONB DEFAULT '[]'::jsonb,    -- 服务水平
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON suppliers;
CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------- 供应商图片表 ----------
CREATE TABLE IF NOT EXISTS supplier_images (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id  UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,                 -- Storage 中的路径
  image_type   TEXT DEFAULT '成品图',          -- 成品图/效果图/包装图/其他
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 索引：按供应商查询图片更快
CREATE INDEX IF NOT EXISTS idx_supplier_images_supplier_id ON supplier_images(supplier_id);

-- ---------- RLS 策略（允许匿名访问 — 适合内部工具）----------
-- 注意：如果是公开部署，请改为按用户认证的策略
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_images ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取
DROP POLICY IF EXISTS "Allow all SELECT" ON suppliers;
CREATE POLICY "Allow all SELECT" ON suppliers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all INSERT" ON suppliers;
CREATE POLICY "Allow all INSERT" ON suppliers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all UPDATE" ON suppliers;
CREATE POLICY "Allow all UPDATE" ON suppliers FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow all DELETE" ON suppliers;
CREATE POLICY "Allow all DELETE" ON suppliers FOR DELETE USING (true);

-- supplier_images 同理
DROP POLICY IF EXISTS "Allow all SELECT" ON supplier_images;
CREATE POLICY "Allow all SELECT" ON supplier_images FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all INSERT" ON supplier_images;
CREATE POLICY "Allow all INSERT" ON supplier_images FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all UPDATE" ON supplier_images;
CREATE POLICY "Allow all UPDATE" ON supplier_images FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow all DELETE" ON supplier_images;
CREATE POLICY "Allow all DELETE" ON supplier_images FOR DELETE USING (true);

-- ---------- 表级授权（新版 Supabase 新建表不会自动授权给 anon）----------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_images TO anon, authenticated;

-- ---------- 插入示例数据 ----------
INSERT INTO suppliers (id, name, cat1, cat2, materials, crafts, contact, rating, note) VALUES
  ('a0000000-0000-0000-0000-000000000001', '艺创文化用品有限公司', 'net', 'net-general', '["纸质","木质"]', '["烫金","UV印刷"]', '张经理 138****6789', 5, '淘宝金牌卖家，起订量低，适合小批量定制'),
  ('a0000000-0000-0000-0000-000000000002', '云木文创供应链', 'net', 'net-vertical', '["木质","亚克力"]', '["激光雕刻","蚀刻"]', '李女士 159****2345', 4, '专注木质文创，可做异形雕刻'),
  ('a0000000-0000-0000-0000-000000000003', '深圳臻品工艺厂', 'expo', 'expo-domestic', '["金属","亚克力"]', '["电镀","蚀刻","UV印刷"]', '王总 186****8901', 5, '深圳礼品展常驻展商，金属工艺一流'),
  ('a0000000-0000-0000-0000-000000000004', '故宫文创合作商-华彩', 'brand', 'brand-ip', '["纸质","布艺","金属"]', '["烫金","压印","刺绣"]', '赵女士 177****3456', 5, '故宫IP授权，品质要求高，交期稳定'),
  ('a0000000-0000-0000-0000-000000000005', '义乌小商品城批发商', 'expo', 'expo-market', '["纸质","亚克力","布艺","硅胶"]', '["丝印","UV印刷"]', '陈先生 133****7890', 3, '价格低品类全，但品质参差需验货'),
  ('a0000000-0000-0000-0000-000000000006', '小红书爆款供应商', 'net', 'net-social', '["亚克力","硅胶","纸质"]', '["UV印刷","烫金"]', '刘女士 152****0123', 4, '跟热点快，适合快返单'),
  ('a0000000-0000-0000-0000-000000000007', '东京文创展精选', 'expo', 'expo-intl', '["纸质","布艺","木质"]', '["烫金","压印","刺绣"]', '佐藤 080****4567', 5, '日式设计风格，起订量较高'),
  ('a0000000-0000-0000-0000-000000000008', '独立设计师联名工作室', 'brand', 'brand-designer', '["纸质","木质","玻璃"]', '["蚀刻","激光雕刻","丝印"]', '林设计师 189****5678', 4, '原创设计能力强，小批量可做'),
  ('a0000000-0000-0000-0000-000000000009', '企业礼品定制专家', 'brand', 'brand-custom', '["金属","亚克力","皮革"]', '["电镀","激光雕刻","压印"]', '周先生 136****9012', 4, '企业年会礼品首选，可加LOGO'),
  ('a0000000-0000-0000-0000-000000000010', '拼多多文创爆品工厂', 'net', 'net-general', '["纸质","硅胶","布艺"]', '["丝印"]', '黄厂 158****3456', 3, '价格有竞争力，大批量生产能力强')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Storage Bucket（与 wenchuang-manager 共用 product-images 桶）
-- 公开桶，匿名可读写
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    TRUE,
    10485760,  -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "Public read product-images" ON storage.objects
    FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY IF NOT EXISTS "Anon insert product-images" ON storage.objects
    FOR INSERT TO anon WITH CHECK (bucket_id = 'product-images');
CREATE POLICY IF NOT EXISTS "Anon update product-images" ON storage.objects
    FOR UPDATE TO anon USING (bucket_id = 'product-images');
CREATE POLICY IF NOT EXISTS "Anon delete product-images" ON storage.objects
    FOR DELETE TO anon USING (bucket_id = 'product-images');
