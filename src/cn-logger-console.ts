import { CNLogger, CNLogLevel } from "./cn-logger";

class CNLoggerConsole extends CNLogger {
  constructor(name: string) {
    super(name);
  }

  fatal(...args: any): void {
    // fatals are always logged unless level = LOG_COMPLETE_SILENCE
    if (this._level <= CNLogLevel.LOG_QUIET) {
      args[0] = `FATAL: ${this._name}: ${args[0]}`;
      console.error(...args);
    }
  }

  error(...args: any): void {
    // errors are always logged unless level = LOG_COMPLETE_SILENCE
    if (this._level <= CNLogLevel.LOG_QUIET) {
      args[0] = `ERROR: ${this._name}: ${args[0]}`;
      console.error(...args);
    }
  }

  warn(...args: any): void {
    // warnings are always logged unless level = LOG_COMPLETE_SILENCE
    if (this._level <= CNLogLevel.LOG_QUIET) {
      args[0] = `WARN: ${this._name}: ${args[0]}`;
      console.warn(...args);
    }
  }

  info(...args: any): void {
    if (this._level <= CNLogLevel.LOG_INFO) {
      args[0] = `INFO: ${this._name}: ${args[0]}`;
      console.info(...args);
    }
  }

  debug(...args: any): void {
    if (this._level <= CNLogLevel.LOG_DEBUG) {
      args[0] = `DEBUG: ${this._name}: ${args[0]}`;
      console.info(...args);
    }
  }

  trace(...args: any): void {
    if (this._level <= CNLogLevel.LOG_TRACE) {
      args[0] = `TRACE: ${this._name}: ${args[0]}`;
      console.info(...args);
    }
  }
}

export { CNLoggerConsole, CNLogLevel };
