// imports here
import { CNLogger } from "./cn-logger";
import { CNLoggerConsole } from "./cn-logger-console";

import Koa from "koa";
import KoaRouter from "koa-router";
import koaCompress from "koa-compress";

// import koaHelmet from "koa-helmet";
import cors from "@koa/cors";

import koaBodyparser from "koa-bodyparser";
// import koaMulter from "@koa/multer";

import axios, { AxiosInstance } from "axios";

import { Readable } from "stream";
import * as http from "http";
import https from "https";
import fs from "fs";
import os from "os";

import { promises as fsPromises } from "fs";
import path from "path";

import minimist from "minimist";

// Config consts here
const CFG_LOGGER = "LOGGER";
const CFG_LOG_LEVEL = "LOG_LEVEL";
const CFG_LOG_TIMESTAMP = "LOG_TIMESTAMP";
const CFG_LOG_TIMESTAMP_FORMAT = "LOG_TIMESTAMP_FORMAT";

const CFG_HTTP_DISABLE = "HTTP_DISABLE";
const CFG_HTTP_KEEP_ALIVE_TIMEOUT = "HTTP_KEEP_ALIVE_TIMEOUT";
const CFG_HTTP_HEADER_TIMEOUT = "HTTP_HEADER_TIMEOUT";
const CFG_HTTP_PORT = "HTTP_PORT";
const CFG_HTTP_INTERFACE = "HTTP_INTERFACE";
const CFG_USE_HTTPS = "USE_HTTPS";
const CFG_HTTPS_KEY = "HTTPS_KEY_FILE";
const CFG_HTTPS_CERT = "HTTPS_CERT_FILE";
const CFG_ALLOW_SELF_SIGNED_CERTS = "ALLOW_SELF_SIGNED_CERTS";
const CFG_HEALTHCHECK_PATH = "HEALTHCHECK_PATH";
const CFG_HTTP_ENABLE_CORS = "HTTP_ENABLE_CORS"; // For public interface
const CFG_HTTP_PRIVATE_ENABLE_CORS = "HTTP_PRIVATE_ENABLE_CORS"; // For private
const CFG_HTTP_ENABLE_COMPRESSION = "HTTP_ENABLE_COMPRESSION";
// const CFG_CORS_ORIGIN = "HTTP_CORS_ORIGIN";

// Config defaults here
const DEFAULT_LOGGER = "CONSOLE";
const DEFAULT_LOG_LEVEL = "INFO";
const DEFAULT_LOG_TIMESTAMP = "N";

const DEFAULT_HTTP_DISABLE = "N";
const DEFAULT_HTTP_KEEP_ALIVE_TIMEOUT = "65000";
const DEFAULT_HTTP_HEADER_TIMEOUT = "66000";
const DEFAULT_HTTP_PORT = "8000";
const DEFAULT_USE_HTTPS = "Y";
const DEFAULT_ALLOW_SELF_SIGNED_CERTS = "N";
const DEFAULT_HTTP_ENABLE_COMPRESSION = "Y";

const DEFAULT_HEALTHCHECK_PATH = "/healthcheck";

// HTTP content type consts here
const HTTP_CONTENT_TYPE_JSON = "application/json";
const HTTP_CONTENT_TYPE_TEXT = "text/plain";
const HTTP_CONTENT_TYPE_XLSX =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const ACCEPT_CONTENT_TYPES = [HTTP_CONTENT_TYPE_JSON, HTTP_CONTENT_TYPE_XLSX];

const ID_PARAM = "ID";

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
    allowEmpty?: boolean;
    default?: any;
    allowed?: any;
    pattern?: HttpPropsPattern; // If the type is an "object"
  };
}

export class HttpRedirect {
  public status: number;
  public url: string;

  constructor(status: number, url: string) {
    this.status = status;
    this.url = url;
  }
}

export { Context } from "koa";

export { CNLogger };

export class CNReadDataDetails {
  public contentType: string;
  public data: any;

  constructor(contentType: string, data: any) {
    this.contentType = contentType;
    this.data = data;
  }
}

export type CNCtx = Koa.ParameterizedContext<
  any,
  KoaRouter.IRouterParamContext<any, {}>,
  any
>;

// CNShell class here
abstract class CNShell {
  // Properties here
  protected readonly _master: CNShell | undefined;

  private readonly _name: string;
  private readonly _version: string;
  private _httpMaxSendRowsLimit: number;
  private _logger: CNLogger;

  private _publicApp: Koa;
  private _publicRouter: KoaRouter;
  private _publicServer: http.Server | undefined;
  private _privateApp: Koa;
  private _privateRouter: KoaRouter;
  private _privateServer: http.Server | undefined;
  private _axios: AxiosInstance;

  private _healthCheckPath: string;
  private _minimist: minimist.ParsedArgs;

  private _httpDisabled: boolean;

  // Constructor here
  constructor(name: string, master?: CNShell) {
    this._master = master;
    this._name = name;
    this._version = version;

    this._minimist = minimist(process.argv.slice(2));

    let logTimestampSetting = this.getCfg(
      CFG_LOG_TIMESTAMP,
      DEFAULT_LOG_TIMESTAMP,
    );
    let logTimestamps =
      logTimestampSetting.toUpperCase() === "Y" ? true : false;

    let logTimestampFormat: string = this.getCfg(CFG_LOG_TIMESTAMP_FORMAT, "");

    let logger: string = this.getCfg(CFG_LOGGER, DEFAULT_LOGGER);
    switch (logger.toUpperCase()) {
      case "CONSOLE":
        this._logger = new CNLoggerConsole(
          name,
          logTimestamps,
          logTimestampFormat,
        );
        break;
      default:
        // If we don't know the specified logger then use the console logger
        this._logger = new CNLoggerConsole(
          name,
          logTimestamps,
          logTimestampFormat,
        );
        break;
    }

    this._logger.start();

    let logLevel: string = this.getCfg(CFG_LOG_LEVEL, DEFAULT_LOG_LEVEL);

    switch (logLevel.toUpperCase()) {
      case "SILENT":
        this._logger.level = CNLogger.CNLogLevel.LOG_COMPLETE_SILENCE;
        break;
      case "QUIET":
        this._master = master;
        this._name = name;
        this._version = version;

        this._logger.level = CNLogger.CNLogLevel.LOG_QUIET;
        break;
      case "INFO":
        this._logger.level = CNLogger.CNLogLevel.LOG_INFO;
        break;
      case "STARTUP":
        this._logger.level = CNLogger.CNLogLevel.LOG_START_UP;
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

    let allow = this.getCfg(
      CFG_ALLOW_SELF_SIGNED_CERTS,
      DEFAULT_ALLOW_SELF_SIGNED_CERTS,
    );

    if (allow.toUpperCase() === "Y") {
      this.startup("Allowing self signed certs!");

      this._axios = axios.create({
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
        }),
      });
    } else {
      this.startup("Not allowing self signed certs!");

      this._axios = axios.create();
    }

    this._httpMaxSendRowsLimit = 1000;

    let disableHttp = this.getCfg(CFG_HTTP_DISABLE, DEFAULT_HTTP_DISABLE);
    if (disableHttp.toUpperCase() === "Y") {
      this._httpDisabled = true;
    } else {
      this._httpDisabled = false;
    }

    if (master === undefined) {
      let enableCors = this.getCfg(CFG_HTTP_ENABLE_CORS);
      let enableCompress = this.getCfg(
        CFG_HTTP_ENABLE_COMPRESSION,
        DEFAULT_HTTP_ENABLE_COMPRESSION,
      );

      this._publicApp = new Koa();
      if (enableCors.toUpperCase() === "Y") {
        this._publicApp.use(cors());
      }

      if (enableCompress.toUpperCase() === "Y") {
        this._publicApp.use(koaCompress());
      }

      this._publicRouter = new KoaRouter();

      // this._app.use(koaHelmet());
      this._publicApp.use(koaBodyparser());

      this._privateApp = new Koa();

      let enablePrivateCors = this.getCfg(CFG_HTTP_PRIVATE_ENABLE_CORS);

      if (enablePrivateCors.toUpperCase() === "Y") {
        this._privateApp.use(cors());
      }

      if (enableCompress.toUpperCase() === "Y") {
        this._privateApp.use(koaCompress());
      }

      this._privateRouter = new KoaRouter();

      // this._app.use(koaHelmet());
      this._privateApp.use(koaBodyparser());
    } else {
      this._publicRouter = master.publicRouter;
      this._privateRouter = master.privateRouter;
    }
  }

  static get CNLogLevel(): typeof CNLogger.CNLogLevel {
    return CNLogger.CNLogLevel;
  }

  // Abstract methods here
  abstract start(): Promise<boolean>;
  abstract stop(): Promise<void>;
  abstract healthCheck(): Promise<boolean>;

  // Static getters here
  static get idParam(): string {
    return ID_PARAM;
  }

  // Getters here
  get name(): string {
    return this._name;
  }

  get version() {
    return this._version;
  }

  get publicRouter() {
    return this._publicRouter;
  }

  get privateRouter() {
    return this._privateRouter;
  }

  get publicApp() {
    return this._publicApp;
  }

  get privateApp() {
    return this._privateApp;
  }

  get logger() {
    return this._logger;
  }

  get httpReq(): AxiosInstance {
    return this._axios;
  }

  get healthCheckPath() {
    return this._healthCheckPath;
  }

  get httpDisabled() {
    return this._httpDisabled;
  }

  // Setters here
  set level(level: any) {
    this._logger.level = level;
  }

  // Private methods here
  private initHttp(): void {
    this.addHealthCheckEndpoint();

    this.startup("Initialising HTTP interfaces ...");

    this._publicApp.use(this._publicRouter.routes());
    this._privateApp.use(this._privateRouter.routes());

    let httpif = this.getCfg(CFG_HTTP_INTERFACE);
    let port = this.getCfg(CFG_HTTP_PORT, DEFAULT_HTTP_PORT);
    let useHttps = this.getCfg(CFG_USE_HTTPS, DEFAULT_USE_HTTPS);

    if (httpif !== undefined && httpif.length) {
      this.startup(`Finding IP for interface (${httpif})`);

      let ifaces = os.networkInterfaces();
      this.startup("Interfaces on host: %j", ifaces);

      if (ifaces[httpif] === undefined) {
        throw new Error(`${httpif} is not an interface on this server`);
      }

      let ip = "";

      for (let i of ifaces[httpif]) {
        if (i.family === "IPv4") {
          ip = i.address;
          this.startup(`Found IP (${ip}) for interface ${httpif}`);
          this.startup(`Will listen on interface ${httpif} (IP: ${ip})`);

          break;
        }
      }

      if (ip.length === 0) {
        throw new Error(`${httpif} is not an interface on this server`);
      }

      if (useHttps.toUpperCase() === "Y") {
        this.startup(`Attempting to listen on (https://${ip}:${port})`);

        let keyfile = this.getRequiredCfg(CFG_HTTPS_KEY);
        let certFile = this.getRequiredCfg(CFG_HTTPS_CERT);

        const options = {
          key: fs.readFileSync(keyfile),
          cert: fs.readFileSync(certFile),
        };

        this._publicServer = https
          .createServer(options, this._publicApp.callback())
          .listen(parseInt(port, 10), ip);
      } else {
        this.startup(`Attempting to listen on (http://${ip}:${port})`);

        this._publicServer = http
          .createServer(this._publicApp.callback())
          .listen(parseInt(port, 10), ip);
      }

      // NOTE: The default node keep alive is 5 secs. This needs to be set
      // higher then any load balancers in front of this CNA
      let keepAlive = this.getCfg(
        CFG_HTTP_KEEP_ALIVE_TIMEOUT,
        DEFAULT_HTTP_KEEP_ALIVE_TIMEOUT,
      );

      this._publicServer.keepAliveTimeout = parseInt(keepAlive, 10);

      // NOTE: There is a potential race condition and the recommended
      // solution is to make the header timeouts greater then the keep alive
      // timeout. See - https://github.com/nodejs/node/issues/27363
      let timeout = this.getCfg(
        CFG_HTTP_HEADER_TIMEOUT,
        DEFAULT_HTTP_HEADER_TIMEOUT,
      );

      this._publicServer.headersTimeout = parseInt(timeout, 10);
    }

    this.startup(`Attempting to listen on (http://127.0.0.1:${port})`);
    this._privateServer = this._privateApp.listen(
      parseInt(port, 10),
      "127.0.0.1",
    );

    this.startup("Now listening!");
  }

  // Public methods here

  // This method is only for a CN App - don't call for a CN extension
  async init(testing?: boolean) {
    this.startup("Initialising ...");
    this.startup(`CN-Shell Version (${this._version})`);
    this.startup(`NODE_ENV (${NODE_ENV})`);

    // Check if we are the master
    if (this._master === undefined) {
      if (this._httpDisabled) {
        this.startup(
          "HTTP has been disabled. Not initialising HTTP interfaces",
        );
      } else {
        this.initHttp();
      }
    }

    this.startup("Attempting to start application ...");
    let started = await this.start().catch(e => {
      this.error(e);
    });

    if (started === undefined || !started) {
      this.error("Heuston, we have a problem. Shutting down now ...");

      if (testing) {
        // Do a soft stop so we don't force any testing code to exit
        await this.exit(false);
        return;
      }

      await this.exit();
    }

    if (this._master === undefined) {
      this.startup("Setting up event handler for SIGINT and SIGTERM");
      process.on("SIGINT", async () => await this.exit());
      process.on("SIGTERM", async () => await this.exit());

      this.startup("Ready to Rock and Roll baby!");
    }
  }

  async exit(hard: boolean = true): Promise<void> {
    this.startup("Exiting ...");

    if (this._publicServer !== undefined) {
      this.startup("Closing public HTTP port on server now ...");
      this._publicServer.close();
      this.startup("Port closed");
    }

    if (this._privateServer !== undefined) {
      this.startup("Closing private HTTP port on server now ...");
      this._privateServer.close();
      this.startup("Port closed");
    }

    this.startup("Attempting to stop application ...");
    await this.stop().catch(e => {
      this.error(e);
    });

    this.startup("So long and thanks for all the fish!");

    this._logger.stop();

    if (hard) {
      process.exit();
    }
  }

  getCfg(
    config: string,
    defaultVal = "",
    silent = false,
    redact = false,
  ): string {
    let evar = `CNA_${config.toUpperCase()}`;
    let value = process.env[evar];

    // If env var doesn't exist then return the default value
    if (value === undefined) {
      value = defaultVal;
    }

    if (
      this._logger !== undefined &&
      silent === false &&
      this._logger.started
    ) {
      this.startup("Config (%s) = (%s)", evar, redact ? "redacted" : value);
    }

    return value;
  }

  getRequiredCfg(config: string, silent = false, redact = false): string {
    let evar = `CNA_${config.toUpperCase()}`;
    let value = process.env[evar];

    if (
      this._logger !== undefined &&
      silent === false &&
      this._logger.started
    ) {
      this.startup("Config (%s) = (%s)", evar, redact ? "redacted" : value);
    }

    if (value === undefined) {
      throw Error(
        `Config parameter (CNA_${config.toUpperCase()}) was not set!`,
      );
    }

    return value;
  }

  getCmdLineParam(param: string, defaultVal = "", silent = false): any {
    let value = this._minimist[param];

    // If param doesn't exist then return the default value
    if (value === undefined) {
      value = defaultVal;
    }

    if (
      this._logger !== undefined &&
      silent === false &&
      this._logger.started
    ) {
      this.startup("CLI parameter (%s) = (%s)", param, value);
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

  startup(...args: any): void {
    this._logger.startup(...args);
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

      if (
        pattern[name].required &&
        (value === undefined || (value === "" && !pattern[name].allowEmpty))
      ) {
        let error: HttpError = {
          status: 400,
          message: `Missing required field '${name}'`,
        };

        throw error;
      }

      if (value === undefined || value === null) {
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

    return found;
  }

  checkAuthZHeaders(
    checks: { [key: string]: string[] },
    headers: any,
  ): boolean {
    // Step through each header
    for (let header in checks) {
      // Check if the header DOES NOT exsist
      if (headers[header] === undefined) {
        this.error("Could not find AuthZ header (%s) in the headers", header);
        return false;
      }

      // Check if the request header DOES NOT contain a valid value
      if (checks[header].includes(headers[header]) === false) {
        this.error(
          "AuthZ header (%s) was this (%s) which did not match any of these values (%j)",
          header,
          headers[header],
          checks[header],
        );
        return false;
      }
    }

    // Everything looks peachy, return OK
    return true;
  }

  staticResponseRoute(
    path: string,
    response: string,
    isPrivate: boolean = false,
    authZHeaders?: {
      [key: string]: string[];
    },
  ): void {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    this.startup(
      `Adding static response route on ${
        isPrivate ? "private" : "public"
      } path ${path}`,
    );

    let router = isPrivate ? this._privateRouter : this._publicRouter;

    router.get(path, async (ctx, next) => {
      if (
        authZHeaders !== undefined &&
        this.checkAuthZHeaders(authZHeaders, ctx.headers) === false
      ) {
        ctx.status = 401;
        await next();
        return;
      }

      ctx.status = 200;
      ctx.type = "application/json; charset=utf-8";
      ctx.body = JSON.stringify(response);
      await next();
    });
  }

  // uploadSingleFileRoute(
  //   path: string,
  //   fieldName: string,
  //   cb: (file: string) => void,
  //   maxFileSize: number = 1024 * 1024 * 4,
  //   dest: string = "/tmp",
  //   isPrivate: boolean = false,
  // ) {
  //   path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

  //   this.startup(
  //     `Adding single file upload route on ${
  //       isPrivate ? "private" : "public"
  //     } path ${path}`,
  //   );

  //   let multer = koaMulter({ dest: dest, limits: { fileSize: maxFileSize } });

  //   let router = isPrivate ? this._privateRouter : this._publicRouter;

  //   router.post(path, async (ctx: any, next) => {
  //     await multer.single(fieldName)(ctx, next);
  //     let response = await cb(ctx.req.file.path);

  //     ctx.status = 200;

  //     if (response !== undefined) {
  //       ctx.type = "application/json; charset=utf-8";
  //       ctx.body = JSON.stringify(response);
  //     }

  //     await next();
  //   });
  // }

  async sendChunkedArray(
    ctx: Koa.BaseContext,
    data: { [key: string]: any }[],
  ): Promise<void> {
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

  parseCookies(cookieString: string) {
    if (cookieString === "") return {};

    // split the cookies into pairs
    let pairs = cookieString.split(";");

    // Now split each oair into key/value pairs
    let splittedPairs = pairs.map(cookie => cookie.split("="));

    // Create an object with all key-value pairs
    const cookieObj = splittedPairs.reduce(
      (obj: { [key: string]: string }, cookie) => {
        // cookie[0] is the cookir name, cookie[1] is the cookie value
        obj[decodeURI(cookie[0].trim())] = decodeURIComponent(cookie[1].trim());

        return obj;
      },
      {},
    );

    return cookieObj;
  }

  createRoute(
    path: string,
    cb: (
      body: { [key: string]: any },
      params: any,
      headers: any,
      query: { [key: string]: string | string[] },
      ctx: CNCtx,
    ) => Promise<any>,
    pattern?: HttpPropsPattern,
    isPrivate: boolean = false,
    authZHeaders?: {
      [key: string]: string[];
    },
  ): void {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    this.startup(
      `Adding create route on ${isPrivate ? "private" : "public"} path ${path}`,
    );

    let router = isPrivate ? this._privateRouter : this._publicRouter;

    router.post(path, async (ctx, next) => {
      if (
        authZHeaders !== undefined &&
        this.checkAuthZHeaders(authZHeaders, ctx.headers) === false
      ) {
        ctx.status = 401;
        await next();
        return;
      }

      let exception = false;
      let props = <{ [key: string]: any }>ctx.request.body;

      if (pattern !== undefined) {
        try {
          props = this.checkProps(
            <{ [key: string]: any }>ctx.request.body,
            pattern,
          );
        } catch (err) {
          let e = <HttpError>err;

          // Check to see if this is a HttpError
          if (e.status !== undefined && e.message !== undefined) {
            ctx.status = e.status;
            ctx.body = e.message;
          } else {
            ctx.status = 503;
            ctx.body = "Unknown error occured";

            this.error("%j", e);
          }
          ctx.type = "text/plain; charset=utf-8";
          exception = true;
        }
      }

      if (exception) {
        await next();
        return;
      }

      let data = await cb(props, ctx.params, ctx.headers, ctx.query, ctx).catch(
        (e: HttpError) => {
          ctx.status = e.status;
          ctx.body = e.message;
          ctx.type = "text/plain; charset=utf-8";

          exception = true;
        },
      );

      if (exception) {
        await next();
        return;
      }

      if (typeof data === "string" && data.length) {
        // An ID was returned - set the Location header
        ctx.set("Location", `${ctx.origin}${ctx.path}/${data}`);
        ctx.status = 201;
      } else if (data instanceof HttpRedirect) {
        ctx.status = data.status;
        ctx.redirect(data.url);
      } else {
        if (typeof data === "object") {
          ctx.type = "application/json; charset=utf-8";
          ctx.body = JSON.stringify(data);
          ctx.status = 200;
        } else {
          ctx.status = 204;
        }
      }

      await next();
    });
  }

  readRoute(
    path: string,
    cb: (
      id: string,
      query: { [key: string]: string | string[] },
      accepts: string,
      params: any,
      headers: any,
      ctx: CNCtx,
    ) => Promise<any>,
    id: boolean = true,
    isPrivate: boolean = false,
    authZHeaders?: {
      [key: string]: string[];
    },
  ): void {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    if (id) {
      path = `${path}/:${CNShell.idParam}`;
    }

    this.startup(
      `Adding read route on ${isPrivate ? "private" : "public"} path ${path}`,
    );

    let router = isPrivate ? this._privateRouter : this._publicRouter;

    router.get(path, async (ctx, next) => {
      if (
        authZHeaders !== undefined &&
        this.checkAuthZHeaders(authZHeaders, ctx.headers) === false
      ) {
        ctx.status = 401;
        await next();
        return;
      }
      let accepts = ctx.accepts(ACCEPT_CONTENT_TYPES);
      let data: any;

      if (typeof accepts === "boolean") {
        ctx.status = 406;
        await next();
        return;
      }

      data = await cb(
        ctx.params[CNShell.idParam],
        ctx.query,
        accepts,
        ctx.params,
        ctx.headers,
        ctx,
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

  simpleReadRoute(
    path: string,
    cb: (
      id: string,
      query: { [key: string]: string | string[] },
      params: any,
      headers: any,
      ctx: CNCtx,
    ) => Promise<any>,
    id: boolean = true,
    isPrivate: boolean = false,
    authZHeaders?: {
      [key: string]: string[];
    },
    contentType?: string,
  ): void {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    if (id) {
      path = `${path}/:${CNShell.idParam}`;
    }

    this.startup(
      `Adding simple read route on ${
        isPrivate ? "private" : "public"
      } path ${path}`,
    );

    let router = isPrivate ? this._privateRouter : this._publicRouter;

    router.get(path, async (ctx, next) => {
      if (
        authZHeaders !== undefined &&
        this.checkAuthZHeaders(authZHeaders, ctx.headers) === false
      ) {
        ctx.status = 401;
        await next();
        return;
      }

      let noException = true;

      let data = await cb(
        ctx.params[CNShell.idParam],
        ctx.query,
        ctx.params,
        ctx.headers,
        ctx,
      ).catch((e: HttpError) => {
        ctx.status = e.status;
        ctx.body = e.message;
        ctx.type = "text/plain; charset=utf-8";

        noException = false;
      });

      // Check if there was no exception caught
      if (noException) {
        if (data instanceof CNReadDataDetails) {
          ctx.body = data.data;
          ctx.type = data.contentType;
        } else if (data instanceof HttpRedirect) {
          ctx.status = data.status;
          ctx.redirect(data.url);
        } else if (
          Array.isArray(data) &&
          data.length > this._httpMaxSendRowsLimit
        ) {
          ctx.set("Transfer-Encoding", "chunked");
          await this.sendChunkedArray(ctx, data);
        } else {
          ctx.status = 200;

          if (
            contentType === undefined ||
            contentType === HTTP_CONTENT_TYPE_JSON
          ) {
            ctx.body = JSON.stringify(data);
            ctx.type = `${HTTP_CONTENT_TYPE_JSON}; charset=utf-8`;
          } else if (contentType === HTTP_CONTENT_TYPE_TEXT) {
            ctx.body = data;
            ctx.type = `${HTTP_CONTENT_TYPE_TEXT}; charset=utf-8`;
          } else {
            ctx.body = data;
            ctx.type = contentType;
          }
        }
      }

      await next();
    });
  }

  updateRoute(
    path: string,
    cb: (
      body: any,
      id: string,
      params: any,
      headers: any,
      query: { [key: string]: string | string[] },
      ctx: CNCtx,
    ) => Promise<any>,
    id: boolean = true,
    pattern?: HttpPropsPattern,
    isPrivate: boolean = false,
    authZHeaders?: {
      [key: string]: string[];
    },
    patch?: boolean,
  ): void {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    if (id) {
      path = `${path}/:${CNShell.idParam}`;
    }

    this.startup(
      `Adding update route on ${isPrivate ? "private" : "public"} path ${path}`,
    );

    let router = isPrivate ? this._privateRouter : this._publicRouter;

    let method = router.put;

    if (patch) {
      method = router.patch;
    }

    // Make sure to bind method to router
    let bound = method.bind(router);

    bound(path, async (ctx, next) => {
      if (
        authZHeaders !== undefined &&
        this.checkAuthZHeaders(authZHeaders, ctx.headers) === false
      ) {
        ctx.status = 401;
        await next();
        return;
      }

      let exception = false;
      let props = <{ [key: string]: any }>ctx.request.body;

      if (pattern !== undefined) {
        try {
          props = this.checkProps(
            <{ [key: string]: any }>ctx.request.body,
            pattern,
          );
        } catch (err) {
          let e = <HttpError>err;

          // Check to see if this is a HttpError
          if (e.status !== undefined && e.message !== undefined) {
            ctx.status = e.status;
            ctx.body = e.message;
          } else {
            ctx.status = 503;
            ctx.body = "Unknown error occured";

            this.error("%j", e);
          }

          ctx.type = "text/plain; charset=utf-8";

          exception = true;
        }
      }

      if (exception) {
        await next();
        return;
      }

      let data = await cb(
        props,
        ctx.params[CNShell.idParam],
        ctx.params,
        ctx.headers,
        ctx.query,
        ctx,
      ).catch(err => {
        let e = <HttpError>err;

        // Check to see if this is a HttpError
        if (e.status !== undefined && e.message !== undefined) {
          ctx.status = e.status;
          ctx.body = e.message;
        } else {
          ctx.status = 503;
          ctx.body = "Unknown error occured";

          this.error("%j", e);
        }

        ctx.type = "text/plain; charset=utf-8";

        exception = true;
      });

      if (exception) {
        await next();
        return;
      }

      if (typeof data === "object") {
        ctx.type = "application/json; charset=utf-8";
        ctx.body = JSON.stringify(data);
        ctx.status = 200;
      } else {
        ctx.status = 204;
      }

      await next();
    });
  }

  deleteRoute(
    path: string,
    cb: (
      id: string,
      params: any,
      headers: any,
      query: { [key: string]: string | string[] },
      ctx: CNCtx,
    ) => Promise<void>,
    id: boolean = true,
    isPrivate: boolean = false,
    authZHeaders?: {
      [key: string]: string[];
    },
  ): void {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    if (id) {
      path = `${path}/:${CNShell.idParam}`;
    }

    this.startup(
      `Adding delete route on ${isPrivate ? "private" : "public"} path ${path}`,
    );

    let router = isPrivate ? this._privateRouter : this._publicRouter;

    router.delete(path, async (ctx, next) => {
      if (
        authZHeaders !== undefined &&
        this.checkAuthZHeaders(authZHeaders, ctx.headers) === false
      ) {
        ctx.status = 401;
        await next();
        return;
      }

      let noException = true;

      await cb(
        ctx.params[CNShell.idParam],
        ctx.params,
        ctx.headers,
        ctx.query,
        ctx,
      ).catch((e: HttpError) => {
        ctx.status = e.status;
        ctx.body = e.message;
        ctx.type = "text/plain; charset=utf-8";

        noException = false;
      });

      // Check if there was no exception caught
      if (noException) {
        ctx.status = 204;
      }

      await next();
    });
  }

  // File helper methods here
  async getAllFiles(dir: string): Promise<string[]> {
    let files: string[] = [];

    const list = await fsPromises.readdir(dir);
    for (let f of list) {
      const file = path.join(dir, f);
      const stat = await fsPromises.stat(file);

      if (stat.isDirectory()) {
        let newFiles = await this.getAllFiles(file);
        files = files.concat(newFiles);
      } else {
        files.push(file);
      }
    }

    return files;
  }

  // Private methods here
  private addHealthCheckEndpoint(): void {
    let path = this.getCfg(CFG_HEALTHCHECK_PATH, DEFAULT_HEALTHCHECK_PATH);
    this._healthCheckPath = path;

    this.startup(`Adding Health Check endpoint on ${path}`);

    this._publicRouter.get(path, async (ctx, next) => {
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

    this._privateRouter.get(path, async (ctx, next) => {
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
