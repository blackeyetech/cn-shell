import { CNLogger, CNLogLevel } from "./cn-logger";
import CNExtension from "./cn-extension";

import Koa from "koa";
import KoaRouter from "koa-router";
import * as net from "net";

const CFG_LOG_LEVEL: string = "LOG_LEVEL";
const DEFAULT_LOG_LEVEL: string = "INFO";

const DEFAULT_PORT: string = "8000";
const DEFAULT_INTERFACE: string = "localhost";
const DEFAULT_HEALTHCHECK_PATH: string = "/healthcheck";

const cnsVersion: string = require("../package.json").version;
const NODE_ENV: string =
  process.env.NODE_ENV === undefined ? "development" : process.env.NODE_ENV;

interface BasicAuth {
  username: string;
  password: string;
}

abstract class CNShell {
  private readonly _name: string;
  private _logger: CNLogger;
  private _app: Koa;
  private _router: KoaRouter;
  private _server: net.Server;
  private readonly _cnsVersion: string;
  private _extsMap: { [key: string]: CNExtension };
  private _extsArray: CNExtension[];

  constructor(name: string, logger: CNLogger) {
    this._name = name;
    this._logger = logger;
    this._app = new Koa();
    this._router = new KoaRouter();
    this._cnsVersion = cnsVersion;
    this._extsMap = {};
    this._extsArray = [];

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
        this.warn(`CNLogLevel ${logLevel} is unknown. Setting level to INFO.`);
        break;
    }
  }

  abstract async stop(): Promise<void>;
  abstract async healthCheck(): Promise<boolean>;

  get name(): string {
    return this._name;
  }

  get cnsVersion() {
    return this._cnsVersion;
  }

  get router() {
    return this._router;
  }

  set level(level: CNLogLevel) {
    this._logger.level = level;
  }

  async init() {
    this.info("Initialising ...");
    this.info(`CNShell Version (${this._cnsVersion})`);
    this.info(`NODE_ENV (${NODE_ENV})`);

    this.info("Setting up event handler for SIGINT and SIGTERM");
    process.on("SIGINT", async () => await this.exit());
    process.on("SIGTERM", async () => await this.exit());

    let httpif: string = this.getCfg("INTERFACE", DEFAULT_INTERFACE);
    let port: string = this.getCfg("PORT", DEFAULT_PORT);

    this._app.use(this._router.routes());

    this.info(`Starting to listening on (${httpif}:${port})`);
    this._server = this._app.listen(parseInt(port, 10), httpif);
    this.info("Now listening!");
    this.addHealthEndpoint();

    // TODO: Start the exntensions in the order the were added
    this.info("Ready to Rock and Roll!");
  }

  async exit(): Promise<void> {
    this.info("Exiting ...");

    this.info("Closing HTTP port on server now ...");
    this._server.close();
    this.info("Port closed");

    await this.stop();

    this.info("So long and thanks for all the fish!");

    process.exit();
  }

  fatal(...args: any): void {
    this._logger.fatal(...args);
  }

  error(...args: any): void {
    this._logger.error(...args);
  }

  warn(...args: any): void {
    this._logger.warn(...args);
  }

  info(...args: any): void {
    this._logger.info(...args);
  }

  debug(...args: any): void {
    this._logger.debug(...args);
  }

  trace(...args: any): void {
    this._logger.trace(...args);
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

  registerExt(ext: CNExtension) {
    this.info("Registering extension: %s", ext.name);
    this._extsMap[ext.name] = ext;
    this._extsArray.push(ext);
  }

  getExt(name: string): CNExtension {
    return this._extsMap[name];
  }

  getBasicAuth(ctx: Koa.Context): BasicAuth | null {
    let basic: string = ctx.header("Authorization");
    if (basic === undefined) {
      return null;
    }

    let parts: string[] = basic.split(/ +/);
    if (parts.length !== 2 || parts[0].toLowerCase() !== "basic") {
      return null;
    }

    let credentials: string = Buffer.from(parts[1], "base64").toString("ascii");

    // NOTE: There may be no password so length may be 1 or 2
    let pair: string[] = credentials.split(":");
    if (pair.length > 2) {
      return null;
    }

    let username: string = pair[0];
    let password: string = "";

    if (pair.length === 2) {
      password = pair[1];
    }

    return { username, password };
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

  addHealthEndpoint(): void {
    let path = this.getCfg("HEALTHCHECK_PATH", DEFAULT_HEALTHCHECK_PATH);

    this.info(`Adding Health Check endpoint on ${path}`);

    this.router.get(path, async (ctx, next) => {
      let healthy = await this.healthCheck();

      if (healthy) {
        ctx.status = 200;
      } else {
        ctx.status = 503;
      }

      await next();
    });
  }
}

export default CNShell;
