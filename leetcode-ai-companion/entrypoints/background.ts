import { initBackgroundHandlers } from '../src/background/index';

export default defineBackground(() => {
  initBackgroundHandlers();
});