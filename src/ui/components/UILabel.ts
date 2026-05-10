import { Container, Text, TextStyle } from 'pixi.js';

export class UILabel extends Container {
  private textNode: Text;

  constructor(text: string = '', style?: Partial<TextStyle>) {
    super();

    this.textNode = new Text({
      text,
      style: {
        fontFamily: 'Arial',
        fontSize: 16,
        fill: 0xffffff,
        ...style,
      },
    });
    this.textNode.anchor.set(0.5);
    this.addChild(this.textNode);
  }

  setText(text: string): void {
    this.textNode.text = text;
  }

  getText(): string {
    return this.textNode.text;
  }

  setStyle(options: Partial<TextStyle>): void {
    if (options.fill !== undefined) {
      this.textNode.style.fill = options.fill;
    }
    if (options.fontSize !== undefined) {
      this.textNode.style.fontSize = options.fontSize;
    }
    if (options.fontFamily !== undefined) {
      this.textNode.style.fontFamily = options.fontFamily;
    }
    if (options.fontWeight !== undefined) {
      this.textNode.style.fontWeight = options.fontWeight;
    }
    if (options.dropShadow !== undefined) {
      this.textNode.style.dropShadow = options.dropShadow;
    }
    if (options.stroke !== undefined) {
      this.textNode.style.stroke = options.stroke;
    }
  }
}
