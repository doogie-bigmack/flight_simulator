# Makefile for Sky Squad Flight Simulator
# Provides simplified commands for building, testing, and running the application

# Variables
PROJECT_NAME := sky-squad
ENV_FILE := .env
TEST_ENV_FILE := .env.test

# Default target
.PHONY: all
all: help

# Help message
.PHONY: help
help:
	@echo "Sky Squad Flight Simulator"
	@echo "-------------------------"
	@echo "Available commands:"
	@echo "  make build        - Build Docker images"
	@echo "  make run          - Run the application"
	@echo "  make stop         - Stop the application"
	@echo "  make test         - Run all tests"
	@echo "  make test-backend - Run backend tests only"
	@echo "  make test-frontend - Run frontend tests only"
	@echo "  make test-perf    - Run performance tests"
	@echo "  make clean        - Remove Docker containers and volumes"
	@echo "  make lint         - Run linting checks"

# Build the Docker images
.PHONY: build
build:
	@echo "{\"timestamp\":\"$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")\",\"level\":\"INFO\",\"component\":\"Makefile\",\"message\":\"Building Docker images\"}"
	docker-compose build

# Run the application
.PHONY: run
run:
	@echo "{\"timestamp\":\"$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")\",\"level\":\"INFO\",\"component\":\"Makefile\",\"message\":\"Starting application\"}"
	docker-compose up -d
	@echo "{\"timestamp\":\"$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")\",\"level\":\"INFO\",\"component\":\"Makefile\",\"message\":\"Application started, visit http://localhost:8000\"}"

# Stop the application
.PHONY: stop
stop:
	@echo "{\"timestamp\":\"$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")\",\"level\":\"INFO\",\"component\":\"Makefile\",\"message\":\"Stopping application\"}"
	docker-compose down

# Clean Docker resources
.PHONY: clean
clean:
	@echo "{\"timestamp\":\"$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")\",\"level\":\"INFO\",\"component\":\"Makefile\",\"message\":\"Cleaning Docker resources\"}"
	docker-compose down -v
	docker-compose rm -f

# Run all tests
.PHONY: test
test:
	@echo "{\"timestamp\":\"$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")\",\"level\":\"INFO\",\"component\":\"Makefile\",\"message\":\"Running all tests\"}"
	ENV_FILE=$(TEST_ENV_FILE) docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit

# Run backend tests only
.PHONY: test-backend
test-backend:
	@echo "{\"timestamp\":\"$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")\",\"level\":\"INFO\",\"component\":\"Makefile\",\"message\":\"Running backend tests\"}"
	ENV_FILE=$(TEST_ENV_FILE) TEST_SCOPE=backend docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit

# Run frontend tests only
.PHONY: test-frontend
test-frontend:
	@echo "{\"timestamp\":\"$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")\",\"level\":\"INFO\",\"component\":\"Makefile\",\"message\":\"Running frontend tests\"}"
	ENV_FILE=$(TEST_ENV_FILE) TEST_SCOPE=frontend docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit

# Run performance tests
.PHONY: test-perf
test-perf:
	@echo "{\"timestamp\":\"$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")\",\"level\":\"INFO\",\"component\":\"Makefile\",\"message\":\"Running performance tests\"}"
	ENV_FILE=$(TEST_ENV_FILE) TEST_SCOPE=performance docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit

# Run linting
.PHONY: lint
lint:
	@echo "{\"timestamp\":\"$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")\",\"level\":\"INFO\",\"component\":\"Makefile\",\"message\":\"Running linting checks\"}"
	docker-compose -f docker-compose.test.yml run --rm test bash -c "flake8 server/ && eslint client/"

# Generate test coverage report
.PHONY: coverage
coverage:
	@echo "{\"timestamp\":\"$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")\",\"level\":\"INFO\",\"component\":\"Makefile\",\"message\":\"Generating test coverage report\"}"
	ENV_FILE=$(TEST_ENV_FILE) TEST_COVERAGE=true docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
	@echo "{\"timestamp\":\"$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")\",\"level\":\"INFO\",\"component\":\"Makefile\",\"message\":\"Coverage report generated in ./coverage/\"}"
