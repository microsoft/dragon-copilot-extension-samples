#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT License.

# Quick validation script to test that both services are running and integrated properly
# Run this after starting the services with start-dev.sh

set -e

show_help() {
    cat << EOF
Dragon Extension Developer - Quick Test Script

Usage:
  ./test-setup.sh              Run basic integration tests
  ./test-setup.sh --verbose    Run tests with detailed output
  ./test-setup.sh --help       Show this help message

Prerequisites:
  - Both services running (use ./start-dev.sh)
  - Dragon Backend Simulator on http://localhost:5180
  - Sample Extension on http://localhost:5181

EOF
}

VERBOSE=false
SIMULATOR_URL="http://127.0.0.1:5180"
EXTENSION_URL="http://127.0.0.1:5181"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            show_help
            exit 1
            ;;
    esac
done

echo "🧪 Dragon Extension Developer - Quick Test Suite"
echo "═══════════════════════════════════════════════════"

# Test 1: Extension Health Check
echo ""
echo "1️⃣  Testing Sample Extension Health..."
if response=$(curl -s -f "$EXTENSION_URL/health" 2>/dev/null); then
    if echo "$response" | grep -q '"status":"healthy"' || echo "$response" | grep -q '"status"'; then
        echo "   ✅ Sample Extension is healthy"
        if [ "$VERBOSE" = true ]; then
            service=$(echo "$response" | grep -o '"service":"[^"]*"' | cut -d'"' -f4)
            version=$(echo "$response" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
            status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
            echo "   📋 Service: $service"
            echo "   📋 Version: $version"
            echo "   📋 Status: $status"
        fi
    else
        echo "   ⚠️  Sample Extension returned unexpected response format"
        if [ "$VERBOSE" = true ]; then
            echo "   📋 Full response: $response"
        fi
    fi
else
    echo "   ❌ Sample Extension health check failed"
    if [ "$VERBOSE" = true ]; then
        echo "   📋 Make sure the extension is running on $EXTENSION_URL"
    fi
    exit 1
fi

# Test 2: Simulator Health Check
echo ""
echo "2️⃣  Testing Dragon Backend Simulator..."
if response=$(curl -s -f "$SIMULATOR_URL/health" 2>/dev/null); then
    if echo "$response" | grep -q '"status":"healthy"' || echo "$response" | grep -q '"status"'; then
        echo "   ✅ Dragon Backend Simulator is healthy"
        if [ "$VERBOSE" = true ]; then
            service=$(echo "$response" | grep -o '"service":"[^"]*"' | cut -d'"' -f4)
            status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
            echo "   📋 Service: $service"
            echo "   📋 Status: $status"
            echo "   📋 Swagger UI available at: $SIMULATOR_URL/"
        fi
    else
        echo "   ⚠️  Dragon Backend Simulator returned unexpected response format"
        if [ "$VERBOSE" = true ]; then
            echo "   📋 Full response: $response"
        fi
    fi
else
    echo "   ❌ Dragon Backend Simulator health check failed"
    if [ "$VERBOSE" = true ]; then
        echo "   📋 Make sure the simulator is running on $SIMULATOR_URL"
    fi
    exit 1
fi

# Test 3: Extension Echo Test
echo ""
echo "3️⃣  Testing Extension Echo Endpoint..."
test_message="Quick test message"
if response=$(curl -s -f -X POST "$EXTENSION_URL/api/process/echo" \
    -H "Content-Type: application/json" \
    -d "\"$test_message\"" 2>/dev/null); then

    original_message=$(echo "$response" | grep -o '"originalMessage":"[^"]*"' | cut -d'"' -f4)
    echoed_message=$(echo "$response" | grep -o '"echoedMessage":"[^"]*"' | cut -d'"' -f4)

    if [ "$original_message" = "$test_message" ] && [ "$echoed_message" = "Echo: $test_message" ]; then
        echo "   ✅ Echo endpoint working correctly"
        if [ "$VERBOSE" = true ]; then
            echo "   📋 Original: $original_message"
            echo "   📋 Echoed: $echoed_message"
        fi
    else
        echo "   ⚠️  Echo endpoint returned unexpected response format"
        if [ "$VERBOSE" = true ]; then
            echo "   📋 Response: $response"
        fi
    fi
else
    echo "   ❌ Echo endpoint test failed"
fi

# Test 4: Direct Extension Processing
echo ""
echo "4️⃣  Testing Direct Extension Processing..."
request_id=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null || echo "test-$(date +%s)")
test_data='{
  "requestId": "'$request_id'",
  "data": "Quick setup validation test",
  "metadata": {
    "source": "QuickTestScript",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"
  }
}'

if response=$(curl -s -f -X POST "$EXTENSION_URL/api/process" \
    -H "Content-Type: application/json" \
    -d "$test_data" 2>/dev/null); then
    if echo "$response" | grep -q '"success":true'; then
        echo "   ✅ Direct processing working correctly"
        if [ "$VERBOSE" = true ]; then
            request_id_resp=$(echo "$response" | grep -o '"requestId":"[^"]*"' | cut -d'"' -f4)
            message=$(echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
            echo "   📋 Request ID: $request_id_resp"
            echo "   📋 Message: $message"
        fi
    else
        echo "   ⚠️  Direct processing returned success=false"
        if [ "$VERBOSE" = true ]; then
            echo "   📋 Response: $response"
        fi
    fi
else
    echo "   ❌ Direct processing test failed"
    if [ "$VERBOSE" = true ]; then
        echo "   📋 Error details: Check that the extension is running and accessible"
    fi
fi

# Test 5: Full Integration Test (Simulator -> Extension)
echo ""
echo "5️⃣  Testing Full Integration (Simulator → Extension)..."
encounter_data='{
  "name": "Quick Test Encounter",
  "description": "Automated test encounter created by test script"
}'

if create_response=$(curl -s -f -X POST "$SIMULATOR_URL/api/encounters:simulate" \
    -H "Content-Type: application/json" \
    -d "$encounter_data" 2>/dev/null); then

    encounter_id=$(echo "$create_response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

    if [ ! -z "$encounter_id" ]; then
        echo "   ✅ Encounter created successfully (ID: $encounter_id)"

        # Handle string status values: "Created", "Processing", "Completed", "Failed"
        status_text=$(echo "$create_response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

        if [ "$status_text" = "Completed" ]; then
            echo "   ✅ Integration test successful - encounter was completed by extension!"
            if [ "$VERBOSE" = true ]; then
                created_at=$(echo "$create_response" | grep -o '"createdAt":"[^"]*"' | cut -d'"' -f4)
                echo "   📋 Encounter Status: $status_text"
                echo "   📋 Created At: $created_at"
                completed_at=$(echo "$create_response" | grep -o '"completedAt":"[^"]*"' | cut -d'"' -f4)
                if [ ! -z "$completed_at" ] && [ "$completed_at" != "null" ]; then
                    echo "   📋 Completed At: $completed_at"
                fi
            fi
        elif [ "$status_text" = "Created" ]; then
            echo "   ⚠️  Encounter created but status shows 'created' - extension may not have been called"
            echo "      This might indicate the simulator couldn't reach the extension"
        elif [ "$status_text" = "Failed" ]; then
            echo "   ❌ Encounter processing failed"
            error_message=$(echo "$create_response" | grep -o '"errorMessage":"[^"]*"' | cut -d'"' -f4)
            if [ ! -z "$error_message" ] && [ "$error_message" != "null" ]; then
                echo "      Error: $error_message"
            fi
        else
            echo "   ⚠️  Unexpected encounter status: $status_text"
        fi
    else
        echo "   ❌ Failed to extract encounter ID from response"
        if [ "$VERBOSE" = true ]; then
            echo "   📋 Response: $create_response"
        fi
    fi
else
    echo "   ❌ Integration test failed"
    if [ "$VERBOSE" = true ]; then
        echo "   📋 Error details: Could not create encounter via simulator API"
    fi
fi

# Summary
echo ""
echo "🎯 Test Summary"
echo "═══════════════════════════════════════════════════"
echo "✅ If all tests passed, your setup is working correctly!"
echo "🌐 Access points:"
echo "   • Extension Swagger UI: $EXTENSION_URL/"
echo "   • Extension Health: $EXTENSION_URL/health"
echo "   • Simulator Swagger UI: $SIMULATOR_URL/"
echo "   • Simulator API: $SIMULATOR_URL/api/encounters:simulate"
echo "   • Integration Tests: testing/integration-tests.http"

echo ""
echo "📝 Next Steps:"
echo "   1. Explore the API endpoints above"
echo "   2. Run the full integration test suite in testing/integration-tests.http"
echo "   3. Create your own extension based on the sample"
echo "   4. Start building your custom business logic!"

echo ""
echo "🚀 Happy Extension Development!"
