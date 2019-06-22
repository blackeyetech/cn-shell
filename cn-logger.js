// Log levels
const LOG_QUIET = 100;
const LOG_INFO = 30;
const LOG_DEBUG = 20;
const LOG_TRACE = 10;

const QUIET_LEVEL = "0";
const INFO_LEVEL = "1";
const DEBUG_LEVEL = "2";
const TRACE_LEVEL = "3";

class CNLogger {
  constructor(name, level = INFO_LEVEL) {
    this.name = name;
    this.setLevel(level);
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
    if (this.level <= LOG_INFO) {
      args[0] = `INFO: ${this.name}: ${args[0]}`;
      console.info(...args);
    }
  }

  debug(...args) {
    if (this.level <= LOG_DEBUG) {
      args[0] = `DEBUG: ${this.name}: ${args[0]}`;
      console.info(...args);
    }
  }

  trace(...args) {
    if (this.level <= LOG_TRACE) {
      args[0] = `TRACE: ${this.name}: ${args[0]}`;
      console.info(...args);
    }
  }

  setLevel(logLevel) {
    if (logLevel === QUIET_LEVEL) {
      this.level = LOG_QUIET;
    } else if (logLevel === TRACE_LEVEL) {
      this.level = LOG_TRACE;
    } else if (logLevel === DEBUG_LEVEL) {
      this.level = LOG_DEBUG;
    } else {
      this.level = LOG_INFO;
    }
  }
}

module.exports = CNLogger;
