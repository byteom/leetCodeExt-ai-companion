import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'LeetCode AI Companion',
    description: 'AI-powered LeetCode assistant with hints, reviews, dry runs, and interview mode.',
    permissions: ['storage'],
    host_permissions: ['https://leetcode.com/*', 'https://openrouter.ai/*'],
    action: {
      default_title: 'LeetCode AI Companion',
    },
  },
});