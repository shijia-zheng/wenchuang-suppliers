# 文创品供应商管理系统

一个用于管理文创产品供应商的可视化工具，支持多维度分类、材质/工艺标签筛选、产品图片画廊，数据可云端同步。

## 🚀 快速开始

### 方式一：纯本地模式（无需配置）

直接用浏览器打开 `index.html`，所有数据存储在浏览器 localStorage 中。

> ⚠️ 离线模式**不支持图片上传**，仅支持基本的增删改查。

### 方式二：Supabase 云端模式（推荐）

#### 1. 创建 Supabase 项目

1. 前往 [app.supabase.com](https://app.supabase.com) 注册/登录
2. 点击 **New Project**，填写项目名称，设置数据库密码
3. 等待项目初始化完成（约 1-2 分钟）

#### 2. 运行数据库 Schema

1. 进入项目 Dashboard → **SQL Editor**
2. 点击 **New Query**
3. 将 `supabase/schema.sql` 的文件内容**完整粘贴**
4. 点击 **Run** 执行

#### 3. 配置 Storage Bucket

1. 进入 **Storage** 页面
2. 点击 **New Bucket**
3. Name 填写：`product-images`
4. **必须勾选 "Public bucket"**（否则图片无法显示）
5. 在 bucket 的 **Policies** 页面添加：
   - `SELECT` 策略：允许所有人（`true`）
   - `INSERT` 策略：允许所有人（`true`）
   - `DELETE` 策略：允许所有人（`true`）

> ⚠️ 以上 RLS 策略适合内部工具使用。如需公开部署，请加强认证策略。

#### 4. 配置项目连接

1. 在 Supabase Dashboard → **Settings** → **API**
2. 复制 **Project URL** 和 **anon public key**
3. 打开 `js/config.js`，填入：

```js
var SUPABASE_URL = 'https://xxxxx.supabase.co';   // 你的 Project URL
var SUPABASE_ANON_KEY = 'eyJhbGci...';              // 你的 anon key
```

4. 保存文件，刷新浏览器即可

## 📁 项目结构

```
文创品选品/
├── index.html              # 主页面
├── css/
│   └── style.css           # 全局样式
├── js/
│   ├── config.js           # Supabase 配置 + 常量定义
│   ├── utils.js            # 工具函数
│   ├── supabase.js         # Supabase 客户端 + CRUD API
│   └── app.js              # 主应用逻辑 + 图片管理
├── supabase/
│   └── schema.sql          # 数据库建表 SQL
└── README.md               # 本文件
```

## 📊 功能说明

### 供应商分类

| 一级分类 | 二级分类 |
|---------|---------|
| 🌐 网络平台供应商 | 综合电商平台、垂直文创平台、社交电商平台 |
| 🏛️ 展会线下渠道供应商 | 国内展会、国际展会、批发市场 |
| 🤝 品牌合作供应商 | IP授权合作、设计师联名、企业定制 |

### 材质标签

纸质、木质、亚克力、金属、布艺、陶瓷、玻璃、硅胶、皮革

### 工艺标签

烫金、电镀、蚀刻、UV印刷、丝印、激光雕刻、压印、刺绣、3D打印

### 图片管理（需 Supabase）

- 每个供应商支持上传多张产品图片
- 图片类型标签：成品图 / 效果图 / 包装图 / 其他
- 支持拖拽上传 + 点击上传
- 表格中显示首张缩略图
- 画廊网格展示所有图片
- 灯箱查看大图，左右箭头切换

## 🔧 数据管理

- **导出 JSON**：备份所有供应商数据（不含图片文件）
- **导入 JSON**：支持覆盖或合并模式
- **降级机制**：Supabase 不可用时自动切换到 localStorage
- **数据同步**：配置 Supabase 后多设备数据互通

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+K` | 聚焦搜索框 |
| `Esc` | 关闭弹窗/画廊/灯箱 |
| `←` `→` | 灯箱切换图片 |

## ⚠️ 注意事项

1. **首次使用**：如果没有配置 Supabase，系统会自动加载示例数据并存入 localStorage
2. **图片权限**：确保 Storage Bucket 设为 Public，否则图片无法加载
3. **RLS 策略**：当前使用宽松策略（允许所有人），仅适合内部使用
4. **浏览器兼容**：推荐使用 Chrome / Edge / Firefox 最新版本
