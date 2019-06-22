"use strict";

const DEFAULT_PORT = "8000";
const DEFAULT_INTERFACE = "localhost";

const cnConfig = require("./cn-config.js");
const Koa = require("koa");
const KoaRouter = require("koa-router");

class UserError extends Error {
  constructor(msg) {
    super(msg);
    this.status = 400;
  }
}

class InternalError extends Error {
  constructor(msg) {
    super(msg);
    this.status = 500;
  }
}

class CNHttp {
  constructor(name, log) {
    this.name = name;

    this.log = log;

    this.app = new Koa();
    this.router = new KoaRouter();
  }

  start() {
    let httpif = cnConfig.get(this.name, "INTERFACE", DEFAULT_INTERFACE);
    let port = cnConfig.get(this.name, "PORT", DEFAULT_PORT);

    this.app.use(this.router.routes());

    this.log.info(`Starting to listening on (${httpif}:${port})`);
    this.server = this.app.listen(port, httpif);
    this.log.info("Now listening!");
  }

  stop() {
    this.log.info("Stopping ...");

    this.log.info("Closing port on server now ...");
    this.server.close();
    this.log.info("Port closed");

    this.log.info("Stopped!");
  }

  get UserError() {
    return UserError;
  }

  get InternalError() {
    return InternalError;
  }

  getBasicAuth(ctx) {
    let basic = ctx.header("Authorization");
    if (basic === undefined) {
      return null;
    }

    let parts = basic.split(/ +/);
    if (parts.length !== 2 || parts[0].toLowerCase() !== "basic") {
      return null;
    }

    let credentials = Buffer.from(parts[1], "base64").toString("ascii");

    // NOTE: There may be no password so length may be 1 or 2
    let pair = credentials.split(":");
    if (pair.length > 2) {
      return null;
    }

    let auth = {};
    auth.username = pair[0];

    if (pair.length === 2) {
      auth.password = pair[1];
    } else {
      auth.password = "";
    }

    return auth;
  }

  getCookies(ctx, next) {
    let cookieJar = {};
    //req[this.cookieJar] = cookieJar;

    let cookieList = ctx.header("Cookie");
    if (cookieList === undefined) {
      next();
      return;
    }

    for (let cookie of cookieList.split(/ *; */)) {
      let parts = cookie.split(/ *= */);
      if (parts.length === 2) {
        cookieJar[parts[0]] = parts[1].trim();
      }
    }

    next();
  }

  staticRoute(path, response) {
    this.log.info(`Adding static GET route on path ${path}`);

    this.router.get(path, async (ctx, next) => {
      ctx.status = 200;
      ctx.type = "application/json; charset=utf-8";
      ctx.body = JSON.stringify(response);
      await next();
    });
  }
}

module.exports = CNHttp;
