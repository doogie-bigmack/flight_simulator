#!/usr/bin/env python3
"""
Test Runner for Sky Squad Flight Simulator
Provides a simple command-line interface to run different types of tests

Usage:
  python test_runner.py [OPTIONS]

Options:
  --all            Run all tests
  --backend        Run backend tests only
  --frontend       Run frontend tests only
  --performance    Run performance tests only
  --in-docker      Run tests in Docker environment
  --coverage       Generate test coverage report
  --verbose        Show detailed output
"""

import argparse
import json
import logging
import os
import subprocess
import sys
import time
from datetime import datetime


# Configure JSON logging
class JsonFormatter(logging.Formatter):
    """Format logs as JSON"""
    def format(self, record):
        log_record = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "component": "TestRunner",
            "message": record.getMessage()
        }
        if hasattr(record, 'data'):
            log_record.update(record.data)
        return json.dumps(log_record)


# Set up logger
logger = logging.getLogger("test_runner")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logger.addHandler(handler)


def log_info(message, **kwargs):
    """Log info message with additional data"""
    logger.info(message, extra={"data": kwargs})


def log_error(message, **kwargs):
    """Log error message with additional data"""
    logger.error(message, extra={"data": kwargs})


def run_command(command, cwd=None):
    """Run a shell command and return the result"""
    try:
        log_info(f"Running command", command=command)
        result = subprocess.run(
            command,
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=cwd,
            text=True
        )
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        log_error(
            "Command failed",
            command=command,
            exit_code=e.returncode,
            output=e.stdout,
            error=e.stderr
        )
        return False, e.stderr


def run_backend_tests(args):
    """Run backend tests"""
    log_info("Running backend tests")
    
    if args.in_docker:
        success, output = run_command("make test-backend")
    else:
        cmd = "python -m pytest tests/backend"
        if args.verbose:
            cmd += " -v"
        if args.coverage:
            cmd += " --cov=server --cov-report=html"
        success, output = run_command(cmd)
    
    if success:
        log_info("Backend tests completed successfully")
    else:
        log_error("Backend tests failed")
    
    return success


def run_frontend_tests(args):
    """Run frontend tests"""
    log_info("Running frontend tests")
    
    if args.in_docker:
        success, output = run_command("make test-frontend")
    else:
        cmd = "npx jest tests/frontend"
        if args.verbose:
            cmd += " --verbose"
        if args.coverage:
            cmd += " --coverage"
        success, output = run_command(cmd)
    
    if success:
        log_info("Frontend tests completed successfully")
    else:
        log_error("Frontend tests failed")
    
    return success


def run_performance_tests(args):
    """Run performance tests"""
    log_info("Running performance tests")
    
    if args.in_docker:
        success, output = run_command("make test-perf")
    else:
        # For local performance tests, we need a running server
        # This is simplified - real implementation would need to start the game server
        log_info("Starting game server for performance tests")
        # Start server in background
        server_process = subprocess.Popen(
            "python server/main.py", 
            shell=True, 
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        try:
            # Give the server time to start
            time.sleep(2)
            
            # Run performance tests in a browser environment
            # This is a placeholder - actual implementation depends on your setup
            log_info("Running performance tests in browser")
            cmd = "node tests/performance/run_in_browser.js"
            if args.verbose:
                cmd += " --verbose"
            success, output = run_command(cmd)
            
            if success:
                log_info("Performance tests completed successfully")
            else:
                log_error("Performance tests failed")
        finally:
            # Terminate server
            log_info("Stopping test server")
            server_process.terminate()
            server_process.wait()
    
    return success


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Test Runner for Sky Squad Flight Simulator")
    parser.add_argument("--all", action="store_true", help="Run all tests")
    parser.add_argument("--backend", action="store_true", help="Run backend tests only")
    parser.add_argument("--frontend", action="store_true", help="Run frontend tests only")
    parser.add_argument("--performance", action="store_true", help="Run performance tests only")
    parser.add_argument("--in-docker", action="store_true", help="Run tests in Docker environment")
    parser.add_argument("--coverage", action="store_true", help="Generate test coverage report")
    parser.add_argument("--verbose", action="store_true", help="Show detailed output")
    
    args = parser.parse_args()
    
    # If no specific test type is selected, run all tests
    if not (args.backend or args.frontend or args.performance or args.all):
        args.all = True
    
    start_time = time.time()
    log_info("Starting test suite", 
             test_types={"all": args.all,
                         "backend": args.backend,
                         "frontend": args.frontend,
                         "performance": args.performance},
             in_docker=args.in_docker,
             coverage=args.coverage)
    
    success = True
    
    # Run tests based on arguments
    if args.all or args.in_docker:
        if args.in_docker:
            log_info("Running all tests in Docker")
            cmd = "make test"
            if args.coverage:
                cmd = "make coverage"
            success, _ = run_command(cmd)
        else:
            if args.all or args.backend:
                if not run_backend_tests(args):
                    success = False
            
            if args.all or args.frontend:
                if not run_frontend_tests(args):
                    success = False
            
            if args.all or args.performance:
                if not run_performance_tests(args):
                    success = False
    
    # Output summary
    end_time = time.time()
    duration = end_time - start_time
    
    if success:
        log_info("All tests completed successfully", duration_seconds=duration)
        return 0
    else:
        log_error("Some tests failed", duration_seconds=duration)
        return 1


if __name__ == "__main__":
    sys.exit(main())
