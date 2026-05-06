# Code Review Agent

一個針對 Vue 3 專案的 AI Code Review Bot，串接 GitHub Webhook 與 Anthropic Claude API，自動在 PR 開啟或更新時發佈詳細的程式碼審查意見。

## 功能

- 自動接收 GitHub PR `opened` / `synchronize` 事件
- HMAC-SHA256 驗證 Webhook 簽名，確保請求來源合法
- 抓取 PR diff 後交由 Claude 分析
- 針對 Vue 3 專案檢查：
  - Composition API 最佳實踐
  - 命名一致性
  - 效能問題（`v-for` key、不必要的 `watch`）
  - 安全性（`v-html` XSS、API key 外洩）
- 將 Review 結果以 Markdown 格式發布至 PR comment
- 系統 prompt 使用 **Prompt Caching**，降低重複呼叫的 token 成本

## 安裝

```bash
cd code-review-agent
pnpm install
cp .env.example .env
# 填入 .env 中的環境變數
```

## 環境變數

| 變數名稱 | 說明 |
|---|---|
| `GITHUB_TOKEN` | GitHub Personal Access Token（需 `repo` 權限） |
| `GITHUB_WEBHOOK_SECRET` | Webhook secret，與 GitHub 設定一致 |
| `ANTHROPIC_API_KEY` | Anthropic API Key |
| `PORT` | Server 監聽 port（預設 3000） |

## 啟動 Server

```bash
pnpm start
```

## 本地測試（不需 Webhook）

```bash
pnpm test
```

`test.js` 使用預設的 fake diff 直接呼叫 `reviewer.js`，可在不架設 webhook server 的情況下驗證 Claude 分析是否正常運作。

## 設定 GitHub Webhook

1. 前往 GitHub repo > **Settings** > **Webhooks** > **Add webhook**
2. **Payload URL**：填入你的 server URL，例如 `https://your-domain.com/webhook`
3. **Content type**：選 `application/json`
4. **Secret**：填入與 `GITHUB_WEBHOOK_SECRET` 相同的值
5. **Events**：選 **Let me select individual events** > 勾選 **Pull requests**

若要在本地開發，可使用 [ngrok](https://ngrok.com/) 或 [smee.io](https://smee.io/) 將本地 port 暴露為公開 URL：

```bash
npx smee-client --url https://smee.io/YOUR_CHANNEL --target http://localhost:3000/webhook
```

## 專案結構

```
code-review-agent/
├── src/
│   ├── index.js      # Express server，處理 GitHub Webhook
│   ├── reviewer.js   # 呼叫 Claude API 分析 diff
│   ├── github.js     # 抓 PR diff、發 PR comment
│   └── prompt.js     # Vue 3 專屬 review prompt
├── test.js           # 本地測試腳本
├── .env.example
├── package.json
└── README.md
```
