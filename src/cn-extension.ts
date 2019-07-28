// Imports here
import CNShell from "./cn-shell";

// CNExtension class here
abstract class CNExtension {
  // Properties here
  private readonly _name: string;
  private readonly _shell: CNShell;

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

export default CNExtension;
