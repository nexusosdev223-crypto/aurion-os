#!/bin/bash
echo "🧠 Initializing Local Ollama Agent Runtime Connection..."
while true; do
  echo "---"
  echo "📊 Fetching live ecosystem velocity metrics..."
  METRICS=$(curl -s http://localhost:3000/api/metrics/velocity)
  VELOCITY=$(echo $METRICS | grep -o '"tokenVelocity24h":[0-9.]*' | cut -d':' -f2)
  STATUS=$(echo $METRICS | grep -o '"healthIndex":"[^"]*' | cut -d'"' -f4)
  echo "📈 Current Token Velocity: $VELOCITY ($STATUS)"
  PROMPT="You are the AURION OS Capital Controller Agent. Velocity is $VELOCITY and status is '$STATUS'. If Stagnant, respond with JSON to STIMULATE with an amount (100-5000) and reason. Otherwise HOLD."
  echo "🤖 Consulting local qwen2.5-coder model..."
  AI_RESPONSE=$(curl -s http://localhost:11434/api/generate -d "{\"model\":\"qwen2.5-coder:7b\",\"prompt\":\"$PROMPT\",\"stream\":false}" | grep -o '"response":"[^"]*' | cut -d'"' -f4)
  echo "📝 Agent Decision: $AI_RESPONSE"
  sleep 10
done
