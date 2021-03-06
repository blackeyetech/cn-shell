// Log levels
enum CNLogLevel {
  LOG_COMPLETE_SILENCE = 200,
  LOG_QUIET = 100,
  LOG_INFO = 30,
  LOG_DEBUG = 20,
  LOG_TRACE = 10,
}

abstract class CNLogger {
  protected _name: string;
  protected _level: CNLogLevel;
  protected _logTimestamp: boolean;

  constructor(name: string) {
    this._name = name;
    this._level = CNLogLevel.LOG_INFO;
  }

  abstract fatal(...args: any): void;
  abstract error(...args: any): void;
  abstract warn(...args: any): void;
  abstract info(...args: any): void;
  abstract debug(...args: any): void;
  abstract trace(...args: any): void;
  abstract force(...args: any): void;

  set level(level: CNLogLevel) {
    this._level = level;
  }

  set logTimestamps(logTimestamps: boolean) {
    this._logTimestamp = logTimestamps;
  }

  static get CNLogLevel(): typeof CNLogLevel {
    return CNLogLevel;
  }
}

export default CNLogger;
