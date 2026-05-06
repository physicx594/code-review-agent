require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { buildReviewPrompt } = require('./prompt');

const client = new Anthropic();

// Claude API 單次請求的 token 上限約 200k，保留安全空間
const MAX_DIFF_CHARS = 100_000;

async function reviewPRDiff(diff) {
  const truncatedDiff =
    diff.length > MAX_DIFF_CHARS
      ? diff.slice(0, MAX_DIFF_CHARS) + '\n\n[...diff 因長度限制而截斷...]'
      : diff;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: buildReviewPrompt(),
        // 系統 prompt 每次呼叫都相同，使用 prompt caching 降低成本與延遲
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `請 review 以下 PR diff：\n\n\`\`\`diff\n${truncatedDiff}\n\`\`\``,
      },
    ],
  });

  const usage = response.usage;
  console.log(
    `[reviewer] tokens — input: ${usage.input_tokens}, output: ${usage.output_tokens}` +
      (usage.cache_read_input_tokens
        ? `, cache_read: ${usage.cache_read_input_tokens}`
        : '')
  );

  return response.content[0].text;
}

module.exports = { reviewPRDiff };
