#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT License.

# Quick start script for Dragon Copilot Extension Developer environment (Linux/Mac)
# This script starts the Sample Extension for development

set -e

show_help() {
    cat << EOF
Dragon Extension Developer - Quick Start Script

Usage:
  ./start-dev.sh              Start the sample extension in development mode
  ./start-dev.sh --stop       Stop all running services
  ./start-dev.sh --help       Show this help message

Services:
  - Sample Extension Swagger: http://localhost:5181/

EOF
}

stop_services() {
    echo "🛑 Stopping all Dragon Extension Developer services..."

    # Kill processes on our ports
    for port in 5181; do
        pid=$(lsof -ti :$port 2>/dev/null || true)
        if [ ! -z "$pid" ]; then
            echo "Stopping process on port $port (PID: $pid)..."
            kill -TERM $pid 2>/dev/null || true
            sleep 1
            kill -KILL $pid 2>/dev/null || true
        fi
    done

    echo "✅ All services stopped."
    exit 0
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --stop)
        stop_services
        ;;
    "")
        # Continue with startup
        ;;
    *)
        echo "Error: Unknown option $1"
        show_help
        exit 1
        ;;
esac

# Get the root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Check if .NET is available
if ! command -v dotnet &> /dev/null; then
    echo "❌ Error: .NET SDK is required but not found. Please install .NET 9.0 SDK or later."
    exit 1
fi

echo "🐉 Starting Dragon Extension Developer Environment..."
echo "Root path: $ROOT_DIR"

# Check if ports are available
for port in 5181; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Warning: Port $port is already in use. Run with --stop to stop existing services first."
        exit 1
    fi
done

# Paths
EXTENSION_PATH="$ROOT_DIR/samples/DragonCopilot/Workflow/SampleExtension.Web"

# Check if directory exists
if [ ! -d "$EXTENSION_PATH" ]; then
    echo "❌ Error: Sample Extension not found at: $EXTENSION_PATH"
    exit 1
fi

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Stopping services..."

    # Kill background jobs
    if [ ! -z "${EXTENSION_PID:-}" ]; then
        kill $EXTENSION_PID 2>/dev/null || true
    fi

    echo "👋 Dragon Extension Developer Environment stopped."
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

echo ""
echo "🔧 Starting Sample Extension on http://localhost:5181..."

# Start Sample Extension in background
cd "$EXTENSION_PATH"
dotnet run --urls "http://localhost:5181" &
EXTENSION_PID=$!

# Wait for services to start
echo ""
echo "⏳ Waiting for service to start..."
sleep 5

# Health check function
check_health() {
    local url=$1
    local service_name=$2

    if curl -s "$url" > /dev/null 2>&1; then
        echo "🟢 $service_name: $url"
        return 0
    else
        echo "🟡 $service_name: $url (starting...)"
        return 1
    fi
}

# Retry health checks
MAX_RETRIES=3
RETRY_DELAY=2
EXTENSION_HEALTHY=false

for retry in $(seq 1 $MAX_RETRIES); do
    echo "🔍 Health check attempt $retry/$MAX_RETRIES..."

    if check_health "http://localhost:5181" "Sample Extension Swagger"; then
        EXTENSION_HEALTHY=true
        break
    fi

    if [ $retry -lt $MAX_RETRIES ]; then
        sleep $RETRY_DELAY
    fi
done

echo ""
echo "✅ Dragon Extension Developer Environment Started!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$EXTENSION_HEALTHY" = true ]; then
    echo "🟢 Sample Extension Swagger: http://localhost:5181/"
else
    echo "🟡 Sample Extension Swagger: http://localhost:5181/ (starting...)"
fi

echo ""
echo "📋 Quick Test Commands:"
echo "• Test extension directly: Send POST requests to http://localhost:5181/v1/process"
echo "• Stop services:           ./start-dev.sh --stop"
echo "• View logs:               Check the terminal output"

echo ""
echo "🚀 Ready for development! Press Ctrl+C to stop the service."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Monitor the processes
while kill -0 $EXTENSION_PID 2>/dev/null; do
    sleep 1
done

echo "Service stopped unexpectedly."
exit 1
