import { DateTime } from "luxon";

// Log levels
enum CNLogLevel {
  LOG_COMPLETE_SILENCE = 0, // Nothing - not even fatals
  LOG_QUIET = 100, // Log nothing except fatals, errors and warnings
  LOG_INFO = 200, // Log info messages
  LOG_START_UP = 250, // Log start up as well as info messages
  LOG_DEBUG = 300, // Log debug messages
  LOG_TRACE = 400, // Log trace messages
}

export abstract class CNLogger {
  protected _name: string;
  protected _level: CNLogLevel;
  protected _logTimestamps: boolean;
  protected _logTimestampFormat: string; // Empty string means use ISO format

  protected _started: boolean;

  constructor(name: string, logTimestamps: boolean, timestampFormat: string) {
    this._name = name;
    this._logTimestamps = logTimestamps;
    this._logTimestampFormat = timestampFormat;

    this._started = false;
  }

  start(): void {
    // Override if you need to set something up before logging, e.g. open a file
    this._started = true;
    return;
  }

  stop(): void {
    // Overide if you need to tidy up before exiting, e.g. close a file
    this._started = false;
    return;
  }

  abstract fatal(...args: any): void;
  abstract error(...args: any): void;
  abstract warn(...args: any): void;
  abstract startup(...args: any): void;
  abstract info(...args: any): void;
  abstract debug(...args: any): void;
  abstract trace(...args: any): void;
  abstract force(...args: any): void;

  set level(level: CNLogLevel) {
    this._level = level;
  }

  get started(): boolean {
    return this._started;
  }

  static get CNLogLevel(): typeof CNLogLevel {
    return CNLogLevel;
  }

  protected timestamp(): string {
    if (this._logTimestamps === false) {
      return "";
    }

    if (this._logTimestampFormat === "") {
      return DateTime.local().toISO();
    }

    return DateTime.local().toFormat(this._logTimestampFormat);
  }
}
