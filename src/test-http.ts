import CNShell from "./cn-shell";

class App1 extends CNShell {
  constructor(name: string) {
    super(name);
  }

  async start(): Promise<boolean> {
    this.startup("Hello!");
    this.debug("debug");
    this.trace("trace");
    this.warn("WARN");
    this.error("error");
    this.fatal("fatal");
    this.createRoute(
      "/create",
      async (_1, _2, headers, _4, ctx) => {
        this.info("%j", headers);
        if (headers["cookie"] !== undefined) {
          this.info("%j", this.parseCookies(headers["cookie"]));
        }
        ctx.cookies.set("create-cookie", undefined, {
          domain: "localhost",
          path: "/",
          maxAge: -1,
        });

        return "hello";
      },
      { done: { type: "boolean", required: true, allowed: [true] } },
      true,
    );

    this.simpleReadRoute(
      "/create",
      async (_1, query, _3, headers, ctx) => {
        this.info("%j", query);
        if (headers["cookie"] !== undefined) {
          this.info("%j", ctx.cookies.get("cookie"));
        }
        ctx.cookies.set("read-cookie", "123xABCabcyz", {
          domain: "localhost",
          path: "/",
          sameSite: "strict",
          maxAge: 10000000,
        });

        return "Create";
      },
      false,
      true,
    );

    this.simpleReadRoute(
      "/del",
      async (_1, query, _3, headers, ctx) => {
        this.info("%j", query);
        if (headers["cookie"] !== undefined) {
          this.info("%j", ctx.cookies.get("cookie"));
        }
        ctx.cookies.set("read-cookie", "123xABCabcyz", {
          domain: "localhost",
          path: "/",
          sameSite: "strict",
          maxAge: -1,
        });

        return "Del";
      },
      false,
      true,
    );

    this.simpleReadRoute(
      "/",
      async (_1, _2, _3, _4, ctx) => {
        this.info("%j", ctx.cookies.get("read-cookie"));

        return "Hello";
      },
      false,
      true,
    );

    this.updateRoute(
      "/update",
      async (_1, _2, _3, headers, _5, ctx) => {
        this.info("%j", headers);
        ctx.cookies.set("update-cookie", "123xyz", {
          domain: "localhost",
          path: "/",
        });

        return "hello";
      },
      false,
      undefined,
      true,
    );

    this.updateRoute(
      "/patch",
      async () => {
        return { hello: "patch" };
      },
      false,
      undefined,
      true,
      undefined,
      true,
    );
    return true;
  }

  async stop(): Promise<void> {}

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

async function runTests() {
  let app = new App1("CfgTestsOK");
  await app.init(true);
}

runTests();
