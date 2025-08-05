#!/bin/bash

# 🧪 AI-MoM-Generator System Test Script
echo "🚀 Starting AI-MoM-Generator System Tests..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    echo -n "Testing $test_name... "
    
    if eval "$test_command" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((TESTS_FAILED++))
    fi
}

# Test 1: Backend Health
run_test "Backend Health" \
    "curl -s http://localhost:8001/health" \
    "healthy"

# Test 2: Frontend Accessibility
run_test "Frontend Accessibility" \
    "curl -s -I http://localhost:3000" \
    "200 OK"

# Test 3: Database Connection
run_test "Database Connection" \
    "curl -s http://localhost:8001/health" \
    "connected"

# Test 4: CORS Configuration
run_test "CORS Configuration" \
    "curl -s -H 'Origin: http://localhost:3000' -X OPTIONS http://localhost:8001/api/meetings/" \
    "OK"

# Test 5: Meeting API
run_test "Meeting API" \
    "curl -s http://localhost:8001/api/meetings/" \
    "meetings"

# Test 6: Authentication Endpoint
run_test "Authentication Endpoint" \
    "curl -s http://localhost:8001/auth/login" \
    "auth_url"

# Test 7: Admin Stats
run_test "Admin Statistics" \
    "curl -s http://localhost:8001/admin/stats" \
    "meetings"

# Test 8: Demo Meeting Creation
echo -n "Testing Demo Meeting Creation... "
RESPONSE=$(curl -s -X POST http://localhost:8001/api/demo/create-meeting)
if echo "$RESPONSE" | grep -q "meeting_id"; then
    MEETING_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['meeting_id'])" 2>/dev/null)
    echo -e "${GREEN}✅ PASSED${NC} (Meeting ID: $MEETING_ID)"
    ((TESTS_PASSED++))
    
    # Test 9: Meeting Retrieval
    if [ ! -z "$MEETING_ID" ]; then
        run_test "Meeting Retrieval" \
            "curl -s http://localhost:8001/api/meetings/$MEETING_ID" \
            "Product Planning"
    fi
else
    echo -e "${RED}❌ FAILED${NC}"
    ((TESTS_FAILED++))
fi

# Test 10: API Documentation
run_test "API Documentation" \
    "curl -s http://localhost:8001/docs" \
    "OpenAPI"

echo ""
echo "================================================"
echo "📊 TEST RESULTS:"
echo -e "✅ Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "❌ Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "📈 Success Rate: $(( TESTS_PASSED * 100 / (TESTS_PASSED + TESTS_FAILED) ))%"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 ALL TESTS PASSED! System is ready for demo!${NC}"
    echo ""
    echo "🌐 Access Points:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:8001"
    echo "   API Docs: http://localhost:8001/docs"
else
    echo ""
    echo -e "${YELLOW}⚠️  Some tests failed. Check the system status.${NC}"
fi

echo ""
echo "🔧 Quick Commands:"
echo "   View backend logs: tail -f backend/backend8001.log"
echo "   View frontend logs: tail -f frontend/frontend.log"
echo "   Restart backend: pkill -f uvicorn && cd backend && source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8001 &"
echo ""
