#!/bin/bash
echo "🔄 Resuming Aurion OS session..."
pm2 restore
pm2 logs
