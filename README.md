[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

# Cloud Native Shell

Cloud Native Shell is shortened to cn-shell.

cn-shell is a JS wrapper, like a shell, for cloud native applications.

# The following configuration environmental variables are used:

- CNA_LOG_LEVEL: Used to specify the log level of the CNA. Allowed values are:

  "TRACE": Include trace and debug messages in logging
  "DEBUG": Include debug messages in logging
  "INFO": Default. Log only informational messages (default value)
  "QUIET": Disable all logging except for fatals, errors and warnings
  "SILENT": Disable all logging without exception

- CNA_HTTP_INTERFACE: Used to specify the interface to listen on. Default is "eth0"

- CNA_HTTP_PORT: Used to specify the port to listen on. Default is "80"

- CNA_HEALTHCHECK_PATH: Used to specify the path to use for the healcheck endpoint. Default is "/healthcheck"

_**Documentation will be along shortly!**_
