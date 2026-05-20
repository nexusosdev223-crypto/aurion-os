#!/bin/bash
# AURION OS Continuous Repair & Sync Daemon

echo "🚀 AURION OS Auto-Fix Engine Activated..."
echo "Monitoring directories, import maps, and API pipeline states..."

while true; do
  # 1. FIX: Ensure directories always exist
  mkdir -p src/components src/app/api/ledger

  # 2. FIX: Auto-correct any broken relative imports back to safe absolute path aliases
  if [ -f src/app/page.tsx ]; then
    if grep -q "\.\./components/LedgerView" src/app/page.tsx; then
      echo "🔧 Detected relative import drift in page.tsx. Auto-repairing to absolute alias..."
      sed -i "s|import LedgerView from '../components/LedgerView';|import LedgerView from '@/components/LedgerView';|g" src/app/page.tsx
    fi
  fi

  # 3. DIAGNOSE: Monitor the API endpoint health locally
  API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/ledger)
  
  if [ "$API_STATUS" = "500" ]; then
    ERROR_PAYLOAD=$(curl -s http://localhost:3000/api/ledger)
    echo "⚠️ System Check: API Endpoint is returning 500 Internal Error."
    echo "📦 Raw Error Context: $ERROR_PAYLOAD"
    
    # If the error is an invalid key, visually prompt the developer to prevent infinite cycling
    if echo "$ERROR_PAYLOAD" | grep -q "Invalid API key"; then
      echo "❌ CRITICAL: Your .env.local has a truncated/invalid JWT signature."
      echo "👉 Please update your key string in .env.local via your Supabase Web Console."
      sleep 10
      continue
    fi
  elif [ "$API_STATUS" = "200" ]; then
    echo "✅ Pipeline Stable: GET /api/ledger returning 200 OK"
  fi

  # Sleep for 4 seconds before running the next background system health evaluation sweep
  sleep 4
done
