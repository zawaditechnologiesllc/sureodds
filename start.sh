#!/bin/bash
cd sure-odds/backend
uvicorn app.main:app --host 0.0.0.0 --port $PORT
