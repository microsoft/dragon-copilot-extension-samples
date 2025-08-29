#!/bin/bash

# Generates Bearer tokens for Entra ID service-to-service authentication
# Simple script to get Bearer tokens for Dragon Copilot Extension authentication using client credentials flow

show_help() {
    cat << EOF
SYNOPSIS
    Generates Bearer tokens for Entra ID service-to-service authentication.

DESCRIPTION
    Simple script to get Bearer tokens for Dragon Copilot Extension authentication using client credentials flow.

USAGE
    $0 --tenant-id <TENANT_ID> --client-id <CLIENT_ID> --client-secret <CLIENT_SECRET> --target-app-id-uri <TARGET_APP_ID_URI>

PARAMETERS
    --tenant-id         Azure AD tenant ID
    --client-id         Application (client) ID
    --client-secret     Client secret
    --target-app-id-uri Target application ID URI (format: api://tenant-id/hostname)
    --help             Show this help message

EXAMPLE
    $0 --tenant-id "12345678-1234-1234-1234-123456789abc" \\
       --client-id "87654321-4321-4321-4321-210987654321" \\
       --client-secret "your-secret" \\
       --target-app-id-uri "api://12345678-1234-1234-1234-123456789abc/myextension.example.com"

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --tenant-id)
            TENANT_ID="$2"
            shift 2
            ;;
        --client-id)
            CLIENT_ID="$2"
            shift 2
            ;;
        --client-secret)
            CLIENT_SECRET="$2"
            shift 2
            ;;
        --target-app-id-uri)
            TARGET_APP_ID_URI="$2"
            shift 2
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo "Error: Unknown parameter $1" >&2
            show_help
            exit 1
            ;;
    esac
done

# Validate required parameters
if [[ -z "$TENANT_ID" || -z "$CLIENT_ID" || -z "$CLIENT_SECRET" || -z "$TARGET_APP_ID_URI" ]]; then
    echo "Error: Missing required parameters" >&2
    echo "Required: --tenant-id, --client-id, --client-secret, --target-app-id-uri" >&2
    echo "Use --help for more information" >&2
    exit 1
fi

# Check if curl is available
if ! command -v curl &> /dev/null; then
    echo "Error: curl is required but not installed" >&2
    exit 1
fi

# Set up variables
TOKEN_ENDPOINT="https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token"
SCOPE="${TARGET_APP_ID_URI}/.default"

# Make the token request
RESPONSE=$(curl -s -X POST "$TOKEN_ENDPOINT" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=${CLIENT_ID}" \
    -d "client_secret=${CLIENT_SECRET}" \
    -d "scope=${SCOPE}" \
    -d "grant_type=client_credentials")

# Check if curl succeeded
if [[ $? -ne 0 ]]; then
    echo "Error: Failed to make HTTP request" >&2
    exit 1
fi

# Simple JSON parsing without jq
# Check if response contains an error
if [[ "$RESPONSE" == *'"error"'* ]]; then
    # Extract error message using basic string manipulation
    ERROR_MSG=$(echo "$RESPONSE" | sed -n 's/.*"error_description":"\([^"]*\)".*/\1/p')
    if [[ -z "$ERROR_MSG" ]]; then
        ERROR_MSG=$(echo "$RESPONSE" | sed -n 's/.*"error":"\([^"]*\)".*/\1/p')
    fi
    echo "Error: $ERROR_MSG" >&2
    exit 1
fi

# Extract access token using basic string manipulation
ACCESS_TOKEN=$(echo "$RESPONSE" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')

# Check if token was successfully extracted
if [[ -z "$ACCESS_TOKEN" ]]; then
    echo "Error: Failed to extract access token from response" >&2
    echo "Response: $RESPONSE" >&2
    exit 1
fi

# Output Bearer token
echo "Bearer $ACCESS_TOKEN"
