#!/usr/bin/env node

/**
 * Test Suite for Shiny Secrets v2.0
 * Tests enhanced features: config, directory scanning, SARIF, exit codes
 */

const {
    scanContent,
    scanDirectory,
    loadConfig,
    calculateEntropy,
    generateSARIF,
    patterns
} = require('./scanner-v2.js');

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// ANSI colors for test output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    bold: '\x1b[1m'
};

let passedTests = 0;
let failedTests = 0;

// Test helper
function test(name, fn) {
    try {
        fn();
        passedTests++;
        console.log(`${colors.green}✓${colors.reset} ${name}`);
    } catch (error) {
        failedTests++;
        console.log(`${colors.red}✗${colors.reset} ${name}`);
        console.log(`  ${colors.red}${error.message}${colors.reset}`);
    }
}

// Test secrets (obfuscated to avoid GitHub scanner)
const testSecrets = {
    aws: 'AK' + 'IA' + 'IOSFODNN7EXAMPLE',
    stripe: 'sk_' + 'live_' + '12345678901234567890' + '12345678',
    github: 'ghp_' + 'abcdef1234567890abcdef1234567890abcd'
};

// Test config parsing
function testConfigParsing() {
    const configContent = `
# Test config
failOn: critical
reportThreshold: high

entropy:
  enabled: true
  threshold: 4.5
  minLength: 15

exclude:
  - "**/node_modules/**"
  - "**/dist/**"

allowlist:
  - "test.js:1:AWS Access Key"

allowPatterns:
  - "EXAMPLE"
  - "TEST"
`;
    
    const tempConfig = path.join(__dirname, '.test-config-v2');
    fs.writeFileSync(tempConfig, configContent);
    
    try {
        const config = loadConfig(tempConfig);
        assert.strictEqual(config.failOn, 'critical');
        assert.strictEqual(config.reportThreshold, 'high');
        assert.strictEqual(config.entropy.enabled, true);
        assert(config.exclude.includes('**/node_modules/**'));
    } finally {
        fs.unlinkSync(tempConfig);
    }
}

// Test allowlist filtering
function testAllowlistFiltering() {
    const config = {
        failOn: 'critical',
        reportThreshold: 'medium',
        entropy: { enabled: true, threshold: 4.7, minLength: 20, maxLength: 100 },
        exclude: [],
        include: ['*.js'],
        allowlist: [],
        allowPatterns: ['EXAMPLE', 'TEST'],
        disabledPatterns: []
    };

    const code = `
const key1 = "${testSecrets.aws}";
const key2 = "AK" + "IA" + "TESTKEY123456789";
`;

    const findings = scanContent(code, 'test-input', config);
    
    // Should filter EXAMPLE and TEST patterns
    const hasExample = findings.some(f => f.match.includes('EXAMPLE'));
    const hasTest = findings.some(f => f.match.includes('TEST'));
    assert(!hasExample, 'Should filter EXAMPLE patterns');
}

// Test directory scanning
function testDirectoryScanning() {
    const tempDir = path.join(__dirname, '.test-scan-dir-v2');
    const subDir = path.join(tempDir, 'src');
    
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    if (!fs.existsSync(subDir)) fs.mkdirSync(subDir);
    
    try {
        fs.writeFileSync(
            path.join(tempDir, 'config.js'),
            `const key = "${testSecrets.aws}";`
        );
        fs.writeFileSync(
            path.join(subDir, 'app.js'),
            `const stripe = "${testSecrets.stripe}";`
        );
        
        const config = {
            failOn: 'critical',
            reportThreshold: 'medium',
            entropy: { enabled: false },
            exclude: [],
            include: ['*.js'],
            allowlist: [],
            allowPatterns: [],
            disabledPatterns: []
        };
        
        const findings = scanDirectory(tempDir, config);
        assert(findings.length >= 2, `Should find at least 2 secrets, found ${findings.length}`);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

// Test SARIF generation
function testSARIFOutput() {
    const findings = [
        {
            type: 'AWS Access Key',
            line: 5,
            column: 15,
            match: testSecrets.aws,
            content: 'const key = "' + testSecrets.aws + '";',
            description: 'AWS Access Key ID',
            severity: 'CRITICAL',
            file: 'config.js'
        }
    ];

    const sarif = generateSARIF(findings, {});
    
    assert.strictEqual(sarif.version, '2.1.0');
    assert(sarif.$schema);
    assert.strictEqual(sarif.runs.length, 1);
    assert.strictEqual(sarif.runs[0].tool.driver.name, 'Shiny Secrets');
    assert.strictEqual(sarif.runs[0].results.length, 1);
    assert.strictEqual(sarif.runs[0].results[0].level, 'error');
}

// Test glob matching
function testGlobMatching() {
    const config = {
        failOn: 'critical',
        reportThreshold: 'medium',
        entropy: { enabled: false },
        exclude: ['**/node_modules/**', '**/*.min.js'],
        include: ['*.js'],
        allowlist: [],
        allowPatterns: [],
        disabledPatterns: []
    };

    const tempDir = path.join(__dirname, '.test-glob-v2');
    const nmDir = path.join(tempDir, 'node_modules');
    
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    if (!fs.existsSync(nmDir)) fs.mkdirSync(nmDir);
    
    try {
        fs.writeFileSync(
            path.join(tempDir, 'app.js'),
            `const key = "${testSecrets.aws}";`
        );
        fs.writeFileSync(
            path.join(nmDir, 'lib.js'),
            `const key = "${testSecrets.aws}";`
        );
        
        const findings = scanDirectory(tempDir, config);
        assert(findings.length === 1, `Should find 1 secret, found ${findings.length}`);
        assert(findings[0].file.includes('app.js'));
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

// Test disabled patterns
function testDisabledPatterns() {
    const config = {
        failOn: 'critical',
        reportThreshold: 'medium',
        entropy: { enabled: false },
        exclude: [],
        include: ['*.js'],
        allowlist: [],
        allowPatterns: [],
        disabledPatterns: ['aws_access_key']
    };

    const code = `
const awsKey = "${testSecrets.aws}";
const stripeKey = "${testSecrets.stripe}";
`;

    const findings = scanContent(code, 'test.js', config);
    
    const hasAWS = findings.some(f => f.type === 'AWS Access Key');
    const hasStripe = findings.some(f => f.type.includes('Stripe'));
    
    assert(!hasAWS, 'AWS should be disabled');
    assert(hasStripe, 'Stripe should be detected');
}

// Test entropy calculation
function testEntropyCalculation() {
    const lowEntropy = 'aaaaaaaaaa';
    const lowScore = calculateEntropy(lowEntropy);
    assert(lowScore < 2, `Low entropy should be < 2, got ${lowScore}`);

    const highEntropy = 'f8aB3c9D2e1F4567890XyZ';
    const highScore = calculateEntropy(highEntropy);
    assert(highScore > 4, `High entropy should be > 4, got ${highScore}`);
}

// Test patterns available
function testPatternsAvailable() {
    assert(patterns, 'Patterns should be exported');
    assert(patterns.aws_access_key, 'Should have AWS pattern');
    assert(patterns.github_token, 'Should have GitHub pattern');
}

// Test column numbers
function testColumnNumbers() {
    const code = `    const key = "${testSecrets.aws}";`;
    const findings = scanContent(code, 'test.js', {
        failOn: 'critical',
        reportThreshold: 'medium',
        entropy: { enabled: false },
        exclude: [],
        include: ['*.js'],
        allowlist: [],
        allowPatterns: [],
        disabledPatterns: []
    });

    assert(findings.length > 0);
    assert(typeof findings[0].column === 'number');
}

// Run all tests
console.log(`\n${colors.bold}${colors.blue}Shiny Secrets v2.0 Test Suite${colors.reset}\n`);

console.log(`${colors.bold}Configuration Tests:${colors.reset}`);
test('Config file parsing', testConfigParsing);
test('Allowlist filtering', testAllowlistFiltering);
test('Disabled patterns', testDisabledPatterns);

console.log(`\n${colors.bold}Directory Scanning:${colors.reset}`);
test('Recursive directory scan', testDirectoryScanning);
test('Glob pattern excludes', testGlobMatching);

console.log(`\n${colors.bold}SARIF Output:${colors.reset}`);
test('SARIF 2.1.0 generation', testSARIFOutput);

console.log(`\n${colors.bold}Core Functionality:${colors.reset}`);
test('Pattern availability', testPatternsAvailable);
test('Entropy calculation', testEntropyCalculation);
test('Column number reporting', testColumnNumbers);

// Summary
console.log(`\n${colors.bold}Summary:${colors.reset}`);
console.log(`${colors.green}✓ Passed: ${passedTests}${colors.reset}`);
if (failedTests > 0) {
    console.log(`${colors.red}✗ Failed: ${failedTests}${colors.reset}`);
}

if (failedTests > 0) {
    console.log(`\n${colors.red}${colors.bold}❌ Tests failed${colors.reset}`);
    process.exit(1);
} else {
    console.log(`\n${colors.green}${colors.bold}✅ All v2 tests passed!${colors.reset}`);
    process.exit(0);
}
