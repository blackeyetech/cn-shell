"use strict";

const DEFAULT_HEALTHCHECK_PATH = "/healthcheck";

const CFG_NAME = "NAME";
const CFG_LOG_LEVEL = "LOG_LEVEL";

const DEFAULT_NAME = "CNA";
const DEFAULT_LOG_LEVEL = "1";

const NODE_ENV =
  process.env.NODE_ENV === undefined ? "development" : process.env.NODE_ENV;

const version = require("./package.json").version;

const CNApp = require("./cn-app.js");

const CNLogger = require("./cn-logger.js");
const CNHttp = require("./cn-http.js");
const cnConfig = require("./cn-config.js");

let name = cnConfig.get("CNA", CFG_NAME, DEFAULT_NAME);
let log = new CNLogger(
  name,
  cnConfig.get(name, CFG_LOG_LEVEL, DEFAULT_LOG_LEVEL),
);
let http = new CNHttp(name, log);

let extensions = {};

global.cns = {
  get name() {
    return name;
  },

  get log() {
    return log;
  },

  get http() {
    return http;
  },

  fatal(...args) {
    log.fatal(...args);
  },

  error(...args) {
    log.error(...args);
  },

  warn(...args) {
    log.warn(...args);
  },

  info(...args) {
    log.info(...args);
  },

  debug(...args) {
    log.debug(...args);
  },

  trace(...args) {
    log.trace(...args);
  },

  stdout(...args) {
    log.stdout(...args);
  },

  cfg(config, defaultVal) {
    return cnConfig.get(name, config, defaultVal);
  },

  cfgRequired(config) {
    let value = cnConfig.get(name, config);

    if (value === undefined) {
      let key = cnConfig.key(name, config);

      throw Error(`Config parameter (${key}) was not set!`);
    }

    return value;
  },

  registerExt(name, extension) {
    this.info("Registering extension: %s", name);

    extensions[name] = extension;
  },

  get ext() {
    return extensions;
  },

  registerApp(app) {
    this.info("Registering App");
    this.app = app;
  },

  async start() {
    log.info("Starting ...");
    log.info(`CNShell Version (${version})`);
    log.info(`NODE_ENV (${NODE_ENV})`);

    log.info("Setting up event handler for SIGINT and SIGTERM");
    process.on("SIGINT", async () => await this.exit());
    process.on("SIGTERM", async () => await this.exit());

    http.start();
    this.addHealthEndpoint();

    setImmediate(() => this.app.start());

    log.info("Now ready to Rock and Roll!");
  },

  async exit() {
    log.info("Exitting ...");

    await this.app.stop();
    http.stop();

    log.info("So long and thanks for all the fish!");

    process.exit();
  },

  addHealthEndpoint() {
    let path = cnConfig.get(name, "HEALTHCHECK_PATH", DEFAULT_HEALTHCHECK_PATH);

    log.info(`Adding Health Check endpoint on ${path}`);

    http.router.get(path, async (ctx, next) => {
      let healthy = await this.app.healthCheck();

      if (healthy) {
        ctx.status = 200;
      } else {
        ctx.status = 503;
      }

      await next();
    });
  },
};

module.exports = CNApp;
