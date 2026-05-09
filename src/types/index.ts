export interface Vector2 {
  x: number;
  y: number;
}

export interface GameConfig {
  width: number;
  height: number;
  backgroundColor: number;
}

export interface BlockData {
  value: number;
  color: number;
  radius: number;
  mass: number;
}
