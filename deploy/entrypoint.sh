#!/bin/sh
set -eu

node dist/db/cli.js migrate
exec "$@"
