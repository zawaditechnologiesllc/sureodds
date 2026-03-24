#!/bin/bash
cd /opt/render/project/src/sure-odds/backend && /opt/render/.local/bin/uvicorn app.main:app --host 0.0.0.0 --port $PORT
