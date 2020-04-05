// imports here
import CNLogger from "./cn-logger";
import CNLoggerConsole from "./cn-logger-console";

import Koa from "koa";
import KoaRouter from "koa-router";

// import koaHelmet from "koa-helmet";
import koaBodyparser from "koa-bodyparser";
import koaMulter from "koa-multer";

import axios, { AxiosStatic } from "axios";

import { Readable } from "stream";
import * as http from "http";

// Config consts here
const CFG_LOGGER = "LOGGER";
const CFG_LOG_LEVEL = "LOG_LEVEL";

const CFG_HTTP_KEEP_ALIVE_TIMEOUT = "HTTP_KEEP_ALIVE_TIMEOUT";
const CFG_HTTP_PORT = "HTTP_PORT";
const CFG_HTTP_INTERFACE = "HTTP_INTERFACE";
const CFG_HTTP_LISTEN_LOCAL = "HTTP_LISTEN_LOCAL";
const CFG_HEALTHCHECK_PATH = "HEALTHCHECK_PATH";

// Config defaults here
const DEFAULT_LOGGER = "CONSOLE";
const DEFAULT_LOG_LEVEL = "INFO";

const DEFAULT_HTTP_KEEP_ALIVE_TIMEOUT = "65000";
const DEFAULT_HTTP_PORT = "8000";
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

// Interfaces here
export interface HttpError {
  status: number;
  message: string;
}

export interface HttpPropsPattern {
  [key: string]: {
    required: boolean;
    type: string;
    default?: any;
    allowed?: any;
    pattern?: HttpPropsPattern; // If the type is an "object"
  };
}

export { Context } from "koa";

// CNShell class here
abstract class CNShell {
  // Properties here
  private _master: CNShell | undefined;
  private readonly _name: string;
  private readonly _version: string;
  private _httpMaxSendRowsLimit: number;
  private _logger: CNLogger;
  private _listenLocal: boolean;

  private _app: Koa;
  private _router: KoaRouter;
  private _server: http.Server;
  private _serverLocal: http.Server;

  // Constructor here
  constructor(name: string, master?: CNShell) {
    this._master = master;

    this._name = name;
    this._version = version;
    this._httpMaxSendRowsLimit = 1000;

    let listenLocal: string = this.getCfg(CFG_HTTP_LISTEN_LOCAL);

    if (listenLocal === "Y") {
      this._listenLocal = true;
    } else {
      this._listenLocal = false;
    }

    let logger: string = this.getCfg(CFG_LOGGER, DEFAULT_LOGGER);
    switch (logger.toUpperCase()) {
      case "CONSOLE":
        this._logger = new CNLoggerConsole(name);
        break;
      default:
        this._logger = new CNLoggerConsole(name);
        this.warn(`Logger ${logger} is unknown. Using console logger.`);
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
          `LogLevel ${logLevel} is unknown. Setting level to INFO.`,
        );
        break;
    }

    if (master === undefined) {
      this._app = new Koa();
      this._router = new KoaRouter();
      // this._app.use(koaHelmet());
      this._app.use(koaBodyparser());
    } else {
      this._router = master.router;
    }
  }

  static get CNLogLevel(): typeof CNLogger.CNLogLevel {
    return CNLogger.CNLogLevel;
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

  get httpReq(): AxiosStatic {
    return axios;
  }

  // Setters here
  set level(level: any) {
    this._logger.level = level;
  }

  // Public methods here
  async init(testing?: boolean) {
    this.info("Initialising ...");
    this.info(`CN-Shell Version (${this._version})`);
    this.info(`NODE_ENV (${NODE_ENV})`);

    this.info("Setting up event handler for SIGINT and SIGTERM");
    process.on("SIGINT", async () => await this.exit());
    process.on("SIGTERM", async () => await this.exit());

    this.info("Attempting to start application ...");
    let started = await this.start().catch(e => {
      this.error(e);
    });

    if (!started) {
      this.info("Heuston, we have a problem. Shutting down now ...");

      if (testing) {
        // Do a soft stop so we don't force any testing code to exit
        await this.exit(false);
        return;
      }

      await this.exit();
    }

    if (this._master !== undefined) {
      this.info("We are not the master. Not initialising the HTTP interface!");
    } else {
      this.addHealthCheckEndpoint();

      this.info("Initialising HTTP interface ...");

      this._app.use(this._router.routes());

      let httpif = this.getCfg(CFG_HTTP_INTERFACE);
      let port = this.getCfg(CFG_HTTP_PORT, DEFAULT_HTTP_PORT);

      if (httpif !== undefined) {
        this.info(`Attempting to listen on (${httpif}:${port})`);
        this._server = this._app.listen(parseInt(port, 10), httpif);

        if (this._listenLocal) {
          this.info(`Attempting to listen on (127.0.0.1:${port})`);
          this._serverLocal = this._app.listen(parseInt(port, 10), "127.0.0.1");
        }
      } else {
        this.info(`Attempting to listen on (${port})`);
        this._server = this._app.listen(parseInt(port, 10));
      }

      // NOTE: The default node keep alive is 5 secs. This needs to be set
      // higher then any load balancers in front of this CNA
      let keepAlive = this.getCfg(
        CFG_HTTP_KEEP_ALIVE_TIMEOUT,
        DEFAULT_HTTP_KEEP_ALIVE_TIMEOUT,
      );

      this._server.keepAliveTimeout = parseInt(keepAlive, 10);

      this.info("Now listening!");
    }

    this.info("Ready to Rock and Roll baby!");
  }

  async exit(hard: boolean = true): Promise<void> {
    this.info("Exiting ...");

    if (this._server !== undefined) {
      this.info("Closing main HTTP port on server now ...");
      this._server.close();
      this.info("Port closed");

      if (this._listenLocal) {
        this.info("Closing local HTTP port on server now ...");
        this._serverLocal.close();
        this.info("Port closed");
      }
    }

    this.info("Attempting to stop application ...");
    await this.stop().catch(e => {
      this.error(e);
    });

    this.info("So long and thanks for all the fish!");

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

  force(...args: any): void {
    this._logger.force(...args);
  }

  // http help methods here
  checkProps(data: { [key: string]: any }, pattern: HttpPropsPattern): any {
    let found: { [key: string]: any } = {};

    for (let prop of Object.entries(pattern)) {
      let name = prop[0];
      let value = data[name] === undefined ? pattern[name].default : data[name];

      if ((value === undefined || value === "") && pattern[name].required) {
        let error: HttpError = {
          status: 400,
          message: `Missing required field '${name}'`,
        };

        throw error;
      }

      if (value === undefined) {
        continue;
      }

      // A typeof array === "object" so we have to use Array.isArray()
      if (
        (pattern[name].type !== "array" &&
          typeof value !== pattern[name].type) ||
        (pattern[name].type === "array" && Array.isArray(value) !== true)
      ) {
        let error: HttpError = {
          status: 400,
          message: `Type of '${name}' is ${typeof value} and it should be ${
            pattern[name].type
          }`,
        };

        throw error;
      }

      // Check if an object has a value of array which will return a typeof object
      if (pattern[name].type === "object" && Array.isArray(value) === true) {
        let error: HttpError = {
          status: 400,
          message: `Type of '${name}' is array and it should be object`,
        };

        throw error;
      }

      if (
        pattern[name].type !== "object" &&
        pattern[name].type !== "array" &&
        pattern[name].allowed !== undefined
      ) {
        if (Array.isArray(pattern[name].allowed)) {
          if (!pattern[name].allowed.includes(value)) {
            let msg = `'${name}' value '${value}' is not valid. `;
            msg += `Allowed values are [${pattern[name].allowed}]`;

            let error: HttpError = {
              status: 400,
              message: msg,
            };

            throw error;
          }
        } else {
          if (value !== pattern[name].allowed) {
            let msg = `'${name}' value '${value}' is not valid. `;
            msg += `Allowed value is '${pattern[name].allowed}'`;

            let error: HttpError = {
              status: 400,
              message: msg,
            };

            throw error;
          }
        }
      }

      if (pattern[name].type === "object") {
        if (pattern[name].pattern === undefined) {
          // No pattern mean no check so just copy the value as is
          found[name] = value;
        } else {
          // If the value is an object then apply it's pattern now
          found[name] = this.checkProps(
            value,
            <HttpPropsPattern>pattern[name].pattern,
          );
        }
      } else if (pattern[name].type === "array") {
        if (pattern[name].pattern === undefined) {
          // No pattern mean no check so just copy the value as is
          found[name] = value;
        } else {
          // We have to iterate through each value
          found[name] = [];

          for (let i = 0; i < value.length; i++) {
            found[name].push(
              this.checkProps(
                value[i],
                // Apply same pattern to all values in array
                <HttpPropsPattern>pattern[name].pattern,
              ),
            );
          }
        }
      } else {
        found[name] = value;
      }
    }

    this.debug("found: %j", found);

    return found;
  }

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

  async sendChunkedArray(ctx: Koa.Context, data: { [key: string]: any }[]) {
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

  createRoute(
    path: string,
    cb: (body: { [key: string]: any }) => Promise<string>,
    pattern?: HttpPropsPattern,
  ): void {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    this.info(`Adding create route on path ${path}`);

    this._router.post(path, async (ctx, next) => {
      let noException = true;
      let props: { [key: string]: any } = ctx.request.body;

      if (pattern !== undefined) {
        try {
          props = this.checkProps(ctx.request.body, pattern);
        } catch (e) {
          ctx.status = e.status;
          ctx.body = e.message;
          ctx.type = "text/plain; charset=utf-8";

          noException = false;
        }
      }

      if (noException) {
        let id = await cb(props).catch((e: HttpError) => {
          ctx.status = e.status;
          ctx.body = e.message;
          ctx.type = "text/plain; charset=utf-8";

          noException = false;
        });

        // Check if there was no exception caught
        if (noException) {
          if (typeof id === "string" && id.length) {
            ctx.set("Location", `${ctx.origin}${ctx.url}/${id}`);
            ctx.status = 201;
          } else {
            ctx.status = 200;
          }
        }
      }

      await next();
    });
  }

  readRoute(
    path: string,
    cb: (
      id: string,
      query: { [key: string]: string },
      accepts: string,
    ) => Promise<any>,
    id: boolean = true,
  ): void {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    if (id) {
      path = `${path}/:ID`;
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

      data = await cb(ctx.query, id ? ctx.params.ID : undefined, accepts);

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

  simpleReadRoute(
    path: string,
    cb: (id?: string, query?: { [key: string]: string }) => Promise<any>,
    id: boolean = true,
  ): void {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    if (id) {
      path = `${path}/:ID`;
    }

    this.info(`Adding simple read route on path ${path}`);

    this._router.get(path, async (ctx, next) => {
      let noException = true;

      let data = await cb(id ? ctx.params.ID : undefined, ctx.query).catch(
        (e: HttpError) => {
          ctx.status = e.status;
          ctx.body = e.message;
          ctx.type = "text/plain; charset=utf-8";

          noException = false;
        },
      );

      // Check if there was no exception caught
      if (noException) {
        if (Array.isArray(data) && data.length > this._httpMaxSendRowsLimit) {
          ctx.set("Transfer-Encoding", "chunked");
          await this.sendChunkedArray(ctx, data);
        } else {
          ctx.status = 200;
          ctx.body = JSON.stringify(data);
          ctx.type = "application/json; charset=utf-8";
        }
      }

      await next();
    });
  }

  updateRoute(
    path: string,
    cb: (body: any, id?: string) => Promise<void>,
    id: boolean = true,
    pattern: HttpPropsPattern,
  ): void {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    if (id) {
      path = `${path}/:ID`;
    }

    this.info(`Adding update route on path ${path}`);

    this._router.put(path, async (ctx, next) => {
      let noException = true;
      let props = ctx.request.body;

      if (pattern !== undefined) {
        try {
          props = this.checkProps(ctx.request.body, pattern);
        } catch (e) {
          ctx.status = e.status;
          ctx.body = e.message;
          ctx.type = "text/plain; charset=utf-8";

          noException = false;
        }
      }

      if (noException) {
        await cb(props, id ? ctx.params.ID : undefined).catch(
          (e: HttpError) => {
            ctx.status = e.status;
            ctx.body = e.message;
            ctx.type = "text/plain; charset=utf-8";

            noException = false;
          },
        );
      }

      // Check if there was no exception caught
      if (noException) {
        ctx.status = 200;
      }

      await next();
    });
  }

  deleteRoute(
    path: string,
    cb: (id?: string) => Promise<void>,
    id: boolean = true,
  ): void {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    if (id) {
      path = `${path}/:ID`;
    }

    this.info(`Adding delete route on path ${path}`);

    this._router.delete(path, async (ctx, next) => {
      let noException = true;

      await cb(id ? ctx.params.ID : undefined).catch((e: HttpError) => {
        ctx.status = e.status;
        ctx.body = e.message;
        ctx.type = "text/plain; charset=utf-8";

        noException = false;
      });

      // Check if there was no exception caught
      if (noException) {
        ctx.status = 200;
      }

      await next();
    });
  }

  // Private methods here
  private addHealthCheckEndpoint(): void {
    let path = this.getCfg(CFG_HEALTHCHECK_PATH, DEFAULT_HEALTHCHECK_PATH);

    this._logger.info(`Adding Health Check endpoint on ${path}`);

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
