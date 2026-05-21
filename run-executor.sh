#!/bin/bash
echo "=== Starting AURION OS Autonomous Autopilot Engine ==="
echo "Linking Real-time API Endpoint -> Ollama (qwen2.5-coder:7b) -> Supabase Ledger"
npx tsx src/app/api/metrics/velocity/executor.ts
