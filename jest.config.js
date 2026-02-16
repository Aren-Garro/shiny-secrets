/**
 * Jest Configuration
 * For testing secret scanner functionality
 */

module.exports = {
    // Test environment
    testEnvironment: 'node',

    // Test match patterns
    testMatch: [
        '**/tests/**/*.test.js',
        '**/tests/**/*.spec.js'
    ],

    // Coverage configuration
    collectCoverage: false,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    
    // Files to collect coverage from
    collectCoverageFrom: [
        'lib/**/*.js',
        'scanner.js',
        'scanner-v2.js',
        '!**/node_modules/**',
        '!**/tests/**',
        '!**/coverage/**'
    ],

    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },

    // Verbose output
    verbose: true,

    // Clear mocks between tests
    clearMocks: true,

    // Restore mocks between tests
    restoreMocks: true,

    // Timeout for tests (10 seconds)
    testTimeout: 10000,

    // Module paths
    modulePaths: ['<rootDir>'],

    // Transform files (if needed for future TypeScript support)
    transform: {},

    // Files to setup test environment
    setupFilesAfterEnv: [],

    // Ignore patterns
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/build/',
        '/.git/'
    ],

    // Watch plugins
    watchPlugins: [
        'jest-watch-typeahead/filename',
        'jest-watch-typeahead/testname'
    ].filter(plugin => {
        try {
            require.resolve(plugin);
            return true;
        } catch {
            return false;
        }
    })
};
