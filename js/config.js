/**
 * 文创品供应商管理系统 — 配置文件
 * Supabase 信息填入 Settings → API 的 Project URL 和 anon public key
 */

var SUPABASE_URL = 'https://aztrhqmeetwmqjjvyrzs.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6dHJocW1lZXR3bXFqanZ5cnpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MDM4MTYsImV4cCI6MjA5ODM3OTgxNn0.HG5nSqfpejFJGtAtvTZU2H5If7ou0mG8LnaWkMk0_so';

function isSupabaseEnabled() { return !!(SUPABASE_URL && SUPABASE_ANON_KEY); }

var DEFAULT_TAXONOMY = {
  categories: [
    { id: 'net', name: '网络平台供应商', icon: '🌐', children: [
      { id: 'net-general', name: '综合电商平台', icon: '🛒' },
      { id: 'net-vertical', name: '垂直文创平台', icon: '🎯' },
      { id: 'net-social', name: '社交电商平台', icon: '📱' }
    ]},
    { id: 'expo', name: '展会线下渠道供应商', icon: '🏛️', children: [
      { id: 'expo-domestic', name: '国内展会', icon: '🇨🇳' },
      { id: 'expo-intl', name: '国际展会', icon: '🌍' },
      { id: 'expo-market', name: '批发市场', icon: '🏬' }
    ]},
    { id: 'brand', name: '品牌合作供应商', icon: '🤝', children: [
      { id: 'brand-ip', name: 'IP授权合作', icon: '📖' },
      { id: 'brand-designer', name: '设计师联名', icon: '✒️' },
      { id: 'brand-custom', name: '企业定制', icon: '🏢' }
    ]}
  ],
  materials: [
    { name: '纸质',   icon: '📄' },
    { name: '木质',   icon: '🪵' },
    { name: '亚克力', icon: '🔮' },
    { name: '金属',   icon: '🔩' },
    { name: '布艺',   icon: '🧵' },
    { name: '陶瓷',   icon: '🏺' },
    { name: '玻璃',   icon: '🪟' },
    { name: '硅胶',   icon: '🧴' },
    { name: '皮革',   icon: '👜' }
  ],
  crafts: [
    { name: '烫金',     icon: '✨' },
    { name: '电镀',     icon: '⚡' },
    { name: '蚀刻',     icon: '🔪' },
    { name: 'UV印刷',   icon: '🖨️' },
    { name: '丝印',     icon: '🖌️' },
    { name: '激光雕刻', icon: '💥' },
    { name: '压印',     icon: '🔨' },
    { name: '刺绣',     icon: '🪡' },
    { name: '3D打印',   icon: '🧬' }
  ],
  customizationTags: ['Logo定制', '来图定制', '包装定制', '异形定制', '联名开发'],
  serviceTags: ['精美包装', '物流配送', '售后保障', '打样服务', '加急出货']
};

var SAMPLE_DATA = [
  { id: 's1', name: '艺创文化用品有限公司', cat1: 'net', cat2: 'net-general', materials: ['纸质','木质'], crafts: ['烫金','UV印刷'], contact: '张经理 138****6789', rating: 5, note: '淘宝金牌卖家', moq: '100件起', unit_price: '¥3-15', lead_time: '7-15天', location: '杭州', customization: ['来图定制','包装定制'], service_level: ['精美包装','物流配送'], image_url: '' },
  { id: 's2', name: '云木文创供应链', cat1: 'net', cat2: 'net-vertical', materials: ['木质','亚克力'], crafts: ['激光雕刻','蚀刻'], contact: '李女士 159****2345', rating: 4, note: '专注木质文创', moq: '50件起', unit_price: '¥5-20', lead_time: '7-10天', location: '广州', customization: ['来图定制','异形定制'], service_level: ['打样服务'], image_url: '' },
  { id: 's3', name: '深圳臻品工艺厂', cat1: 'expo', cat2: 'expo-domestic', materials: ['金属','亚克力'], crafts: ['电镀','蚀刻','UV印刷'], contact: '王总 186****8901', rating: 5, note: '深圳礼品展常驻展商', moq: '200件起', unit_price: '¥8-50', lead_time: '10-20天', location: '深圳', customization: ['Logo定制','来图定制','异形定制'], service_level: ['精美包装','物流配送','售后保障'], image_url: '' },
  { id: 's4', name: '故宫文创合作商-华彩', cat1: 'brand', cat2: 'brand-ip', materials: ['纸质','布艺','金属'], crafts: ['烫金','压印','刺绣'], contact: '赵女士 177****3456', rating: 5, note: '故宫IP授权，品质要求高', moq: '500件起', unit_price: '¥15-80', lead_time: '20-30天', location: '北京', customization: ['联名开发','包装定制'], service_level: ['精美包装','售后保障','打样服务'], image_url: '' },
  { id: 's5', name: '义乌小商品城批发商', cat1: 'expo', cat2: 'expo-market', materials: ['纸质','亚克力','布艺','硅胶'], crafts: ['丝印','UV印刷'], contact: '陈先生 133****7890', rating: 3, note: '价格低品类全，需验货', moq: '1000件起', unit_price: '¥0.5-5', lead_time: '3-7天', location: '义乌', customization: ['Logo定制'], service_level: ['物流配送'], image_url: '' },
  { id: 's6', name: '小红书爆款供应商', cat1: 'net', cat2: 'net-social', materials: ['亚克力','硅胶','纸质'], crafts: ['UV印刷','烫金'], contact: '刘女士 152****0123', rating: 4, note: '跟热点快，适合快返单', moq: '100件起', unit_price: '¥3-12', lead_time: '5-10天', location: '广州', customization: ['来图定制','包装定制'], service_level: ['加急出货'], image_url: '' },
  { id: 's7', name: '东京文创展精选', cat1: 'expo', cat2: 'expo-intl', materials: ['纸质','布艺','木质'], crafts: ['烫金','压印','刺绣'], contact: '佐藤 080****4567', rating: 5, note: '日式设计风格', moq: '300件起', unit_price: '¥10-60', lead_time: '15-30天', location: '东京', customization: ['联名开发','异形定制'], service_level: ['精美包装','售后保障'], image_url: '' },
  { id: 's8', name: '独立设计师联名工作室', cat1: 'brand', cat2: 'brand-designer', materials: ['纸质','木质','玻璃'], crafts: ['蚀刻','激光雕刻','丝印'], contact: '林设计师 189****5678', rating: 4, note: '原创设计能力强', moq: '50件起', unit_price: '¥5-30', lead_time: '7-14天', location: '上海', customization: ['联名开发','来图定制','异形定制'], service_level: ['打样服务','精美包装'], image_url: '' },
  { id: 's9', name: '企业礼品定制专家', cat1: 'brand', cat2: 'brand-custom', materials: ['金属','亚克力','皮革'], crafts: ['电镀','激光雕刻','压印'], contact: '周先生 136****9012', rating: 4, note: '可加LOGO', moq: '200件起', unit_price: '¥8-40', lead_time: '10-15天', location: '深圳', customization: ['Logo定制','包装定制'], service_level: ['精美包装','物流配送','加急出货'], image_url: '' },
  { id: 's10', name: '拼多多文创爆品工厂', cat1: 'net', cat2: 'net-general', materials: ['纸质','硅胶','布艺'], crafts: ['丝印'], contact: '黄厂 158****3456', rating: 3, note: '大批量生产能力强', moq: '500件起', unit_price: '¥0.3-3', lead_time: '5-10天', location: '义乌', customization: ['Logo定制'], service_level: ['物流配送'], image_url: '' }
];
