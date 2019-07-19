// Imports here
import { CNLogger } from "./cn-logger";

// CNExtension class here
abstract class CNExtension {
  // Properties here
  private readonly _name: string;
  private _logger: CNLogger;

  // Constructor here
  constructor(name: string, logger: CNLogger) {
    this._name = name;
    this._logger = logger;
  }

  // Getters here
  get name(): string {
    return this._name;
  }

  // Public methods here
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
}

export default CNExtension;
