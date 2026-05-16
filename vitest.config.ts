import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/gsap.setup.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      include: [
        'src/core/GameStateMachine.ts',
        'src/core/LevelLoader.ts',
        'src/core/AudioManager.ts',
        'src/core/PhysicsManager.ts',
        'src/gameplay/ScoreSystem.ts',
        'src/gameplay/LevelSystem.ts',
        'src/gameplay/MergeSystem.ts',
        'src/gameplay/Block.ts',
        'src/ui/UIManager.ts',
        'src/ui/components/WarningLine.ts',
        'src/ui/effects/ParticleEffect.ts',
        'src/ui/effects/MergeEffect.ts',
        'src/ui/hud/GameHUD.ts',
        'src/ui/screens/MainMenuScreen.ts',
        'src/ui/screens/ResultScreen.ts',
        'src/ui/screens/LevelSelectScreen.ts',
        'src/utils/EventBus.ts',
        'src/utils/PerformanceMonitor.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});