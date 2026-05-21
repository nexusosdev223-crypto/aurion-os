#!/bin/bash
echo "=== Starting AURION OS Autonomous Autopilot Engine ==="
echo "Linking Real-time API Endpoint → Ollama (qwen2.5-coder:7b) → Supabase Ledger"

# Pass through whatever proxy env is already set; tsx ↔ Node process inherits it.
npx tsx src/app/api/metrics/velocity/executor.ts
