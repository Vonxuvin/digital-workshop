import gsap from 'gsap';
import { afterEach } from 'vitest';

afterEach(() => {
  gsap.globalTimeline.clear();
  gsap.globalTimeline._first = null;
  gsap.globalTimeline._last = null;
  gsap.ticker.wake();
});
