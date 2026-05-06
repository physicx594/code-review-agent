require('dotenv').config();
const axios = require('axios');

const githubClient = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28',
  },
});

/**
 * 取得 PR 的 unified diff 內容
 */
async function getPRDiff(owner, repo, pullNumber) {
  const response = await githubClient.get(
    `/repos/${owner}/${repo}/pulls/${pullNumber}`,
    {
      headers: { Accept: 'application/vnd.github.v3.diff' },
      // axios 預設將 response 當成 JSON 解析，diff 是純文字需特別指定
      responseType: 'text',
    }
  );
  return response.data;
}

/**
 * 在 PR 的 conversation 貼上 review 結果 comment
 */
async function postReviewComment(owner, repo, pullNumber, body) {
  await githubClient.post(
    `/repos/${owner}/${repo}/issues/${pullNumber}/comments`,
    { body }
  );
}

module.exports = { getPRDiff, postReviewComment };
