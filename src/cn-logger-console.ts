import CNLogger from "./cn-logger";
import util from "util";

class CNLoggerConsole extends CNLogger {
  constructor(name: string) {
    super(name);
  }
  private timestamp(): string {
    if (this._logTimestamp === false) {
      return "";
    }

    let ts = new Date();
    let y = ts.getFullYear();
    let m = ts.getMonth() + 1;
    let d = ts.getDate();
    let h = ts.getHours();
    let min = ts.getMinutes();
    let s = ts.getSeconds();

    let formatted =
      y +
      "-" +
      (m < 10 ? `0${m}` : m) +
      "-" +
      (d < 10 ? `0${d}` : d) +
      " " +
      (h < 10 ? `0${h}` : h) +
      ":" +
      (min < 10 ? `0${min}` : min) +
      ":" +
      (s < 10 ? `0${s}` : s) +
      " ";

    return formatted;
  }

  fatal(...args: any): void {
    // fatals are always logged unless level = LOG_COMPLETE_SILENCE
    if (this._level <= CNLogger.CNLogLevel.LOG_QUIET) {
      let msg = util.format(
        `${this.timestamp()}FATAL: ${this._name}: ${args[0]}`,
        ...args.slice(1),
      );
      console.error(msg);
    }
  }

  error(...args: any): void {
    // errors are always logged unless level = LOG_COMPLETE_SILENCE
    if (this._level <= CNLogger.CNLogLevel.LOG_QUIET) {
      let msg = util.format(
        `${this.timestamp()}ERROR: ${this._name}: ${args[0]}`,
        ...args.slice(1),
      );
      console.error(msg);
    }
  }

  warn(...args: any): void {
    // warnings are always logged unless level = LOG_COMPLETE_SILENCE
    if (this._level <= CNLogger.CNLogLevel.LOG_QUIET) {
      let msg = util.format(
        `${this.timestamp()}WARN: ${this._name}: ${args[0]}`,
        ...args.slice(1),
      );
      console.warn(msg);
    }
  }

  info(...args: any): void {
    if (this._level <= CNLogger.CNLogLevel.LOG_INFO) {
      let msg = util.format(
        `${this.timestamp()}INFO: ${this._name}: ${args[0]}`,
        ...args.slice(1),
      );
      //args[0] = `INFO: ${this._name}: ${args[0]}`;
      console.info(msg);
    }
  }

  debug(...args: any): void {
    if (this._level <= CNLogger.CNLogLevel.LOG_DEBUG) {
      let msg = util.format(
        `${this.timestamp()}DEBUG: ${this._name}: ${args[0]}`,
        ...args.slice(1),
      );
      console.info(msg);
    }
  }

  trace(...args: any): void {
    if (this._level <= CNLogger.CNLogLevel.LOG_TRACE) {
      let msg = util.format(
        `${this.timestamp()}TRACE: ${this._name}: ${args[0]}`,
        ...args.slice(1),
      );
      console.info(msg);
    }
  }

  force(...args: any): void {
    // forces are always logged even if level = LOG_COMPLETE_SILENCE
    let msg = util.format(
      `${this.timestamp()}FORCED: ${this._name}: ${args[0]}`,
      ...args.slice(1),
    );
    console.error(msg);
  }
}

export default CNLoggerConsole;
