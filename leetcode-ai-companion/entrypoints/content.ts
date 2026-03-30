import { bootstrapContentApp } from '../src/content-script/index';
import { isLeetCodeProblemPage } from '../src/services/leetcodeScraper';

export default defineContentScript({
  matches: ['https://leetcode.com/problems/*'],
  runAt: 'document_idle',
  main() {
    if (!isLeetCodeProblemPage()) {
      return;
    }

    bootstrapContentApp();
  },
});