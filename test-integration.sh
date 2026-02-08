#!/bin/bash

# Integration Test Script for PLC Monitor
# Tests that frontend can communicate with backend

echo "=== PLC Monitor Integration Test ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

# Test function
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected="$3"
    
    echo -n "Testing $name... "
    
    response=$(curl -s "$url")
    
    if echo "$response" | grep -q "$expected"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  Expected to find: $expected"
        echo "  Got: ${response:0:100}..."
        ((FAILED++))
        return 1
    fi
}

echo "1. Backend Health Check"
echo "------------------------"
test_endpoint "Backend Health" "http://localhost:3001/health" '"status":"ok"'
echo ""

echo "2. Backend API Endpoints"
echo "------------------------"
test_endpoint "Get All PLCs" "http://localhost:3001/api/plcs" '"success":true'
test_endpoint "Get Stats" "http://localhost:3001/api/stats" '"devices"'
test_endpoint "Get PLC by ID" "http://localhost:3001/api/plcs/1" '"success":true'
echo ""

echo "3. Frontend Availability"
echo "------------------------"
test_endpoint "Frontend Root" "http://localhost:4200" '<app-root>'
echo ""

echo "4. CORS Configuration"
echo "---------------------"
echo -n "Testing CORS headers... "
cors_response=$(curl -s -I -H "Origin: http://localhost:4200" http://localhost:3001/api/plcs)
if echo "$cors_response" | grep -q "Access-Control-Allow-Origin"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "  CORS headers not found"
    ((FAILED++))
fi
echo ""

echo "=== Test Summary ==="
echo "Total tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Integration is working.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Check the output above.${NC}"
    exit 1
fi
