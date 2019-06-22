[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

# Cloud Native Shell

Cloud Native Shell is shortened to cn-shell.

cn-shell is a JS wrapper, like a shell, for cloud native applications.

# The following configuration environmental variables are used:

- CNA_NAME: The name of the CLoud Native App. Default is "CNA"

- \${CNS_NAME}\_LOG_LEVEL: Used to specify the log level of the CNA. Allowed values are:

  "3": Include trace and debug messages in logging
  "2": Include debug messages in logging
  "1": Default. Log only informational messages
  "0": Disable all logging except for fatals, errors and warnings

- \${CNA_NAME}\_HTTP_INTERFACE: Used to specify the interface to listen on. Default is "eth0"

- \${CNA_NAME}\_HTTP_PORT: Used to specify the port to listen on. Default is "80"

- \${CNA_NAME}\_HEALTHCHECK_PATH: Used to specify the path to use for the healcheck endpoint

_**Documentation will be along shortly!**_
