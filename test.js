#!/usr/bin/env node

/**
 * Shiny Secrets - Test Suite
 * Comprehensive smoke tests and validation
 */

const { scanContent, patterns, calculateEntropy } = require('./scanner.js');
const assert = require('assert');

// ANSI colors
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    bold: '\x1b[1m'
};

let testsPassed = 0;
let testsFailed = 0;

// Test secrets (obfuscated to avoid GitHub secret scanning)
const TEST_SECRETS = {
    AWS_KEY: 'AKIA' + 'IOSFODNN7EXAMPLE',
    AWS_SECRET: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCY' + 'EXAMPLEKEY',
    STRIPE_LIVE: 'sk_' + 'live_4eC39HqLyjWDarjtT1zdp7dc',
    STRIPE_TEST: 'sk_' + 'test_4eC39HqLyjWDarjtT1zdp7dc',
    GITHUB: 'ghp_' + '16C7e42F292c6912E7710c838347Ae178B4a',
    GOOGLE: 'AIza' + 'SyDaGmWKa4JsXZ-HjGw7ISLn_3namBGewQe',
    SLACK: 'xoxb-' + '123456789012-1234567890123-4ut0m4t10nt35tt0k3n',
    JWT: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
    SENDGRID: 'SG.' + 'ngeVfQFYQlKU0ufo8x5d1A.TwL2iGABf9DHoTf-09kqeF8tHHK1e4gc3VYaVfE'
};

function test(name, fn) {
    try {
        fn();
        console.log(`${colors.green}✓${colors.reset} ${name}`);
        testsPassed++;
    } catch (error) {
        console.log(`${colors.red}✗${colors.reset} ${name}`);
        console.log(`  ${colors.red}${error.message}${colors.reset}`);
        testsFailed++;
    }
}

function assertEquals(actual, expected, message) {
    assert.strictEqual(actual, expected, message);
}

function assertGreaterThan(actual, threshold, message) {
    assert(actual > threshold, message || `Expected ${actual} > ${threshold}`);
}

function assertContains(array, value, message) {
    assert(array.some(item => item.type === value), message || `Expected array to contain ${value}`);
}

console.log(`\n${colors.bold}${colors.blue}=== Shiny Secrets Test Suite ===${colors.reset}\n`);

// ========================================
// UNIT TESTS - Pattern Detection
// ========================================

console.log(`${colors.bold}Pattern Detection Tests:${colors.reset}`);

test('Detects AWS Access Key', () => {
    const code = `const key = "${TEST_SECRETS.AWS_KEY}";`;
    const findings = scanContent(code);
    assertContains(findings, 'AWS Access Key');
});

test('Detects AWS Secret Key', () => {
    const code = `aws_secret_access_key = "${TEST_SECRETS.AWS_SECRET}"`;
    const findings = scanContent(code);
    assertContains(findings, 'AWS Secret Key');
});

test('Detects Stripe Live Key', () => {
    const code = `const stripe_key = "${TEST_SECRETS.STRIPE_LIVE}";`;
    const findings = scanContent(code);
    assertContains(findings, 'Stripe Live API Key');
});

test('Detects GitHub Token', () => {
    const code = `token: "${TEST_SECRETS.GITHUB}"`;
    const findings = scanContent(code);
    assertContains(findings, 'GitHub Token');
});

test('Detects Google API Key', () => {
    const code = `const googleKey = "${TEST_SECRETS.GOOGLE}";`;
    const findings = scanContent(code);
    assertContains(findings, 'Google API Key');
});

test('Detects Slack Token', () => {
    const code = `slack_token = "${TEST_SECRETS.SLACK}"`;
    const findings = scanContent(code);
    assertContains(findings, 'Slack Token');
});

test('Detects JWT Token', () => {
    const code = `jwt = "${TEST_SECRETS.JWT}"`;
    const findings = scanContent(code);
    assertContains(findings, 'JWT Token');
});

test('Detects Private Key', () => {
    const code = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...';
    const findings = scanContent(code);
    assertContains(findings, 'Private Key');
});

test('Detects Database URL', () => {
    const code = 'db_url = "postgresql://user:pass@localhost:5432/mydb"';
    const findings = scanContent(code);
    assertContains(findings, 'Database Connection URL');
});

test('Detects SendGrid Key', () => {
    const code = `sendgrid = "${TEST_SECRETS.SENDGRID}"`;
    const findings = scanContent(code);
    assertContains(findings, 'SendGrid API Key');
});

test('Detects Password (8+ chars)', () => {
    const code = 'password = "MySecretPassword123"';
    const findings = scanContent(code);
    assertContains(findings, 'Password in Code');
});

// ========================================
// NEGATIVE TESTS - False Positive Prevention
// ========================================

console.log(`\n${colors.bold}False Positive Prevention Tests:${colors.reset}`);

test('Does NOT flag short passwords (< 8 chars)', () => {
    const code = 'password = "test"';
    const findings = scanContent(code);
    const passwordFindings = findings.filter(f => f.type === 'Password in Code');
    assertEquals(passwordFindings.length, 0, 'Should not detect passwords under 8 characters');
});

test('Does NOT flag UUIDs without Heroku context', () => {
    const code = 'const id = "550e8400-e29b-41d4-a716-446655440000";';
    const findings = scanContent(code);
    const herokuFindings = findings.filter(f => f.type === 'Heroku API Key');
    assertEquals(herokuFindings.length, 0, 'Should not detect UUIDs without Heroku context');
});

test('DOES flag UUIDs WITH Heroku context', () => {
    const code = 'HEROKU_API_KEY = "550e8400-e29b-41d4-a716-446655440000"';
    const findings = scanContent(code);
    assertContains(findings, 'Heroku API Key');
});

test('Does NOT flag example/test/demo strings', () => {
    const code = 'const exampleKey = "sk_' + 'test_example_demo_testing_key_1234567890"';
    const findings = scanContent(code);
    const entropyFindings = findings.filter(f => f.type === 'High Entropy String');
    assertEquals(entropyFindings.length, 0, 'Should not detect example/test/demo strings as high entropy');
});

test('Does NOT flag common code patterns', () => {
    const code = 'import React from "react"; const x = 123; function test() {}';
    const findings = scanContent(code);
    assertEquals(findings.length, 0, 'Should not flag normal code patterns');
});

// ========================================
// ENTROPY TESTS
// ========================================

console.log(`\n${colors.bold}Entropy Calculation Tests:${colors.reset}`);

test('Calculates entropy for random string', () => {
    const entropy = calculateEntropy('aB3xK9mP2nQ7wE5rT8');
    assertGreaterThan(entropy, 3.5, 'Random string should have high entropy');
});

test('Calculates low entropy for repeated chars', () => {
    const entropy = calculateEntropy('aaaaaaaaaa');
    assertEquals(entropy, 0, 'Repeated characters should have zero entropy');
});

test('Detects high entropy string in code', () => {
    const code = 'const secret = "dGhpc2lzYXNlY3JldGtleXRoYXRzaG91bGRub3RiZWluY29kZQ=="';
    const findings = scanContent(code);
    assertContains(findings, 'High Entropy String');
});

// ========================================
// MULTILINE TESTS
// ========================================

console.log(`\n${colors.bold}Multiline Detection Tests:${colors.reset}`);

test('Detects secrets across multiple lines', () => {
    const code = `
const config = {
    awsKey: "${TEST_SECRETS.AWS_KEY}",
    stripeKey: "${TEST_SECRETS.STRIPE_LIVE}",
    githubToken: "${TEST_SECRETS.GITHUB}"
};
`;
    const findings = scanContent(code);
    assertGreaterThan(findings.length, 2, 'Should detect multiple secrets');
});

test('Reports correct line numbers', () => {
    const code = `line 1\nline 2\nconst key = "${TEST_SECRETS.AWS_KEY}";\nline 4`;
    const findings = scanContent(code);
    assertEquals(findings[0].line, 3, 'Should report correct line number');
});

// ========================================
// EDGE CASES
// ========================================

console.log(`\n${colors.bold}Edge Case Tests:${colors.reset}`);

test('Handles empty input', () => {
    const findings = scanContent('');
    assertEquals(findings.length, 0, 'Should handle empty input');
});

test('Handles whitespace-only input', () => {
    const findings = scanContent('   \n  \n   ');
    assertEquals(findings.length, 0, 'Should handle whitespace-only input');
});

test('Handles very long lines', () => {
    const longLine = 'const x = "' + 'a'.repeat(10000) + '";';
    const findings = scanContent(longLine);
    // Should not crash
    assert(true);
});

test('Handles special characters', () => {
    const code = 'const key = "AKIA\\n\\t\\r"';
    const findings = scanContent(code);
    // Should not crash
    assert(true);
});

test('Removes duplicate findings', () => {
    const code = `
const key1 = "${TEST_SECRETS.AWS_KEY}";
const key2 = "${TEST_SECRETS.AWS_KEY}";
`;
    const findings = scanContent(code);
    assertEquals(findings.length, 2, 'Should report both occurrences but not duplicates');
});

// ========================================
// INTEGRATION TESTS
// ========================================

console.log(`\n${colors.bold}Integration Tests:${colors.reset}`);

test('Scans realistic config file', () => {
    const code = `
// Application Configuration
export const config = {
    environment: 'production',
    
    // AWS Settings
    aws: {
        accessKeyId: '${TEST_SECRETS.AWS_KEY}',
        secretAccessKey: '${TEST_SECRETS.AWS_SECRET}',
        region: 'us-east-1'
    },
    
    // Stripe
    stripe: {
        publishableKey: 'pk_live_...',
        secretKey: '${TEST_SECRETS.STRIPE_LIVE}'
    },
    
    // Database
    database: {
        url: 'postgresql://admin:password123@db.example.com:5432/mydb'
    },
    
    // API Keys
    google: '${TEST_SECRETS.GOOGLE}',
    sendgrid: '${TEST_SECRETS.SENDGRID}'
};
`;
    const findings = scanContent(code);
    assertGreaterThan(findings.length, 5, 'Should detect multiple secrets in config file');
});

test('Categorizes severity levels', () => {
    const code = `
const awsKey = "${TEST_SECRETS.AWS_KEY}";
const stripeTest = "${TEST_SECRETS.STRIPE_TEST}";
`;
    const findings = scanContent(code);
    const criticalFindings = findings.filter(f => f.severity === 'CRITICAL');
    const highFindings = findings.filter(f => f.severity === 'HIGH');
    assertGreaterThan(criticalFindings.length, 0, 'Should have critical findings');
    assertGreaterThan(highFindings.length, 0, 'Should have high findings');
});

// ========================================
// PERFORMANCE TESTS
// ========================================

console.log(`\n${colors.bold}Performance Tests:${colors.reset}`);

test('Scans large file quickly', () => {
    const largeCode = 'const x = 1;\n'.repeat(10000) + `const key = "${TEST_SECRETS.AWS_KEY}";`;
    const startTime = Date.now();
    const findings = scanContent(largeCode);
    const duration = Date.now() - startTime;
    
    assert(duration < 5000, `Scan took ${duration}ms, should be < 5000ms`);
    assertEquals(findings.length, 1, 'Should still find the secret');
});

// ========================================
// PATTERN VALIDATION
// ========================================

console.log(`\n${colors.bold}Pattern Validation Tests:${colors.reset}`);

test('All patterns have required properties', () => {
    for (let [key, pattern] of Object.entries(patterns)) {
        assert(pattern.name, `Pattern ${key} missing name`);
        assert(pattern.regex, `Pattern ${key} missing regex`);
        assert(pattern.description, `Pattern ${key} missing description`);
        assert(pattern.severity, `Pattern ${key} missing severity`);
    }
});

test('All regex patterns are valid', () => {
    for (let [key, pattern] of Object.entries(patterns)) {
        assert(pattern.regex instanceof RegExp, `Pattern ${key} regex is not a RegExp`);
    }
});

test('Pattern count is as expected', () => {
    const patternCount = Object.keys(patterns).length;
    assertGreaterThan(patternCount, 15, 'Should have at least 15 patterns');
});

// ========================================
// RESULTS
// ========================================

console.log(`\n${colors.bold}${colors.blue}=== Test Results ===${colors.reset}`);
console.log(`${colors.green}${testsPassed} passed${colors.reset}`);
if (testsFailed > 0) {
    console.log(`${colors.red}${testsFailed} failed${colors.reset}`);
}
console.log('');

if (testsFailed > 0) {
    process.exit(1);
} else {
    console.log(`${colors.green}${colors.bold}✓ All tests passed!${colors.reset}\n`);
    process.exit(0);
}
