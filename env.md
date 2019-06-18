# The following configuration environmental variables are used:

NOTE: The cloud native application (CNA) name needs to be prepended to all
env vars.

- \_LOG_LEVEL: Used to specify the log level of the CNA. Allowed values are:

  "trace": Include trace and debug messages in logging
  "debug": Include debug messages in logging
  "info": Default. Log only informational messages
  "quiet": Disable all logging except for fatals, errors and warnings

- \_HTTP_INTERFACE: Used to specify the interface to listen on. Default is "eth0"

- \_HTTP_PORT: Used to specify the port to listen on. Default is "80"

- \_HEALTHCHECK_PATH: Used to specify the path to use for the healcheck endpoint
