"use strict";

module.exports = {
  get(name, config, defaultVal) {
    let value = process.env[this.key(name, config)];

    // If env var doesn't exist then return the default value
    if (value === undefined) {
      return defaultVal;
    }

    return value;
  },

  key(name, config) {
    return `${name.toUpperCase()}_${config.toUpperCase()}`;
  },
};
