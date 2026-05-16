import gsap from 'gsap';
import { afterEach } from 'vitest';
import { eventBus } from '../src/utils/EventBus';

afterEach(() => {
  gsap.globalTimeline.clear();
  gsap.globalTimeline._first = null;
  gsap.globalTimeline._last = null;
  gsap.ticker.wake();
  eventBus.destroy();
});
