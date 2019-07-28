import CNLogger from "./cn-logger";

class CNLoggerConsole extends CNLogger {
  constructor() {
    super();
  }

  fatal(label: string, ...args: any): void {
    // fatals are always logged unless level = LOG_COMPLETE_SILENCE
    if (this._level <= CNLogger.CNLogLevel.LOG_QUIET) {
      args[0] = `FATAL: ${label}: ${args[0]}`;
      console.error(...args);
    }
  }

  error(label: string, ...args: any): void {
    // errors are always logged unless level = LOG_COMPLETE_SILENCE
    if (this._level <= CNLogger.CNLogLevel.LOG_QUIET) {
      args[0] = `ERROR: ${label}: ${args[0]}`;
      console.error(...args);
    }
  }

  warn(label: string, ...args: any): void {
    // warnings are always logged unless level = LOG_COMPLETE_SILENCE
    if (this._level <= CNLogger.CNLogLevel.LOG_QUIET) {
      args[0] = `WARN: ${label}: ${args[0]}`;
      console.warn(...args);
    }
  }

  info(label: string, ...args: any): void {
    if (this._level <= CNLogger.CNLogLevel.LOG_INFO) {
      args[0] = `INFO: ${label}: ${args[0]}`;
      console.info(...args);
    }
  }

  debug(label: string, ...args: any): void {
    if (this._level <= CNLogger.CNLogLevel.LOG_DEBUG) {
      args[0] = `DEBUG: ${label}: ${args[0]}`;
      console.info(...args);
    }
  }

  trace(label: string, ...args: any): void {
    if (this._level <= CNLogger.CNLogLevel.LOG_TRACE) {
      args[0] = `TRACE: ${label}: ${args[0]}`;
      console.info(...args);
    }
  }

  force(label: string, ...args: any): void {
    // forces are always logged even if level = LOG_COMPLETE_SILENCE
    args[0] = `FORCED: ${label}: ${args[0]}`;
    console.error(...args);
  }
}

export default CNLoggerConsole;
