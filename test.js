/**
 * 本地測試腳本：直接呼叫 reviewer.js，不需要架 webhook server 或真實的 GitHub PR。
 * 使用方式：node test.js
 */
require('dotenv').config();
const { reviewPRDiff } = require('./src/reviewer');

// 模擬一個包含多種 Vue 3 問題的 fake diff
const FAKE_DIFF = `
diff --git a/src/components/UserList.vue b/src/components/UserList.vue
new file mode 100644
index 0000000..abc1234
--- /dev/null
+++ b/src/components/UserList.vue
@@ -0,0 +1,85 @@
+<template>
+  <div>
+    <!-- 問題1：v-for 使用 index 作為 key -->
+    <div v-for="(user, index) in users" :key="index" class="user-item">
+      <!-- 問題2：使用 v-html 渲染不可信的使用者資料（XSS 風險）-->
+      <p v-html="user.bio"></p>
+      <button @click="deleteUser(user.id)">刪除</button>
+    </div>
+    <input v-model="searchQuery" placeholder="搜尋" />
+  </div>
+</template>
+
+<script setup>
+import { ref, reactive, watch } from 'vue'
+import axios from 'axios'
+
+// 問題3：API key 硬編碼在前端
+const API_KEY = 'sk-prod-1234567890abcdef'
+const BASE_URL = 'https://api.example.com'
+
+const users = ref([])
+const searchQuery = ref('')
+
+// 問題4：不必要的 watch，應改用 computed
+watch(searchQuery, (newVal) => {
+  filteredUsers.value = users.value.filter(u => u.name.includes(newVal))
+})
+
+const filteredUsers = ref([])
+
+// 問題5：watch 使用不必要的 deep，且監聽整個大物件
+const userProfile = reactive({ name: '', age: 0, settings: {} })
+watch(userProfile, () => {
+  saveProfile()
+}, { deep: true })
+
+async function fetchUsers() {
+  // 問題6：沒有 try-catch 錯誤處理
+  const res = await axios.get(\`\${BASE_URL}/users\`, {
+    headers: { 'X-API-Key': API_KEY }
+  })
+  users.value = res.data
+}
+
+async function deleteUser(id) {
+  // 問題7：console.log 遺留
+  console.log('deleting user', id)
+  await axios.delete(\`\${BASE_URL}/users/\${id}\`)
+  users.value = users.value.filter(u => u.id !== id)
+}
+
+function saveProfile() {
+  localStorage.setItem('profile', JSON.stringify(userProfile))
+}
+
+// 問題8：onMounted 用了 Options API 的寫法（this.$nextTick）
+// 實際上在 script setup 中無法使用 this
+fetchUsers()
+</script>
+
+<style scoped>
+.user-item {
+  padding: 8px;
+  border-bottom: 1px solid #eee;
+}
+</style>

diff --git a/src/composables/useSearch.js b/src/composables/useSearch.js
new file mode 100644
index 0000000..def5678
--- /dev/null
+++ b/src/composables/useSearch.js
@@ -0,0 +1,20 @@
+import { ref, computed } from 'vue'
+
+// 良好實踐：composable 使用 use 前綴
+export function useSearch(items) {
+  const query = ref('')
+
+  // 良好實踐：用 computed 做過濾
+  const filtered = computed(() =>
+    items.value.filter(item =>
+      item.name.toLowerCase().includes(query.value.toLowerCase())
+    )
+  )
+
+  return { query, filtered }
+}
`;

async function main() {
  console.log('=== Code Review Agent 本地測試 ===\n');
  console.log('正在分析 diff，請稍候...\n');

  const result = await reviewPRDiff(FAKE_DIFF);

  console.log('=== Review 結果 ===\n');
  console.log(result);
}

main().catch((err) => {
  console.error('測試失敗:', err.message);
  process.exit(1);
});
