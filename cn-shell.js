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
    this.logger = new CNLogger(name);

    let logLevel = this.cfg("LOG_LEVEL");

    if (logLevel === "quiet") {
      this.logger.level = CNLogger.QUIET_LEVEL;
    } else if (logLevel === "trace") {
      this.logger.level = CNLogger.TRACE_LEVEL;
    } else if (logLevel === "debug") {
      this.logger.level = CNLogger.DEBUG_LEVEL;
    } else {
      this.logger.level = CNLogger.INFO_LEVEL;
    }

    this.http = new CNHttp(name, this.log);
    this.addHealthEndpoint();
  }

  start() {
    this.info("Starting ...");
    this.info(`CNShell Version (${version})`);
    this.info(`NODE_ENV (${NODE_ENV})`);

    this.info("Setting up event handler for SIGINT and SIGTERM");
    process.on("SIGINT", async () => await this.exit());
    process.on("SIGTERM", async () => await this.exit());

    this.http.start();

    this.info("Now ready to Rock!");
  }

  async stop() {
    this.info("Stopping ...");

    // This should be overriden my the application to provide any shutdown
    // logic

    this.info("Stopped!");
  }

  async exit() {
    this.info("Exitting ...");

    await this.stop();
    this.http.stop();

    this.info("So long and thanks for all the fish!");

    process.exit();
  }

  fatal(...args) {
    this.logger.fatal(...args);
  }

  error(...args) {
    this.logger.error(...args);
  }

  warn(...args) {
    this.logger.warn(...args);
  }

  info(...args) {
    this.logger.info(...args);
  }

  debug(...args) {
    this.logger.debug(...args);
  }

  trace(...args) {
    this.logger.trace(...args);
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
    return !HEALTHY;
  }
}

module.exports = CNShell;
