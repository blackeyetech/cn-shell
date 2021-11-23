import CNShell from "./cn-shell";

class App1 extends CNShell {
  constructor(name: string) {
    super(name);
  }

  async start(): Promise<boolean> {
    this.createRoute(
      "/create",
      async () => {
        return "1";
      },
      undefined,
      true,
    );

    this.updateRoute(
      "/update",
      async () => {
        return { hello: "update" };
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
