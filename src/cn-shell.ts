// imports here
import CNLogger from "./cn-logger";
import CNLoggerConsole from "./cn-logger-console";

import Koa from "koa";
import KoaRouter from "koa-router";
import * as net from "net";
// import koaHelmet from "koa-helmet";
import koaBodyparser from "koa-bodyparser";
import koaMulter from "koa-multer";

import { Readable } from "stream";

// Config consts here
const CFG_LOGGER = "LOGGER";
const CFG_LOG_LEVEL = "LOG_LEVEL";

const CFG_HTTP_PORT = "HTTP_PORT";
const CFG_HTTP_INTERFACE = "HTTP_INTERFACE";
const CFG_HEALTHCHECK_PATH = "HEALTHCHECK_PATH";

// Config defaults here
const DEFAULT_LOGGER = "CONSOLE";
const DEFAULT_LOG_LEVEL = "INFO";

const DEFAULT_HTTP_PORT = "8000";
const DEFAULT_HTTP_INTERFACE = "eth0";
const DEFAULT_HEALTHCHECK_PATH = "/healthcheck";

// HTTP content type consts here
const HTTP_CONTENT_TYPE_JSON = "application/json";
const HTTP_CONTENT_TYPE_XLSX =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const ACCEPT_CONTENT_TYPES = [HTTP_CONTENT_TYPE_JSON, HTTP_CONTENT_TYPE_XLSX];

// Misc consts here
const version: string = require("../package.json").version;
const NODE_ENV: string =
  process.env.NODE_ENV === undefined ? "development" : process.env.NODE_ENV;

// CNExtension class here
abstract class CNExtension {
  // Properties here
  private readonly _name: string;
  protected readonly _shell: CNShell;

  // Constructor here
  constructor(name: string, shell: CNShell) {
    this._name = name;
    this._shell = shell;
  }

  // Getters here
  get name(): string {
    return this._name;
  }

  // Public methods here
  fatal(...args: any): void {
    this._shell.logger.fatal(this._name, ...args);
  }

  error(...args: any): void {
    this._shell.logger.error(this._name, ...args);
  }

  warn(...args: any): void {
    this._shell.logger.warn(this._name, ...args);
  }

  info(...args: any): void {
    this._shell.logger.info(this._name, ...args);
  }

  debug(...args: any): void {
    this._shell.logger.debug(this._name, ...args);
  }

  trace(...args: any): void {
    this._shell.logger.trace(this._name, ...args);
  }

  force(...args: any): void {
    this._shell.logger.force(this._name, ...args);
  }

  getCfg(config: string, defaultVal: string = ""): string {
    return this._shell.getCfg(config, defaultVal);
  }

  getRequiredCfg(config: string): string {
    return this._shell.getRequiredCfg(config);
  }
}

// CNShell class here
abstract class CNShell {
  // Properties here
  private readonly _name: string;
  private _logger: CNLogger;
  private _app: Koa;
  private _router: KoaRouter;
  private _server: net.Server;
  private _httpMaxSendRowsLimit: number;

  private readonly _version: string;

  // Constructor here
  constructor(name: string) {
    this._name = name;
    this._app = new Koa();
    this._router = new KoaRouter();
    // this._app.use(koaHelmet());
    this._app.use(koaBodyparser());
    this._httpMaxSendRowsLimit = 1000;

    this._version = version;

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
        this._logger.level = CNLogger.CNLogLevel.LOG_COMPLETE_SILENCE;
        break;
      case "QUIET":
        this._logger.level = CNLogger.CNLogLevel.LOG_QUIET;
        break;
      case "INFO":
        this._logger.level = CNLogger.CNLogLevel.LOG_INFO;
        break;
      case "DEBUG":
        this._logger.level = CNLogger.CNLogLevel.LOG_DEBUG;
        break;
      case "TRACE":
        this._logger.level = CNLogger.CNLogLevel.LOG_TRACE;
        break;
      default:
        this._logger.level = CNLogger.CNLogLevel.LOG_INFO;
        this._logger.warn(
          "CNShell",
          `LogLevel ${logLevel} is unknown. Setting level to INFO.`,
        );
        break;
    }
  }

  static get CNLogLevel(): typeof CNLogger.CNLogLevel {
    return CNLogger.CNLogLevel;
  }

  static get CNExtension(): typeof CNExtension {
    return CNExtension;
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

  get app() {
    return this._app;
  }

  get logger() {
    return this._logger;
  }

  // Setters here
  set level(level: any) {
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
        // Do a soft stop so we don't force any testing code to exit
        await this.exit(false);
        return;
      }

      await this.exit();
    }

    this._logger.info("CNShell", "Initialising HTTP interface ...");

    this._app.use(this._router.routes());

    let httpif: string = this.getCfg(
      CFG_HTTP_INTERFACE,
      DEFAULT_HTTP_INTERFACE,
    );
    let port: string = this.getCfg(CFG_HTTP_PORT, DEFAULT_HTTP_PORT);

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

  // http koa help methods here
  staticResponseRoute(path: string, response: string): void {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    this.info(`Adding static response route on path ${path}`);

    this._router.get(path, async (ctx, next) => {
      ctx.status = 200;
      ctx.type = "application/json; charset=utf-8";
      ctx.body = JSON.stringify(response);
      await next();
    });
  }

  uploadSingleFileRoute(
    path: string,
    fieldName: string,
    cb: (file: string) => void,
    maxFileSize: number = 1024 * 1024 * 4,
    dest: string = "/tmp",
  ) {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    this.info(`Adding single file upload route on path ${path}`);

    let multer = koaMulter({ dest: dest, limits: { fileSize: maxFileSize } });

    this._router.post(path, async (ctx: any, next) => {
      await multer.single(fieldName)(ctx, next);
      let response = await cb(ctx.req.file.path);

      ctx.status = 200;

      if (response !== undefined) {
        ctx.type = "application/json; charset=utf-8";
        ctx.body = JSON.stringify(response);
      }

      await next();
    });
  }

  async sendChunkedArray(ctx: Koa.Context, data: object[]) {
    return new Promise(resolve => {
      let body = new Readable();
      body._read = function() {};

      ctx.type = "application/json; charset=utf-8";
      ctx.body = body;

      body.push("[\n");

      let i = 0;
      let cb = async () => {
        while (i < data.length) {
          body.push(JSON.stringify(data[i]));
          if (i !== data.length - 1) {
            body.push(",\n");
          } else {
            body.push("\n");
          }

          i++;

          if (i % this._httpMaxSendRowsLimit === 0) {
            setImmediate(cb);
            return;
          }
        }

        body.push("]");
        body.push(null);
        resolve();
      };

      cb();
    });
  }

  createRoute(path: string, cb: (body: object) => Promise<number>): void {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    this.info(`Adding create route on path ${path}`);

    this._router.post(path, async (ctx, next) => {
      let id = await cb(ctx.request.body);

      ctx.set("Location", `${ctx.origin}${ctx.url}/${id}`);
      ctx.status = 201;

      await next();
    });
  }

  readRoute(
    path: string,
    cb: (query: string[], accepts: string, id?: string) => any,
    id?: string,
  ): void {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    if (id !== undefined) {
      path = `${path}/:${id}`;
    }

    this.info(`Adding read route on path ${path}`);

    this._router.get(path, async (ctx, next) => {
      let accepts = ctx.accepts(ACCEPT_CONTENT_TYPES);
      let data: any;

      if (typeof accepts === "boolean") {
        ctx.status = 406;
        await next();
        return;
      }

      data = await cb(
        ctx.query,
        accepts,
        id !== undefined ? ctx.params[id] : undefined,
      );

      switch (accepts) {
        case HTTP_CONTENT_TYPE_XLSX:
          ctx.type = HTTP_CONTENT_TYPE_XLSX;
          ctx.set("Content-Disposition", `attachment; filename=${data.name}`);

          ctx.status = 200;
          ctx.body = data.buffer;
          break;

        case HTTP_CONTENT_TYPE_JSON:
          ctx.type = "application/json; charset=utf-8";

          if (Array.isArray(data) && data.length > this._httpMaxSendRowsLimit) {
            ctx.set("Transfer-Encoding", "chunked");
            await this.sendChunkedArray(ctx, data);
          } else {
            ctx.status = 200;
            ctx.body = JSON.stringify(data);
          }

          break;
        default:
          ctx.status = 406;
      }

      await next();
    });
  }

  updateRoute(
    path: string,
    cb: (body: any, id?: string) => void,
    id?: string,
  ): void {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    if (id !== undefined) {
      path = `${path}/:${id}`;
    }

    this.info(`Adding update route on path ${path}`);

    this._router.put(path, async (ctx, next) => {
      await cb(ctx.request.body, id !== undefined ? ctx.params[id] : undefined);

      ctx.status = 200;

      await next();
    });
  }

  deleteRoute(path: string, cb: (id?: string) => void, id?: string): void {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    if (id !== undefined) {
      path = `${path}/:${id}`;
    }

    this.info(`Adding delete route on path ${path}`);

    this._router.delete(path, async (ctx, next) => {
      await cb(id !== undefined ? ctx.params[id] : undefined);

      ctx.status = 200;

      await next();
    });
  }

  // Private methods here
  private addHealthCheckEndpoint(): void {
    let path = this.getCfg(CFG_HEALTHCHECK_PATH, DEFAULT_HEALTHCHECK_PATH);

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

export default CNShell;
