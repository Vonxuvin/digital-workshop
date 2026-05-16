import { PropSystem } from '../gameplay/props/PropSystem';
import { PropType } from '../gameplay/props/Prop';
import propsData from '../data/props/props.json';

const DEFAULT_PROPS = [
  { id: 'prop_bomb', type: PropType.BOMB, name: '炸弹', description: '销毁指定区域内所有方块', icon: 'bomb', maxCount: 3, cooldown: 1000, price: 50 },
  { id: 'prop_rainbow', type: PropType.RAINBOW, name: '彩虹方块', description: '可与任意数字合成', icon: 'rainbow', maxCount: 3, cooldown: 1000, price: 80 },
  { id: 'prop_freeze', type: PropType.FREEZE, name: '冻结', description: '暂停物理模拟5秒', icon: 'freeze', maxCount: 3, cooldown: 1000, price: 60 },
  { id: 'prop_shrink', type: PropType.SHRINK, name: '缩小射线', description: '将所有方块缩小30%', icon: 'shrink', maxCount: 2, cooldown: 2000, price: 100 },
  { id: 'prop_lucky', type: PropType.LUCKY, name: '幸运投放', description: '接下来3次投放必出高数字', icon: 'lucky', maxCount: 2, cooldown: 2000, price: 120 },
];

export class PropsConfigLoader {
  static async load(propSystem: PropSystem): Promise<void> {
    try {
      if (propsData && (propsData as any).props) {
        await propSystem.loadConfig((propsData as any).props);
        return;
      }
    } catch (e) {
      console.warn('[PropsConfigLoader] 静态导入道具配置失败，尝试fetch加载:', e);
    }

    try {
      const response = await fetch('/src/data/props/props.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      await propSystem.loadConfig(data.props || []);
    } catch (e) {
      console.warn('[PropsConfigLoader] 加载道具配置失败，使用默认配置:', e);
      await propSystem.loadConfig(DEFAULT_PROPS);
    }
  }
}