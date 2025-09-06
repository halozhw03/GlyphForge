#!/bin/bash

# 2D Mechanical Arm Simulator - Quick Start Server
# This script starts a local HTTP server to run the application

echo "🤖 Starting 2D Mechanical Arm Simulator..."
echo "📍 Server will be available at: http://localhost:8080"
echo "🔧 Press Ctrl+C to stop the server"
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    echo "✅ Using Python 3"
    python3 -m http.server 8080
elif command -v python &> /dev/null; then
    echo "✅ Using Python"
    python -m http.server 8080
else
    echo "❌ Python not found. Please install Python to run the server."
    echo "   Alternatively, use any other HTTP server like:"
    echo "   - Node.js: npx serve ."
    echo "   - PHP: php -S localhost:8080"
    exit 1
fi
