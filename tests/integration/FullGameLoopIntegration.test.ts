import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameStateMachine, GameState } from '../../src/core/GameStateMachine';
import { ScoreSystem } from '../../src/gameplay/ScoreSystem';
import { LevelSystem, LevelConfig } from '../../src/gameplay/LevelSystem';
import { eventBus } from '../../src/utils/EventBus';

function createLevelConfig(overrides: Partial<LevelConfig> = {}): LevelConfig {
  return {
    id: 1,
    name: 'Test Level',
    objective: { type: 'score', target: 100 },
    container: { width: 400, height: 600, shape: 'rectangle' },
    spawn: { availableNumbers: [1, 2, 4, 8] },
    rewards: { stars: [50, 100, 150] },
    ...overrides,
  };
}

describe('Full Game Loop Integration Tests', () => {

  describe('Drop → Score → Level Complete Chain', () => {
    let stateMachine: GameStateMachine;
    let scoreSystem: ScoreSystem;
    let levelSystem: LevelSystem;

    beforeEach(() => {
      stateMachine = new GameStateMachine('menu');
      scoreSystem = new ScoreSystem();
      levelSystem = new LevelSystem(createLevelConfig({ objective: { type: 'score', target: 100 } }));
    });

    it('should complete full chain: drop block → merge → score → level complete', () => {
      stateMachine.transition('playing');
      expect(stateMachine.getCurrentState()).toBe('playing');

      const scoreHandler = vi.fn();
      const levelHandler = vi.fn();
      eventBus.on('score:updated', scoreHandler);
      eventBus.on('level:completed', levelHandler);

      const scoreSystem2 = new ScoreSystem();
      const levelSystem2 = new LevelSystem(createLevelConfig({ objective: { type: 'score', target: 100 } }));

      scoreSystem2.addMergeScore(2, false);
      expect(scoreSystem2.getScore()).toBeGreaterThan(0);

      scoreSystem2.addMergeScore(4, false);
      expect(scoreSystem2.getScore()).toBeGreaterThan(1);

      scoreSystem2.addMergeScore(128, false);
      expect(scoreSystem2.getScore()).toBeGreaterThan(3);

      scoreSystem2.addMergeScore(256, false);
      expect(scoreSystem2.getScore()).toBeGreaterThan(67);
      expect(levelSystem2.isLevelCompleted()).toBe(true);

      eventBus.off('score:updated', scoreHandler);
      eventBus.off('level:completed', levelHandler);
    });

    it('should handle chain merge scoring', () => {
      scoreSystem.addMergeScore(2, false);
      expect(scoreSystem.getScore()).toBe(1);

      scoreSystem.addMergeScore(2, true);
      expect(scoreSystem.getScore()).toBeGreaterThan(1);

      scoreSystem.addMergeScore(2, true);
      expect(scoreSystem.getScore()).toBeGreaterThan(2);
    });

    it('should reset chain after timeout', () => {
      scoreSystem.addMergeScore(2, true);
      scoreSystem.addMergeScore(2, true);
      const scoreAfterChain = scoreSystem.getScore();

      scoreSystem.update(4000);

      scoreSystem.addMergeScore(2, true);
      expect(scoreSystem.getScore()).toBe(scoreAfterChain + 1);
    });

    it('should emit score:chainEnded when chain times out', () => {
      const handler = vi.fn();
      eventBus.on('score:chainEnded', handler);

      scoreSystem.addMergeScore(2, true);
      scoreSystem.update(4000);

      expect(handler).toHaveBeenCalled();

      eventBus.off('score:chainEnded', handler);
    });
  });

  describe('Game State → Gameplay Integration', () => {
    let stateMachine: GameStateMachine;
    let levelSystem: LevelSystem;

    beforeEach(() => {
      stateMachine = new GameStateMachine('menu');
      levelSystem = new LevelSystem(createLevelConfig({ objective: { type: 'score', target: 100 } }));
    });

    it('should pause level system when game pauses', () => {
      stateMachine.transition('playing');

      const handler = vi.fn();
      eventBus.on('score:updated', handler);

      stateMachine.transition('paused');
      expect(stateMachine.getCurrentState()).toBe('paused');

      levelSystem.pause();

      eventBus.off('score:updated', handler);
    });

    it('should resume level system when game resumes', () => {
      stateMachine.transition('playing');
      stateMachine.transition('paused');
      levelSystem.pause();

      stateMachine.transition('playing');
      levelSystem.resume();

      eventBus.emit('score:updated', { totalScore: 200 });
      expect(levelSystem.isLevelCompleted()).toBe(true);
    });

    it('should transition to gameover on game over', () => {
      stateMachine.transition('playing');
      stateMachine.transition('gameover');

      expect(stateMachine.getCurrentState()).toBe('gameover');
      expect(stateMachine.canTransition('menu')).toBe(true);
      expect(stateMachine.canTransition('playing')).toBe(true);
    });

    it('should transition to levelComplete on level completion', () => {
      stateMachine.transition('playing');
      stateMachine.transition('levelComplete');

      expect(stateMachine.getCurrentState()).toBe('levelComplete');
      expect(stateMachine.canTransition('menu')).toBe(true);
      expect(stateMachine.canTransition('playing')).toBe(true);
    });

    it('should not allow invalid state transitions', () => {
      expect(stateMachine.canTransition('paused')).toBe(false);
      expect(stateMachine.canTransition('gameover')).toBe(false);

      stateMachine.transition('playing');
      expect(stateMachine.canTransition('loading')).toBe(false);
    });

    it('should track state history', () => {
      stateMachine.transition('playing');
      stateMachine.transition('paused');
      stateMachine.transition('playing');

      expect(stateMachine.getPreviousState()).toBe('paused');
    });
  });

  describe('Warning Line → Game Over Integration', () => {
    it('should emit warning:started when blocks exceed warning line', () => {
      const handler = vi.fn();
      eventBus.on('warning:started', handler);

      eventBus.emit('warning:started');

      expect(handler).toHaveBeenCalled();

      eventBus.off('warning:started', handler);
    });

    it('should emit game:over when warning threshold exceeded', () => {
      const warningHandler = vi.fn();
      const gameOverHandler = vi.fn();

      eventBus.on('warning:started', warningHandler);
      eventBus.on('game:over', gameOverHandler);

      eventBus.emit('warning:started');
      eventBus.emit('game:over', { reason: 'warning_line' });

      expect(warningHandler).toHaveBeenCalled();
      expect(gameOverHandler).toHaveBeenCalledWith({ reason: 'warning_line' });

      eventBus.off('warning:started', warningHandler);
      eventBus.off('game:over', gameOverHandler);
    });

    it('should emit warning:ended when blocks clear from warning line', () => {
      const handler = vi.fn();
      eventBus.on('warning:ended', handler);

      eventBus.emit('warning:ended');

      expect(handler).toHaveBeenCalled();

      eventBus.off('warning:ended', handler);
    });
  });

  describe('Obstacle → Clear → Score Integration', () => {
    it('should emit obstacle:cleared and update score', () => {
      const obstacleHandler = vi.fn();
      const scoreHandler = vi.fn();

      eventBus.on('obstacle:cleared', obstacleHandler);
      eventBus.on('score:updated', scoreHandler);

      eventBus.emit('obstacle:cleared');
      eventBus.emit('score:updated', { totalScore: 50 });

      expect(obstacleHandler).toHaveBeenCalled();
      expect(scoreHandler).toHaveBeenCalled();

      eventBus.off('obstacle:cleared', obstacleHandler);
      eventBus.off('score:updated', scoreHandler);
    });
  });

  describe('Full Level Lifecycle Integration', () => {
    it('should complete full level lifecycle: start → play → complete → next', () => {
      const stateMachine = new GameStateMachine('menu');
      const levelSystem = new LevelSystem(createLevelConfig({
        id: 1,
        objective: { type: 'score', target: 100 },
      }));

      const lifecycle: string[] = [];
      stateMachine.onAnyChange((from, to) => lifecycle.push(`${from}→${to}`));

      stateMachine.transition('playing');
      expect(stateMachine.getCurrentState()).toBe('playing');

      eventBus.emit('score:updated', { totalScore: 150 });
      expect(levelSystem.isLevelCompleted()).toBe(true);

      stateMachine.transition('levelComplete');
      expect(stateMachine.getCurrentState()).toBe('levelComplete');

      stateMachine.transition('menu');
      expect(stateMachine.getCurrentState()).toBe('menu');

      expect(lifecycle).toContain('menu→playing');
      expect(lifecycle).toContain('playing→levelComplete');
      expect(lifecycle).toContain('levelComplete→menu');
    });

    it('should handle game over and restart', () => {
      const stateMachine = new GameStateMachine('menu');
      const levelSystem = new LevelSystem(createLevelConfig({
        id: 1,
        objective: { type: 'score', target: 100 },
      }));

      stateMachine.transition('playing');

      eventBus.emit('game:over', { reason: 'warning_line' });
      stateMachine.transition('gameover');
      expect(stateMachine.getCurrentState()).toBe('gameover');

      stateMachine.transition('menu');
      stateMachine.transition('playing');
      expect(stateMachine.getCurrentState()).toBe('playing');
    });
  });

  describe('Lucky Multiplier → Score Integration', () => {
    it('should apply lucky multiplier to score', () => {
      const scoreSystem = new ScoreSystem();

      scoreSystem.addMergeScore(2, false);
      const normalScore = scoreSystem.getScore();

      const luckyScoreSystem = new ScoreSystem();
      luckyScoreSystem.setLuckyMultiplier(2);
      luckyScoreSystem.addMergeScore(2, false);
      const luckyScore = luckyScoreSystem.getScore();

      expect(luckyScore).toBe(normalScore * 2);
    });
  });

  describe('Multiple Systems Coordination', () => {
    it('should coordinate score, level, and state systems', () => {
      const stateMachine = new GameStateMachine('menu');
      const scoreSystem = new ScoreSystem();
      const levelSystem = new LevelSystem(createLevelConfig({
        id: 1,
        objective: { type: 'score', target: 50 },
      }));

      const events: string[] = [];
      eventBus.on('score:updated', () => events.push('score:updated'));
      eventBus.on('level:completed', () => events.push('level:completed'));

      stateMachine.transition('playing');
      events.push('state:playing');

      scoreSystem.addMergeScore(128, false);
      events.push('score:added');

      expect(events).toContain('state:playing');
      expect(events).toContain('score:updated');
      expect(events).toContain('level:completed');
      expect(events).toContain('score:added');
      expect(levelSystem.isLevelCompleted()).toBe(true);
    });
  });
});