#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT License.

# Quick start script for Dragon Copilot Extension Developer environment (Linux/Mac)
# This script starts both the Dragon Backend Simulator and Sample Extension for development

set -e

show_help() {
    cat << EOF
Dragon Extension Developer - Quick Start Script

Usage:
  ./start-dev.sh              Start both services in development mode
  ./start-dev.sh --stop       Stop all running services
  ./start-dev.sh --help       Show this help message

Services:
  - Dragon Backend Simulator: http://localhost:5180/
  - Sample Extension Swagger: http://localhost:5181/

EOF
}

stop_services() {
    echo "🛑 Stopping all Dragon Extension Developer services..."

    # Kill processes on our ports
    for port in 5180 5181; do
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
for port in 5180 5181; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Warning: Port $port is already in use. Run with --stop to stop existing services first."
        exit 1
    fi
done

# Paths
SIMULATOR_PATH="$ROOT_DIR/DragonBackendSimulator/DragonBackendSimulator.Web"
EXTENSION_PATH="$ROOT_DIR/samples/DragonCopilot/Workflow/SampleExtension.Web"

# Check if directories exist
if [ ! -d "$SIMULATOR_PATH" ]; then
    echo "❌ Error: Dragon Backend Simulator not found at: $SIMULATOR_PATH"
    exit 1
fi

if [ ! -d "$EXTENSION_PATH" ]; then
    echo "❌ Error: Sample Extension not found at: $EXTENSION_PATH"
    exit 1
fi

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Stopping services..."

    # Stop all background processes
    if [ ! -z "${SIMULATOR_OUTPUT_PID:-}" ]; then
        kill $SIMULATOR_OUTPUT_PID 2>/dev/null || true
    fi
    if [ ! -z "${EXTENSION_OUTPUT_PID:-}" ]; then
        kill $EXTENSION_OUTPUT_PID 2>/dev/null || true
    fi
    if [ ! -z "${SIMULATOR_TAIL_PID:-}" ]; then
        kill $SIMULATOR_TAIL_PID 2>/dev/null || true
    fi
    if [ ! -z "${EXTENSION_TAIL_PID:-}" ]; then
        kill $EXTENSION_TAIL_PID 2>/dev/null || true
    fi

    # Stop main service processes
    if [ ! -z "${SIMULATOR_PID:-}" ]; then
        kill $SIMULATOR_PID 2>/dev/null || true
    fi
    if [ ! -z "${EXTENSION_PID:-}" ]; then
        kill $EXTENSION_PID 2>/dev/null || true
    fi

    # Wait a moment then force kill if necessary
    sleep 2
    if [ ! -z "${SIMULATOR_PID:-}" ]; then
        kill -9 $SIMULATOR_PID 2>/dev/null || true
    fi
    if [ ! -z "${EXTENSION_PID:-}" ]; then
        kill -9 $EXTENSION_PID 2>/dev/null || true
    fi

    # Clean up temporary files and pipes
    rm -f "$SIMULATOR_LOG" "$EXTENSION_LOG" 2>/dev/null || true
    rm -f "$SIMULATOR_PIPE" "$EXTENSION_PIPE" 2>/dev/null || true

    echo "👋 Dragon Extension Developer Environment stopped."
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# ANSI color codes for output formatting
CYAN='\033[36m'
MAGENTA='\033[35m'
RESET='\033[0m'

# Create temporary files for buffering output
SIMULATOR_LOG="/tmp/dragon-simulator-buffer.$$"
EXTENSION_LOG="/tmp/dragon-extension-buffer.$$"
touch "$SIMULATOR_LOG" "$EXTENSION_LOG"

# Function to display buffered output with prefixes and colors
show_buffered_output() {
    # Show simulator output in cyan
    if [ -s "$SIMULATOR_LOG" ]; then
        while IFS= read -r line; do
            echo -e "${CYAN}[Simulator]${RESET} $line"
        done < "$SIMULATOR_LOG"
    fi

    # Show extension output in magenta
    if [ -s "$EXTENSION_LOG" ]; then
        while IFS= read -r line; do
            echo -e "${MAGENTA}[Extension]${RESET} $line"
        done < "$EXTENSION_LOG"
    fi
}

# Start the Dragon Backend Simulator
echo ""
echo "📡 Starting Dragon Backend Simulator on http://localhost:5180..."
cd "$SIMULATOR_PATH"
dotnet run --urls "http://localhost:5180" > "$SIMULATOR_LOG" 2>&1 &
SIMULATOR_PID=$!

# Wait a moment for the first service to start
sleep 2

# Start the Sample Extension
echo "🔧 Starting Sample Extension on http://localhost:5181..."
cd "$EXTENSION_PATH"
dotnet run --urls "http://localhost:5181" > "$EXTENSION_LOG" 2>&1 &
EXTENSION_PID=$!

echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# Retry health checks multiple times
MAX_RETRIES=3
RETRY_DELAY=2
SIMULATOR_HEALTHY=false
EXTENSION_HEALTHY=false

for retry in $(seq 1 $MAX_RETRIES); do
    echo "🔍 Health check attempt $retry/$MAX_RETRIES..."

    # Check Dragon Backend Simulator
    if [ "$SIMULATOR_HEALTHY" = false ]; then
        if curl -s -f "http://localhost:5180/" > /dev/null 2>&1; then
            SIMULATOR_HEALTHY=true
        fi
    fi

    # Check Sample Extension
    if [ "$EXTENSION_HEALTHY" = false ]; then
        if curl -s -f "http://localhost:5181" > /dev/null 2>&1; then
            EXTENSION_HEALTHY=true
        fi
    fi

    # If both services are healthy, break out of retry loop
    if [ "$SIMULATOR_HEALTHY" = true ] && [ "$EXTENSION_HEALTHY" = true ]; then
        break
    fi

    # Wait before next retry (except on last attempt)
    if [ $retry -lt $MAX_RETRIES ]; then
        sleep $RETRY_DELAY
    fi
done

echo ""
echo "✅ Dragon Extension Developer Environment Started!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$SIMULATOR_HEALTHY" = true ]; then
    echo "🟢 Dragon Backend Simulator: http://localhost:5180/"
else
    echo "🟡 Dragon Backend Simulator: http://localhost:5180/ (starting...)"
fi

if [ "$EXTENSION_HEALTHY" = true ]; then
    echo "🟢 Sample Extension Swagger: http://localhost:5181/"
else
    echo "🟡 Sample Extension Swagger: http://localhost:5181/ (starting...)"
fi

echo ""
echo "📋 Quick Test Commands:"
echo "• Test integration: Import testing/integration-tests.http in VS Code"
echo "• Stop services:    ./start-dev.sh --stop"

echo ""
echo "🚀 Ready for development! Press Ctrl+C to stop all services."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Now show the buffered output from services
show_buffered_output

# Create named pipes for real-time output going forward
SIMULATOR_PIPE="/tmp/dragon-simulator-pipe.$$"
EXTENSION_PIPE="/tmp/dragon-extension-pipe.$$"
mkfifo "$SIMULATOR_PIPE"
mkfifo "$EXTENSION_PIPE"

# Function to prefix and display real-time output with colors
prefix_output() {
    local prefix="$1"
    local pipe="$2"
    local color="$3"
    while IFS= read -r line; do
        echo -e "${color}[$prefix]${RESET} $line"
    done < "$pipe"
}

# Start real-time output monitoring with colors
prefix_output "Simulator" "$SIMULATOR_PIPE" "$CYAN" &
SIMULATOR_OUTPUT_PID=$!
prefix_output "Extension" "$EXTENSION_PIPE" "$MAGENTA" &
EXTENSION_OUTPUT_PID=$!

# Redirect future output to real-time pipes
exec 3< <(tail -f "$SIMULATOR_LOG")
exec 4< <(tail -f "$EXTENSION_LOG")

# Copy new output to pipes in background
(while IFS= read -r line <&3; do echo "$line" > "$SIMULATOR_PIPE"; done) &
SIMULATOR_TAIL_PID=$!
(while IFS= read -r line <&4; do echo "$line" > "$EXTENSION_PIPE"; done) &
EXTENSION_TAIL_PID=$!

# Wait for user interruption while monitoring background processes
while kill -0 $SIMULATOR_PID 2>/dev/null && kill -0 $EXTENSION_PID 2>/dev/null; do
    sleep 1
done
