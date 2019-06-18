// Log levels
const LOG_QUIET = 100;
const LOG_INFO = 30;
const LOG_DEBUG = 20;
const LOG_TRACE = 10;

class CNLogger {
  constructor(name, level = LOG_INFO) {
    this.name = name;
    this.logLevel = level;
  }

  fatal(...args) {
    args[0] = `FATAL: ${this.name}: ${args[0]}`;
    console.error(...args);
  }

  error(...args) {
    args[0] = `ERROR: ${this.name}: ${args[0]}`;
    console.error(...args);
  }

  warn(...args) {
    args[0] = `WARN: ${this.name}: ${args[0]}`;
    console.warn(...args);
  }

  info(...args) {
    if (this.logLevel <= LOG_INFO) {
      args[0] = `INFO: ${this.name}: ${args[0]}`;
      console.info(...args);
    }
  }

  debug(...args) {
    if (this.logLevel <= LOG_DEBUG) {
      args[0] = `DEBUG: ${this.name}: ${args[0]}`;
      console.info(...args);
    }
  }

  trace(...args) {
    if (this.logLevel <= LOG_TRACE) {
      args[0] = `TRACE: ${this.name}: ${args[0]}`;
      console.info(...args);
    }
  }

  set level(logLevel) {
    this.logLevel = logLevel;
  }

  static get QUIET_LEVEL() {
    return LOG_QUIET;
  }

  static get INFO_LEVEL() {
    return LOG_INFO;
  }

  static get DEBUG_LEVEL() {
    return LOG_DEBUG;
  }

  static get TRACE_LEVEL() {
    return LOG_TRACE;
  }
}

module.exports = CNLogger;
