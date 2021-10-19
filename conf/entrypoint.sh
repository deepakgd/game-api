#!/bin/sh
set -e

npm run migration

exec "$@"
