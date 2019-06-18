"use strict";

module.exports = {
  getCfg(name, config, defaultVal) {
    let key = `${name.toUpperCase()}_${config.toUpperCase()}`;
    let value = process.env[key];

    // If env var doesn't exist then return the default value
    if (value === undefined) {
      return defaultVal;
    }

    return value;
  },
};
