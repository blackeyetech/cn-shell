"use strict";

const HEALTHY = true;

class CNApp {
  start() {
    // This should be overriden by the application to impliment the logic
    // required to start the app
  }

  async stop() {
    // This should be overriden by the application to provide any shutdown
    // logic required
  }

  async healthCheck() {
    // This is a default health check which should be overridden if something
    // more advanced is required
    return HEALTHY;
  }
}

module.exports = CNApp;
