# Sky Squad: Testing Strategy

## Overview

This document outlines the testing strategy for the Sky Squad flight simulator, adhering to the Windsurf AI IDE Python development guidelines. The testing approach ensures code quality, performance, and reliability across all components of the application.

## Testing Environment Configuration

The testing environment has been configured with the following features:

1. **Flexible Environment Variables**
   - Default values defined in `docker-compose.test.yml`
   - Override capability with `.env.test` file
   - Custom environment file specification via `ENV_FILE` parameter

2. **Standardized Test Configuration**
   - Example configuration in `.env.test.example`
   - CI/CD workflow in GitHub Actions
   - Consistent environment across local and CI environments

3. **Key Configuration Files**
   - `docker-compose.test.yml`: Container configuration with environment variables
   - `scripts/run_tests.sh`: Enhanced environment variable handling
   - `Makefile`: Simplified test commands with environment support
   - `.github/workflows/ci.yml`: CI pipeline with proper test environment

## Testing Levels

### 1. Unit Testing

Unit tests focus on testing individual components in isolation, ensuring each function and method works as expected.

```python
# Example of a well-structured unit test following Python best practices
import unittest
import logging
from unittest.mock import MagicMock
from server.game_state import GameState

class GameStateTest(unittest.TestCase):
    def setUp(self):
        # Configure test logger to use JSON format
        self.logger = logging.getLogger("test_logger")
        # Initialize test dependencies
        self.mock_db = MagicMock()
        # Create the system under test
        self.game_state = GameState(self.mock_db, self.logger)
    
    def test_add_star(self):
        """Test that stars are added correctly to the game state."""
        # Arrange
        star_id = "test_star"
        position = {"x": 1.5, "y": 2.0}
        
        # Act
        result = self.game_state.add_star(star_id, position)
        
        # Assert
        self.assertTrue(result)
        self.assertIn(star_id, self.game_state.stars)
        self.assertEqual(self.game_state.stars[star_id], position)
```

### 2. Integration Testing

Integration tests verify that different components work together correctly, focusing on communication interfaces.

```python
# Example of integration test for WebSocket communication
import unittest
import asyncio
from server.main import app
from fastapi.testclient import TestClient

class WebSocketIntegrationTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        
    def test_websocket_connection(self):
        """Test WebSocket connection and basic communication."""
        with self.client.websocket_connect("/ws") as websocket:
            # Send join event
            websocket.send_json({"type": "join", "username": "test_user"})
            
            # Receive response
            data = websocket.receive_json()
            
            # Assert correct response
            self.assertIn("state", data)
            self.assertIn("players", data["state"])
```

### 3. End-to-End Testing

E2E tests simulate real user interactions to ensure the entire system works together correctly.

```python
# Example of end-to-end test using pytest
import pytest
from selenium import webdriver
from selenium.webdriver.common.keys import Keys

@pytest.fixture
def browser():
    """Set up and tear down browser for tests."""
    driver = webdriver.Chrome()
    driver.implicitly_wait(10)
    yield driver
    driver.quit()

def test_user_login_and_play(browser):
    """Test that a user can log in and begin playing the game."""
    # Navigate to application
    browser.get("http://localhost:8000")
    
    # Log in
    username_input = browser.find_element_by_id("username")
    username_input.send_keys("test_user")
    password_input = browser.find_element_by_id("password")
    password_input.send_keys("password123")
    browser.find_element_by_id("login-button").click()
    
    # Verify game loaded
    game_canvas = browser.find_element_by_id("gameCanvas")
    assert game_canvas.is_displayed()
    
    # Verify player can move
    browser.find_element_by_tag_name("body").send_keys(Keys.ARROW_UP)
    # Additional assertions for movement
```

## Performance Testing

Performance tests evaluate the system's responsiveness, stability, and resource usage under various conditions.

```python
# Example of performance test for star generation
import time
import unittest
from server.game_state import GameState

class PerformanceTest(unittest.TestCase):
    def test_star_generation_performance(self):
        """Test that star generation performs within acceptable limits."""
        game_state = GameState()
        
        # Measure time to generate 1000 stars
        start_time = time.time()
        for i in range(1000):
            game_state.generate_star()
        end_time = time.time()
        
        # Assert performance within acceptable range
        execution_time = end_time - start_time
        self.assertLess(execution_time, 1.0)  # Should take less than 1 second
```

## Test Automation

### 1. Continuous Integration

Tests are automatically run on GitHub Actions for every pull request and push to the main branch.

```yaml
# Example workflow from .github/workflows/ci.yml
name: Test and Deploy
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.9'
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install -r requirements-dev.txt
      - name: Run unit tests
        run: pytest tests/backend/
      - name: Run integration tests
        run: pytest tests/integration/
```

### 2. Local Test Execution

The Makefile provides convenient commands for running tests locally:

```makefile
# Commands from Makefile
.PHONY: test test-unit test-integration test-e2e

# Run all tests
test:
	ENV_FILE=.env.test ./scripts/run_tests.sh

# Run only unit tests
test-unit:
	ENV_FILE=.env.test ./scripts/run_tests.sh unit

# Run only integration tests
test-integration:
	ENV_FILE=.env.test ./scripts/run_tests.sh integration

# Run only end-to-end tests
test-e2e:
	ENV_FILE=.env.test ./scripts/run_tests.sh e2e
```

## Code Quality Tools

### 1. Static Analysis

Static analysis tools help maintain code quality and catch potential issues early.

- **Pyright**: For type checking and syntax error detection
- **Pylint/Flake8**: For enforcing PEP 8 standards and flagging unused imports/variables

```bash
# Example command for running static analysis
pylint server/ tests/ --rcfile=.pylintrc
```

### 2. Code Coverage

Code coverage tools track which parts of the code are executed during tests.

```bash
# Example command for generating coverage report
pytest --cov=server --cov-report=html tests/
```

## Testing Best Practices

1. **Follow AAA Pattern**
   - Arrange: Set up test prerequisites
   - Act: Execute the system under test
   - Assert: Verify the outcomes

2. **Use Proper Error Handling**
   - Implement try/except blocks for robust error handling
   - Validate input parameters
   - Log errors in JSON format

3. **Maintain Test Independence**
   - Each test should run independently of others
   - Clean up resources after tests
   - Use fixtures for common setup/teardown

4. **Use Descriptive Test Names**
   - Test names should clearly describe what is being tested
   - Include expected behavior in the name

5. **Implement Logging in Tests**
   - Use Python's logging module with JSON format
   - Log test steps and outcomes
   - Avoid print statements

```python
# Example of proper logging in tests
import json
import logging

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module
        }
        return json.dumps(log_record)

def setup_test_logger():
    logger = logging.getLogger("test_logger")
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    return logger
```

## Test Data Management

1. **Use Fixtures**
   - Create reusable test fixtures
   - Define standard test data

2. **Mock External Dependencies**
   - Use mocking frameworks for external services
   - Create realistic mock responses

3. **Manage Test Database**
   - Use in-memory databases for unit tests
   - Reset database state between tests

```python
# Example of database fixture
@pytest.fixture
def test_db():
    """Create in-memory test database."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
```

## Test Documentation

1. **Document Test Purpose**
   - Include docstrings explaining test intent
   - Document expected outcomes

2. **Document Test Data**
   - Explain test data generation
   - Document edge cases being tested

3. **Document Test Environment**
   - Document required configuration
   - Explain environment setup

---

*This document is continuously updated as development progresses.*
