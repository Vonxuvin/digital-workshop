import { Container, Graphics, Text } from 'pixi.js';
import { BLOCK_CONFIGS } from '../../gameplay/Block';

export class BlockPreviewUI extends Container {
  private previewGraphics: Graphics;
  private valueText: Text;
  private currentValue: number = 1;

  constructor(size: number = 40) {
    super();
    this.previewGraphics = new Graphics();
    this.addChild(this.previewGraphics);
    this.valueText = new Text({
      text: '1',
      style: { fontFamily: 'Arial', fontSize: size * 0.5, fill: 0xffffff, fontWeight: 'bold' },
    });
    this.valueText.anchor.set(0.5);
    this.addChild(this.valueText);
    this.draw(1);
  }

  setValue(value: number): void {
    this.currentValue = value;
    this.draw(value);
  }

  private draw(value: number): void {
    const config = BLOCK_CONFIGS[value] || BLOCK_CONFIGS[1];
    this.previewGraphics.clear();
    this.previewGraphics.circle(0, 0, config.radius);
    this.previewGraphics.fill(config.color);
    this.valueText.text = String(value);
  }

  getValue(): number {
    return this.currentValue;
  }
}
