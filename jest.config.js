/**
 * Jest configuration for frontend tests
 */
export default {
  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",

  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: "v8",

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    "client/js/**/*.js",
    "!client/js/lib/**", // Exclude third-party libraries
    "!client/js/**/*.min.js", // Exclude minified files
    "!**/node_modules/**"
  ],

  // The test environment that will be used for testing
  testEnvironment: "jsdom",

  // Configure coverage targets and thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // A list of paths to directories that Jest should use to search for files in
  roots: [
    "<rootDir>/client",
    "<rootDir>/tests"
  ],

  // The glob patterns Jest uses to detect test files
  testMatch: [
    "**/tests/frontend/**/*.test.js"
  ],

  // File extensions your modules use
  moduleFileExtensions: ["js", "json"],

  // A map from regular expressions to module names that allow to stub out resources
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "<rootDir>/tests/frontend/mocks/styleMock.js",
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/tests/frontend/mocks/fileMock.js"
  },

  // Configure testing-library
  setupFilesAfterEnv: [
    "<rootDir>/tests/frontend/setup.js"
  ],

  // Transform files with babel
  transform: {
    "^.+\\.js$": "babel-jest"
  },

  // Indicates whether each individual test should be reported during the run
  verbose: true
};
