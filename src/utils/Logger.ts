export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}

const LEVEL_PREFIX: Record<LogLevel, string> = {
  [LogLevel.NONE]: '',
  [LogLevel.ERROR]: 'ERR',
  [LogLevel.WARN]: 'WRN',
  [LogLevel.INFO]: 'INF',
  [LogLevel.DEBUG]: 'DBG',
};

export class Logger {
  private static instance: Logger | null = null;
  private level: LogLevel = LogLevel.WARN;
  private enabledTags: Set<string> | null = null;

  static setInstance(instance: Logger): void {
    Logger.instance = instance;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  enableOnly(tags: string[]): void {
    this.enabledTags = new Set(tags);
  }

  enableAll(): void {
    this.enabledTags = null;
  }

  private shouldLog(level: LogLevel, tag?: string): boolean {
    if (level > this.level) return false;
    if (this.enabledTags && tag && !this.enabledTags.has(tag)) return false;
    return true;
  }

  private format(level: LogLevel, tag: string, args: unknown[]): unknown[] {
    const prefix = `[${LEVEL_PREFIX[level]}][${tag}]`;
    return [prefix, ...args];
  }

  error(tag: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.ERROR, tag)) return;
    console.error(...this.format(LogLevel.ERROR, tag, args));
  }

  warn(tag: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.WARN, tag)) return;
    console.warn(...this.format(LogLevel.WARN, tag, args));
  }

  info(tag: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.INFO, tag)) return;
    console.info(...this.format(LogLevel.INFO, tag, args));
  }

  debug(tag: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.DEBUG, tag)) return;
    console.log(...this.format(LogLevel.DEBUG, tag, args));
  }
}

export const logger = Logger.getInstance();
