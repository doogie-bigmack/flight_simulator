#!/bin/bash

# Test runner script for Sky Squad flight simulator
# This script runs both frontend and backend tests in a Docker container

set -e

# Variables
PROJECT_ROOT=$(dirname "$(dirname "$(readlink -f "$0")")")
ENV_FILE=".env.test"
DEFAULT_TEST_ENV="test"
TEST_ENV=${TEST_ENV:-$DEFAULT_TEST_ENV}

# Log in JSON format
log_info() {
    echo "{\"timestamp\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",\"level\":\"INFO\",\"component\":\"TestRunner\",\"message\":\"$1\"}"
}

log_error() {
    echo "{\"timestamp\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",\"level\":\"ERROR\",\"component\":\"TestRunner\",\"message\":\"$1\",\"error\":\"$2\"}" >&2
}

# Check for custom environment file
if [ -n "$ENV_FILE" ] && [ -f "$PROJECT_ROOT/$ENV_FILE" ]; then
    log_info "Using environment file: $ENV_FILE"
    source "$PROJECT_ROOT/$ENV_FILE"
else
    if [ -f "$PROJECT_ROOT/.env.test.example" ]; then
        log_info "No $ENV_FILE found. Using .env.test.example as a fallback."
        source "$PROJECT_ROOT/.env.test.example"
    else
        log_error "No environment files found" "Missing both $ENV_FILE and .env.test.example"
        exit 1
    fi
fi

# Display test environment
log_info "Running tests in $TEST_ENV environment"

# Run backend tests
run_backend_tests() {
    log_info "Running backend tests..."
    cd "$PROJECT_ROOT"
    
    # Run Python tests
    python -m pytest tests/backend -v
    
    if [ $? -ne 0 ]; then
        log_error "Backend tests failed" "Python tests returned non-zero exit code"
        return 1
    fi
    
    log_info "Backend tests completed successfully"
    return 0
}

# Run frontend tests
run_frontend_tests() {
    log_info "Running frontend tests..."
    cd "$PROJECT_ROOT"
    
    # Run Jest tests for frontend
    npx jest tests/frontend --verbose
    
    if [ $? -ne 0 ]; then
        log_error "Frontend tests failed" "Jest tests returned non-zero exit code"
        return 1
    fi
    
    log_info "Frontend tests completed successfully"
    return 0
}

# Main execution
main() {
    log_info "Starting test suite for Sky Squad flight simulator"
    
    # Run backend tests
    if ! run_backend_tests; then
        log_error "Test suite failed" "Backend tests failed"
        exit 1
    fi
    
    # Run frontend tests
    if ! run_frontend_tests; then
        log_error "Test suite failed" "Frontend tests failed"
        exit 1
    fi
    
    log_info "All tests passed successfully! ✅"
}

# Execute main function
main
