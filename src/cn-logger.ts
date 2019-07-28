// Log levels
enum CNLogLevel {
  LOG_COMPLETE_SILENCE = 200,
  LOG_QUIET = 100,
  LOG_INFO = 30,
  LOG_DEBUG = 20,
  LOG_TRACE = 10,
}

abstract class CNLogger {
  protected _level: CNLogLevel;

  constructor() {
    this._level = CNLogLevel.LOG_INFO;
  }

  abstract fatal(label: string, ...args: any): void;
  abstract error(label: string, ...args: any): void;
  abstract warn(label: string, ...args: any): void;
  abstract info(label: string, ...args: any): void;
  abstract debug(label: string, ...args: any): void;
  abstract trace(label: string, ...args: any): void;
  abstract force(label: string, ...args: any): void;

  set level(level: CNLogLevel) {
    this._level = level;
  }

  static get CNLogLevel(): typeof CNLogLevel {
    return CNLogLevel;
  }
}

export default CNLogger;
