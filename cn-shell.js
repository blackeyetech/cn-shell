"use strict";

const HEALTHY = true;
const DEFAULT_HEALTHCHECK_PATH = "/healthcheck";

const NODE_ENV =
  process.env.NODE_ENV === undefined ? "development" : process.env.NODE_ENV;

const version = require("./package.json").version;

const CNLogger = require("./cn-logger.js");
const CNConfig = require("./cn-config.js");
const CNHttp = require("./cn-http.js");

class CNShell {
  constructor(name) {
    this.name = name;
    this.log = new CNLogger(name);

    let logLevel = this.cfg("LOG_LEVEL");

    if (logLevel === "quiet") {
      this.log.level = CNLogger.QUIET_LEVEL;
    } else if (logLevel === "trace") {
      this.log.level = CNLogger.TRACE_LEVEL;
    } else if (logLevel === "debug") {
      this.log.level = CNLogger.DEBUG_LEVEL;
    } else {
      this.log.level = CNLogger.INFO_LEVEL;
    }

    this.http = new CNHttp(name, this.log);
    this.addHealthEndpoint();
  }

  async run() {
    this.info("Starting ...");
    this.info(`CNShell Version (${version})`);
    this.info(`NODE_ENV (${NODE_ENV})`);

    this.info("Setting up event handler for SIGINT and SIGTERM");
    process.on("SIGINT", async () => await this.exit());
    process.on("SIGTERM", async () => await this.exit());

    this.http.startApp();

    setImmediate(() => this.start());

    this.info("Now ready to Rock and Roll!");
  }

  start() {
    // This should be overriden by the application to impliment the logic
    // required to start the app
  }

  async stop() {
    // This should be overriden by the application to provide any shutdown
    // logic required
  }

  async exit() {
    this.info("Exitting ...");

    await this.stop();
    this.http.stop();

    this.info("So long and thanks for all the fish!");

    process.exit();
  }

  fatal(...args) {
    this.log.fatal(...args);
  }

  error(...args) {
    this.log.error(...args);
  }

  warn(...args) {
    this.log.warn(...args);
  }

  info(...args) {
    this.log.info(...args);
  }

  debug(...args) {
    this.log.debug(...args);
  }

  trace(...args) {
    this.log.trace(...args);
  }

  cfg(config, defaultVal) {
    return CNConfig.getCfg(this.name, config, defaultVal);
  }

  cfgRequired(config) {
    let value = CNConfig.getCfg(this.name, config);

    if (value === undefined) {
      let key = CNConfig.getKey(this.name, config);

      throw Error(`Config parameter (${key}) was not set!`);
    }

    return value;
  }

  addHealthEndpoint() {
    let path = this.cfg("HEALTHCHECK_PATH", DEFAULT_HEALTHCHECK_PATH);

    this.info(`Adding Health Check endpoint on ${path}`);

    this.http.router.get(path, async (ctx, next) => {
      let healthy = await this.healthy();

      if (healthy) {
        ctx.status = 200;
      } else {
        ctx.status = 503;
      }

      await next();
    });
  }

  async healthy() {
    // This is a default health check which should be overridden if something
    // more advanced is required
    return HEALTHY;
  }
}

module.exports = CNShell;
