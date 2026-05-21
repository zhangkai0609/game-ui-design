# Vercel 部署指南

## 🚀 快速部署（一键式）

### 方法一：使用 Deploy 按钮（最快）

点击下面的链接一键部署到 Vercel：

```
https://vercel.com/new/clone?repository-url=https://github.com/zhangkai0609/game-ui-design
```

### 方法二：手动部署步骤

1. **访问 Vercel**
   - 打开 https://vercel.com
   - 用 GitHub 账号登录（选择 Sign in with GitHub）

2. **导入项目**
   - 点击 "Add New..." 按钮
   - 选择 "Project"
   - 在搜索框中找到 `game-ui-design` 仓库
   - 点击 "Import"

3. **配置项目**
   - Framework Preset：选择 "Other"
   - Build Command：留空（已有 vercel.json 配置）
   - Output Directory：留空
   - Root Directory：./
   - 点击 "Deploy"

4. **等待部署完成**
   - 大约 30-60 秒后完成
   - Vercel 会为你生成一个网址

## 📱 部署完成后

部署完成后，你会获得：

- **游戏链接**: `https://game-ui-design.vercel.app`
- **移动预览链接**: `https://game-ui-design.vercel.app/mobile-preview.html`
- **二维码**：用手机扫描可直接访问

## 🔄 自动更新

配置完成后，每次你推送代码到 GitHub，Vercel 会自动重新部署：
- 推送到 main 分支 → 自动更新到生产环境

## 🎮 试玩链接格式

部署后的试玩链接示例：
- **PC 版**: https://game-ui-design.vercel.app
- **手机版**: https://game-ui-design.vercel.app/mobile-preview.html

## 📊 监控部署

在 Vercel 仪表板中可以：
- 查看实时日志
- 管理环境变量
- 配置自定义域名
- 监控性能指标

---

**注意**：确保你已经将代码推送到 GitHub main 分支！
