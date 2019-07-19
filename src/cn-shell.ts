// imports here
import { CNLogger, CNLogLevel } from "./cn-logger";
import CNLoggerConsole from "./cn-logger-console";
import CNExtension from "./cn-extension";

import Koa from "koa";
import KoaRouter from "koa-router";
import * as net from "net";

// Config consts here
const CFG_LOGGER: string = "LOGGER";
const CFG_LOG_LEVEL: string = "LOG_LEVEL";

const CFG_PORT: string = "PORT";
const CFG_INTERFACE: string = "INTERFACE";

// Config defaults here
const DEFAULT_LOGGER: string = "CONSOLE";
const DEFAULT_LOG_LEVEL: string = "INFO";

const DEFAULT_PORT: string = "8000";
const DEFAULT_INTERFACE: string = "localhost";
const DEFAULT_HEALTHCHECK_PATH: string = "/healthcheck";

// Misc consts here
const version: string = require("../package.json").version;
const NODE_ENV: string =
  process.env.NODE_ENV === undefined ? "development" : process.env.NODE_ENV;

// CNShell class here
abstract class CNShell {
  // Properties here
  private readonly _name: string;
  private _logger: CNLogger;
  private _app: Koa;
  private _router: KoaRouter;
  private _server: net.Server;
  private readonly _version: string;
  private _extsMap: { [key: string]: CNExtension };

  // Constructor here
  constructor(name: string) {
    this._name = name;
    this._app = new Koa();
    this._router = new KoaRouter();
    this._version = version;
    this._extsMap = {};

    let logger: string = this.getCfg(CFG_LOGGER, DEFAULT_LOGGER);
    switch (logger.toUpperCase()) {
      case "CONSOLE":
        this._logger = new CNLoggerConsole();
        break;
      default:
        this._logger = new CNLoggerConsole();
        this._logger.warn(
          "CNShell",
          `Logger ${logger} is unknown. Using console logger.`,
        );
        break;
    }

    let logLevel: string = this.getCfg(CFG_LOG_LEVEL, DEFAULT_LOG_LEVEL);

    switch (logLevel.toUpperCase()) {
      case "SILENT":
        this._logger.level = CNLogLevel.LOG_COMPLETE_SILENCE;
        break;
      case "QUIET":
        this._logger.level = CNLogLevel.LOG_QUIET;
        break;
      case "INFO":
        this._logger.level = CNLogLevel.LOG_INFO;
        break;
      case "DEBUG":
        this._logger.level = CNLogLevel.LOG_DEBUG;
        break;
      case "TRACE":
        this._logger.level = CNLogLevel.LOG_TRACE;
        break;
      default:
        this._logger.level = CNLogLevel.LOG_INFO;
        this._logger.warn(
          "CNShell",
          `LogLevel ${logLevel} is unknown. Setting level to INFO.`,
        );
        break;
    }
  }

  // Abstract methods here
  abstract async start(): Promise<boolean>;
  abstract async stop(): Promise<void>;
  abstract async healthCheck(): Promise<boolean>;

  // Getters here
  get name(): string {
    return this._name;
  }

  get version() {
    return this._version;
  }

  get router() {
    return this._router;
  }

  // Setters here
  set level(level: CNLogLevel) {
    this._logger.level = level;
  }

  // Public methods here
  async init(testing?: boolean) {
    this._logger.info("CNShell", "Initialising ...");
    this._logger.info("CNShell", `Version (${this._version})`);
    this._logger.info("CNShell", `NODE_ENV (${NODE_ENV})`);

    this._logger.info(
      "CNShell",
      "Setting up event handler for SIGINT and SIGTERM",
    );
    process.on("SIGINT", async () => await this.exit());
    process.on("SIGTERM", async () => await this.exit());

    this.addHealthCheckEndpoint();

    this._logger.info("CNShell", "Attempting to start application ...");
    let started = await this.start().catch(e => {
      this.error(e);
    });

    if (!started) {
      this._logger.info(
        "CNShell",
        "Heuston, we have a problem. Shutting down now ...",
      );

      if (testing) {
        await this.exit(false);
        return;
      }

      await this.exit();
    }

    this._logger.info("CNShell", "Initialising HTTP interface ...");

    this._app.use(this._router.routes());

    let httpif: string = this.getCfg(CFG_INTERFACE, DEFAULT_INTERFACE);
    let port: string = this.getCfg(CFG_PORT, DEFAULT_PORT);

    this._logger.info(
      "CNShell",
      `Attempting to listening on (${httpif}:${port})`,
    );
    this._server = this._app.listen(parseInt(port, 10), httpif);
    this._logger.info("CNShell", "Now listening!");

    this._logger.info("CNShell", "Ready to Rock and Roll baby!");
  }

  async exit(hard: boolean = true): Promise<void> {
    this._logger.info("CNShell", "Exiting ...");

    if (this._server !== undefined) {
      this._logger.info("CNShell", "Closing HTTP port on server now ...");
      this._server.close();
      this._logger.info("CNShell", "Port closed");
    }

    this._logger.info("CNShell", "Attempting to stop application ...");
    await this.stop().catch(e => {
      this.error(e);
    });

    this._logger.info("CNShell", "So long and thanks for all the fish!");

    if (hard) {
      process.exit();
    }
  }

  getCfg(config: string, defaultVal: string = ""): string {
    let value = process.env[`CNA_${config.toUpperCase()}`];

    // If env var doesn't exist then return the default value
    if (value === undefined) {
      return defaultVal;
    }

    return value;
  }

  getRequiredCfg(config: string): string {
    let value = process.env[`CNA_${config.toUpperCase()}`];

    if (value === undefined) {
      throw Error(
        `Config parameter (CNA_${config.toUpperCase()}) was not set!`,
      );
    }

    return value;
  }

  fatal(...args: any): void {
    this._logger.fatal(this._name, ...args);
  }

  error(...args: any): void {
    this._logger.error(this._name, ...args);
  }

  warn(...args: any): void {
    this._logger.warn(this._name, ...args);
  }

  info(...args: any): void {
    this._logger.info(this._name, ...args);
  }

  debug(...args: any): void {
    this._logger.debug(this._name, ...args);
  }

  trace(...args: any): void {
    this._logger.trace(this._name, ...args);
  }

  force(...args: any): void {
    this._logger.force(this._name, ...args);
  }

  registerExt(ext: CNExtension) {
    this.info("Registering extension: %s", ext.name);
    this._extsMap[ext.name] = ext;
  }

  getExt(name: string): CNExtension {
    return this._extsMap[name];
  }

  staticResponseRoute(path: string, response: string): void {
    this.info(`Adding static response GET route on path ${path}`);

    this._router.get(path, async (ctx, next) => {
      ctx.status = 200;
      ctx.type = "application/json; charset=utf-8";
      ctx.body = JSON.stringify(response);
      await next();
    });
  }

  // Private methods here
  private addHealthCheckEndpoint(): void {
    let path = this.getCfg("HEALTHCHECK_PATH", DEFAULT_HEALTHCHECK_PATH);

    this._logger.info("CNShell", `Adding Health Check endpoint on ${path}`);

    this.router.get(path, async (ctx, next) => {
      let healthy = await this.healthCheck().catch(e => {
        this.error(e);
      });

      if (healthy) {
        ctx.status = 200;
      } else {
        ctx.status = 503;
      }

      await next();
    });
  }
}

export { CNShell, CNLogger, CNLogLevel, CNExtension };
