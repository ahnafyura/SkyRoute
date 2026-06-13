#!/usr/bin/env bash
# start.sh
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}