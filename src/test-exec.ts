import CNShell from "./cn-shell";
import childProcess from "child_process";

class App extends CNShell {
  constructor(name: string) {
    super(name);

    this.simpleReadRoute("/test", async () => "Heeey!", false);
    this.staticResponseRoute("/auth", "You're in", true);
  }

  async start(): Promise<boolean> {
    return true;
  }

  async stop(): Promise<void> {}

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async runit() {
    childProcess.exec(
      "echo hi && sleep 10 && echo bye; done",
      (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
      },
    );
  }
}

let app = new App("app");
app.init();
//app.runit();
