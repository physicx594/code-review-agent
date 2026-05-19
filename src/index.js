require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { getPRDiff, postReviewComment } = require('./github');
const { reviewPRDiff } = require('./reviewer');

const app = express();

// 必須在 json() middleware 之前掛載，才能取得原始 body 做 HMAC 驗證
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

/**
 * 驗證 GitHub Webhook 的 HMAC-SHA256 簽名
 * 防止非 GitHub 來源的惡意請求
 */
function verifySignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET);
  hmac.update(req.rawBody);
  const expected = `sha256=${hmac.digest('hex')}`;

  // timingSafeEqual 防止 timing attack
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expected, 'utf8')
    );
  } catch {
    return false;
  }
}

app.post('/webhook', async (req, res) => {
  if (!verifySignature(req)) {
    console.warn('[webhook] 簽名驗證失敗');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.headers['x-github-event'];
  const { action, pull_request: pr, repository } = req.body;

  if (event !== 'pull_request' || !['opened', 'synchronize'].includes(action)) {
    return res.status(200).json({ message: 'Event ignored' });
  }

  const owner = repository.owner.login;
  const repo = repository.name;
  const pullNumber = pr.number;

  console.log(`[webhook] PR #${pullNumber} ${action} — ${owner}/${repo}`);

  // 立即回應 200，避免 GitHub 因超時重送 webhook
  res.status(200).json({ message: 'Review started' });

  try {
    const diff = await getPRDiff(owner, repo, pullNumber);
    const review = await reviewPRDiff(diff);
    await postReviewComment(owner, repo, pullNumber, review);
    console.log(`[webhook] Review 已發布至 PR #${pullNumber}`);
  } catch (err) {
    console.error(`[webhook] Review 失敗 — PR #${pullNumber}:`, err.message);
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3210;
app.listen(PORT, () => {
  console.log(`Code Review Agent 已啟動，監聽 port ${PORT}`);
});
