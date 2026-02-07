# AI-Powered PDCA Training Coach (DeepSeek版)

这是一个 PDCA 训练与作业批改工具：学员填写 PDCA 表单后，系统会给出“讲师点评（Teacher Review）”。

## 为什么需要改
原版本直接在前端调用 Google AI Studio / Gemini：
- API Key 会暴露在浏览器（不安全）
- Vercel 上 env 注入方式容易失效，导致页面空白或构建失败
- 可能遇到 CORS / 域名限制

现在改为：**前端 → /api/coach（Vercel Serverless Function）→ DeepSeek API**  
API Key 只保存在 Vercel 的环境变量中。

## 部署到 Vercel
1. 把项目推到 GitHub，然后在 Vercel 导入
2. 在 Vercel Project Settings → Environment Variables 添加：
   - `DEEPSEEK_API_KEY` = 你的 DeepSeek API Key
3. Build Command：`npm run build`
4. Output Directory：`dist`

## 本地开发（可选）
- 仅跑前端：`npm install` → `npm run dev`  
  （注意：`/api/coach` 只在 Vercel 或 `vercel dev` 下可用）
- 同时跑 Function：安装 Vercel CLI 后用 `vercel dev`

## 关键文件
- `api/coach.ts`：服务端代理，真正调用 DeepSeek
- `services/geminiService.ts`：前端改为请求 `/api/coach`
