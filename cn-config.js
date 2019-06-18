"use strict";

module.exports = {
  getCfg(name, config, defaultVal) {
    let value = process.env[this.getKey(name, config)];

    // If env var doesn't exist then return the default value
    if (value === undefined) {
      return defaultVal;
    }

    return value;
  },

  getKey(name, config) {
    return `${name.toUpperCase()}_${config.toUpperCase()}`;
  },
};
