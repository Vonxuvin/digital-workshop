export class Layout {
  static anchor(
    target: { x: number; y: number; width: number; height: number },
    parent: { width: number; height: number },
    hAlign: 'left' | 'center' | 'right' = 'center',
    vAlign: 'top' | 'center' | 'bottom' = 'center',
    marginX = 0,
    marginY = 0,
  ): { x: number; y: number } {
    let x: number;
    switch (hAlign) {
      case 'left':
        x = target.width / 2 + marginX;
        break;
      case 'right':
        x = parent.width - target.width / 2 - marginX;
        break;
      case 'center':
      default:
        x = parent.width / 2 + marginX;
        break;
    }

    let y: number;
    switch (vAlign) {
      case 'top':
        y = target.height / 2 + marginY;
        break;
      case 'bottom':
        y = parent.height - target.height / 2 - marginY;
        break;
      case 'center':
      default:
        y = parent.height / 2 + marginY;
        break;
    }

    return { x, y };
  }

  static grid(
    items: any[],
    cols: number,
    itemWidth: number,
    itemHeight: number,
    gapX: number,
    gapY: number,
    startX: number,
    startY: number,
  ): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < items.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.push({
        x: startX + col * (itemWidth + gapX),
        y: startY + row * (itemHeight + gapY),
      });
    }

    return positions;
  }

  static flex(
    items: Array<{ width: number; height: number }>,
    direction: 'row' | 'column' = 'row',
    gap: number,
    startX: number,
    startY: number,
  ): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];
    let offset = 0;

    for (const item of items) {
      if (direction === 'row') {
        positions.push({
          x: startX + offset,
          y: startY,
        });
        offset += item.width + gap;
      } else {
        positions.push({
          x: startX,
          y: startY + offset,
        });
        offset += item.height + gap;
      }
    }

    return positions;
  }

  static safeArea(
    screenWidth: number,
    screenHeight: number,
  ): { top: number; bottom: number; left: number; right: number } {
    const top = screenHeight * 0.05;
    const bottom = screenHeight * 0.05;
    const left = screenWidth * 0.03;
    const right = screenWidth * 0.03;

    return { top, bottom, left, right };
  }
}
