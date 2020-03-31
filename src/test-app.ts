import CNShell, { HttpPropsPattern } from "./cn-shell";

class App1 extends CNShell {
  constructor(name: string) {
    super(name);
  }

  async start(): Promise<boolean> {
    return true;
  }

  async stop(): Promise<void> {}

  async healthCheck(): Promise<boolean> {
    return true;
  }

  logging() {
    this.level = CNShell.CNLogLevel.LOG_INFO;
    this.info("Setting level to COMPLETE_SILENCE");
    this.info("You should see: forced");
    this.level = CNShell.CNLogLevel.LOG_COMPLETE_SILENCE;

    this.warn("You shouldn't see this");
    this.error("You shouldn't see this");
    this.fatal("You shouldn't see this");
    this.info("You shouldn't see this");
    this.debug("You shouldn't see this");
    this.trace("You shouldn't see this");
    this.force("You should see this");
    this.force("Done");

    this.level = CNShell.CNLogLevel.LOG_INFO;
    this.info("Setting level to QUIET");
    this.info("You should see: warn, error, fatal");
    this.level = CNShell.CNLogLevel.LOG_QUIET;

    this.warn("You should see this");
    this.error("You should see this");
    this.fatal("You should see this");
    this.info("You shouldn't see this");
    this.debug("You shouldn't see this");
    this.trace("You shouldn't see this");
    this.force("Done");

    this.level = CNShell.CNLogLevel.LOG_INFO;
    this.info("Setting level to INFO");
    this.info("You should see: warn, error, fatal, info");
    this.level = CNShell.CNLogLevel.LOG_INFO;

    this.warn("You should see this");
    this.error("You should see this");
    this.fatal("You should see this");
    this.info("You should see this");
    this.debug("You shouldn't see this");
    this.trace("You shouldn't see this");
    this.force("Done");

    this.level = CNShell.CNLogLevel.LOG_INFO;
    this.info("Setting level to DEBUG");
    this.info("You should see: warn, error, fatal, info, debug");
    this.level = CNShell.CNLogLevel.LOG_DEBUG;

    this.warn("You should see this");
    this.error("You should see this");
    this.fatal("You should see this");
    this.info("You should see this");
    this.debug("You should see this");
    this.trace("You shouldn't see this");
    this.force("Done");

    this.level = CNShell.CNLogLevel.LOG_INFO;
    this.info("Setting level to TRACE");
    this.info("You should see: warn, error, fatal, info, debug, trace");
    this.level = CNShell.CNLogLevel.LOG_TRACE;

    this.warn("You should see this");
    this.error("You should see this");
    this.fatal("You should see this");
    this.info("You should see this");
    this.debug("You should see this");
    this.trace("You should see this");
    this.force("Done");
  }

  logging_silence() {
    this.force("Setting level to COMPLETE_SILENCE");
    this.force("You should see: nothing");

    this.warn("You shouldn't see this");
    this.error("You shouldn't see this");
    this.fatal("You shouldn't see this");
    this.info("You shouldn't see this");
    this.debug("You shouldn't see this");
    this.trace("You shouldn't see this");
    this.force("Done");
  }

  logging_quiet() {
    this.force("Setting level to QUIET");
    this.force("You should see: warn, error, fatal");

    this.warn("You should see this");
    this.error("You should see this");
    this.fatal("You should see this");
    this.info("You shouldn't see this");
    this.debug("You shouldn't see this");
    this.trace("You shouldn't see this");
    this.force("Done");
  }

  logging_info() {
    this.force("Setting level to INFO");
    this.force("You should see: warn, error, fatal, info");

    this.warn("You should see this");
    this.error("You should see this");
    this.fatal("You should see this");
    this.info("You should see this");
    this.debug("You shouldn't see this");
    this.trace("You shouldn't see this");
    this.force("Done");
  }

  logging_debug() {
    this.force("Setting level to DEBUG");
    this.force("You should see: warn, error, fatal, info, debug");

    this.warn("You should see this");
    this.error("You should see this");
    this.fatal("You should see this");
    this.info("You should see this");
    this.debug("You should see this");
    this.trace("You shouldn't see this");
    this.force("Done");
  }

  logging_trace() {
    this.force("Setting level to TRACE");
    this.force("You should see: warn, error, fatal, info, debug, trace");

    this.warn("You should see this");
    this.error("You should see this");
    this.fatal("You should see this");
    this.info("You should see this");
    this.debug("You should see this");
    this.trace("You should see this");
    this.force("Done");
  }
}

let app1_1 = new App1("LoggingTests");
app1_1.logging();

process.env.CNA_LOG_LEVEL = "SILENT";
let app1_2 = new App1("test2");
app1_2.logging_silence();

process.env.CNA_LOG_LEVEL = "QUIET";
let app1_3 = new App1("test3");
app1_3.logging_quiet();

process.env.CNA_LOG_LEVEL = "INFO";
let app1_4 = new App1("test4");
app1_4.logging_info();

process.env.CNA_LOG_LEVEL = "DEBUG";
let app1_5 = new App1("test5");
app1_5.logging_debug();

process.env.CNA_LOG_LEVEL = "TRACE";
let app1_6 = new App1("test6");
app1_6.logging_trace();

process.env.CNA_LOG_LEVEL = "Unknown";
let app1_7 = new App1("test7");
app1_7.logging_info();

delete process.env.CNA_LOG_LEVEL;

class App2 extends CNShell {
  constructor(name: string) {
    super(name);
  }

  async start(): Promise<boolean> {
    process.env.CNA_ENV1 = "Set";
    let env1 = this.getCfg("ENV1", "Not set");
    this.info(`CNA_ENV1: ${env1}`);

    process.env.CNA_ENV2 = "Set";
    let env2 = this.getRequiredCfg("ENV2");
    this.info(`CNA_ENV2: ${env2}`);
    return true;
  }

  async stop(): Promise<void> {}

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

class App3 extends CNShell {
  constructor(name: string) {
    super(name);
  }

  async start(): Promise<boolean> {
    let env1 = this.getCfg("ENV1", "Not set");
    this.info(`CNA_ENV1: ${env1}`);

    let env2 = this.getRequiredCfg("ENV_REQED");
    this.info(`CNA_ENV2: ${env2}`);
    return true;
  }

  async stop(): Promise<void> {}

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

class App4 extends CNShell {
  constructor(name: string) {
    super(name);
  }

  async start(): Promise<boolean> {
    this.error("Started failed for some reason ...");
    return false;
  }

  async stop(): Promise<void> {}

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

async function runTests() {
  let app2 = new App2("CfgTestsOK");
  await app2.init(true);
  await app2.exit(false);

  let app3 = new App3("CfgTestsNotOK");
  await app3.init(true);

  let app4 = new App4("FailureToStartTest");

  let props: HttpPropsPattern = {
    first: {
      required: true,
    },
    second: {
      required: true,
      allowed: ["X", "Y", "Z"],
    },
    third: {
      required: true,
      default: "A",
    },
  };
  try {
    let found = app4.checkProps({ first: 1, second: "Z" }, props);
    console.log("%j", found);
  } catch (e) {
    console.error("%j", e);
  }

  await app4.init();
}

runTests();
