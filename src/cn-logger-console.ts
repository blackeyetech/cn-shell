import CNLogger from "./cn-logger";
import util from "util";

class CNLoggerConsole extends CNLogger {
  constructor(name: string) {
    super(name);
  }

  fatal(...args: any): void {
    // fatals are always logged unless level = LOG_COMPLETE_SILENCE
    if (this._level <= CNLogger.CNLogLevel.LOG_QUIET) {
      let msg = util.format(
        `FATAL: ${this._name}: ${args[0]}`,
        ...args.slice(1),
      );
      console.error(msg);
    }
  }

  error(...args: any): void {
    // errors are always logged unless level = LOG_COMPLETE_SILENCE
    if (this._level <= CNLogger.CNLogLevel.LOG_QUIET) {
      let msg = util.format(
        `ERROR: ${this._name}: ${args[0]}`,
        ...args.slice(1),
      );
      console.error(msg);
    }
  }

  warn(...args: any): void {
    // warnings are always logged unless level = LOG_COMPLETE_SILENCE
    if (this._level <= CNLogger.CNLogLevel.LOG_QUIET) {
      let msg = util.format(
        `WARN: ${this._name}: ${args[0]}`,
        ...args.slice(1),
      );
      console.warn(msg);
    }
  }

  info(...args: any): void {
    if (this._level <= CNLogger.CNLogLevel.LOG_INFO) {
      let msg = util.format(
        `INFO: ${this._name}: ${args[0]}`,
        ...args.slice(1),
      );
      //args[0] = `INFO: ${this._name}: ${args[0]}`;
      console.info(msg);
    }
  }

  debug(...args: any): void {
    if (this._level <= CNLogger.CNLogLevel.LOG_DEBUG) {
      let msg = util.format(
        `DEBUG: ${this._name}: ${args[0]}`,
        ...args.slice(1),
      );
      console.info(msg);
    }
  }

  trace(...args: any): void {
    if (this._level <= CNLogger.CNLogLevel.LOG_TRACE) {
      let msg = util.format(
        `TRACE: ${this._name}: ${args[0]}`,
        ...args.slice(1),
      );
      console.info(msg);
    }
  }

  force(...args: any): void {
    // forces are always logged even if level = LOG_COMPLETE_SILENCE
    let msg = util.format(
      `FORCED: ${this._name}: ${args[0]}`,
      ...args.slice(1),
    );
    console.error(msg);
  }
}

export default CNLoggerConsole;
