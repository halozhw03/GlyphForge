#!/bin/bash

# 打印机连接功能快速测试脚本
# Quick Test Script for Printer Connection Feature

echo "=================================="
echo "Printer Connection Test Tool"
echo "Printer Connection Test Tool"
echo "=================================="
echo ""

# 检查当前目录
if [ ! -f "index.html" ]; then
    echo "❌ Error: Please run this script from the drawing-interface directory"
    exit 1
fi

echo "✅ Directory check passed"
echo ""

# 检查必要文件
echo "Checking required files..."
echo ""

files=(
    "index.html"
    "js/app.js"
    "js/PrinterManager.js"
    "css/style.css"
    "printers/ender3-pro.json"
    "printers/ender5.json"
)

all_files_exist=true

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (missing)"
        all_files_exist=false
    fi
done

echo ""

if [ "$all_files_exist" = false ]; then
    echo "❌ Some files are missing, please check installation"
    exit 1
fi

echo "✅ All files check passed"
echo ""

# 检查是否有Python
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "❌ Python not found, please install Python 3"
    exit 1
fi

echo "✅ Python found: $PYTHON_CMD"
echo ""

# 检查端口是否被占用
PORT=8080
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Warning: Port $PORT is already in use"
    echo ""
    echo "You can try:"
    echo "  1. Kill the process using the port"
    echo "  2. Use another port: $PYTHON_CMD -m http.server 8081"
    echo ""
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

echo "=================================="
echo "Starting test server..."
echo "=================================="
echo ""
echo "Server URL:"
echo "  http://localhost:$PORT"
echo ""
echo "Test Steps:"
echo "  1. Open the URL above in Chrome or Edge browser"
echo ""
echo "  2. Check if 'Print Mode' option exists in right panel"
echo ""
echo "  3. Switch to 'Real Print' mode"
echo ""
echo "  4. Check if printer controls are visible"
echo ""
echo "  5. Press Ctrl+C to stop the server"
echo ""
echo "=================================="
echo ""

# 启动服务器
$PYTHON_CMD -m http.server $PORT

echo ""
echo "Server stopped"

