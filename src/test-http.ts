import CNShell from "./cn-shell";

class App1 extends CNShell {
  constructor(name: string) {
    super(name);
  }

  async start(): Promise<boolean> {
    this.createRoute(
      "/create",
      async (_1, _2, headers, _4, ctx) => {
        this.info("%j", headers);
        this.info("%j", this.parseCookies(headers["cookie"]));
        ctx.cookies.set("create-cookie", "123xyz", {
          domain: "localhost",
          path: "/",
        });

        return "hello";
      },
      undefined,
      true,
    );

    this.simpleReadRoute(
      "/read",
      async (_1, _2, _3, headers, ctx) => {
        this.info("%j", headers);
        this.info("%j", this.parseCookies(headers["cookie"]));

        ctx.cookies.set("read-cookie", "123xyz", {
          domain: "localhost",
          path: "/",
        });

        return "hello";
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
