# Testing Guide for Shiny Secrets

## Overview

This document provides comprehensive information about testing the Shiny Secrets scanner, including how to run tests, add new tests, and understand test failures.

## Running Tests

### Run All Tests
```bash
npm test
```

This runs both v1 and v2 test suites.

### Run Individual Test Suites

**V1 Scanner Tests:**
```bash
npm run test:v1
# or
node test.js
```

**V2 Scanner Tests:**
```bash
npm run test:v2
# or
node test-v2.js
```

### Run with Validation
```bash
npm run validate
```

Runs both tests and linting.

## Test Structure

### V1 Test Suite (`test.js`)

Tests the original scanner with focus on:
- Pattern detection for 21+ secret types
- Entropy calculation and high-entropy string detection
- False positive prevention
- Edge cases and error handling
- Performance benchmarks
- Multiline detection
- Integration scenarios

### V2 Test Suite (`test-v2.js`)

Tests the enhanced scanner with focus on:
- Configuration file parsing
- Directory scanning and glob patterns
- SARIF 2.1.0 output generation
- Allowlist and pattern filtering
- Column number reporting
- Cross-platform compatibility

## Test Secrets Format

### Important: Obfuscated Test Secrets

All test secrets are obfuscated to avoid triggering GitHub's secret scanning:

```javascript
const TEST_SECRETS = {
    AWS_KEY: 'AKIA' + 'IOSFODNN7EXAMPLE',
    STRIPE_LIVE: 'sk_' + 'live_4eC39HqLyjWDarjtT1zdp7dc',
    // ... etc
};
```

### Format Requirements

Test secrets must match **exact** regex patterns from the scanner:

| Pattern | Format | Example |
|---------|--------|----------|
| AWS Access Key | `AKIA[16 chars]` | `AKIAIOSFODNN7EXAMPLE` |
| Stripe Live | `sk_live_[24+ chars]` | `sk_live_4eC39HqLyjWDarjtT1zdp7dc` |
| GitHub Token | `ghp_[36+ chars]` | `ghp_16C7e42F292c6912E7710c838347Ae178B4a` |
| SendGrid | `SG.[22 chars].[43 chars]` | `SG.aaaaaaaaaaaaaaaaaaaaaa.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb` |
| High Entropy | 20+ chars, entropy > 4.7 | `K9mP2nQ7wE5rT8yU4iO6pH1j` |

## Adding New Tests

### Pattern Detection Test

```javascript
test('Detects [Secret Type]', () => {
    const code = `const secret = "${TEST_SECRETS.YOUR_SECRET}";`;
    const findings = scanContent(code);
    assertContains(findings, 'Secret Type Name');
});
```

### False Positive Prevention Test

```javascript
test('Does NOT flag [scenario]', () => {
    const code = 'some code that should not trigger';
    const findings = scanContent(code);
    const specificFindings = findings.filter(f => f.type === 'Pattern Name');
    assertEquals(specificFindings.length, 0, 'Should not detect [scenario]');
});
```

## Common Test Failures

### 1. SendGrid Pattern Mismatch

**Error:**
```
✗ Detects SendGrid Key
  Expected array to contain SendGrid API Key
```

**Cause:** SendGrid test secret doesn't match `SG.[22 chars].[43 chars]` format.

**Fix:**
```javascript
SENDGRID: 'SG.' + 'a'.repeat(22) + '.' + 'b'.repeat(43)
```

### 2. High Entropy String Not Detected

**Error:**
```
✗ Detects high entropy string in code
  Expected array to contain High Entropy String
```

**Cause:** Test string doesn't exceed 4.7 entropy threshold.

**Fix:** Use a string with mixed case, numbers, and high randomness:
```javascript
HIGH_ENTROPY: 'K9mP2nQ7wE5rT8yU4iO6pH1j'  // entropy ~4.8
```

### 3. Exit Code Mismatch

**Error:**
```
Test suite exited with code 1 but no failures reported
```

**Cause:** Exit code logic bug where `process.exit(1)` runs before conditional checks.

**Fix:** Ensure conditional exit codes are checked before unconditional exit:
```javascript
// Correct order
if (options.failOnCritical) {
    const hasCritical = findings.some(f => f.severity === 'CRITICAL');
    process.exit(hasCritical ? 1 : 0);
}
process.exit(findings.length > 0 ? 1 : 0);
```

### 4. Glob Pattern Failures

**Error:**
```
✗ Glob pattern excludes
  Should find 1 secret, found 2
```

**Cause:** Glob matching bug where dot escaping happens after wildcard expansion.

**Fix:** Ensure proper order in `matchesGlob` function:
```javascript
// Escape dots BEFORE wildcard expansion
pattern = pattern.replace(/\./g, '\\.');
pattern = pattern.replace(/\*\*/g, '.*');
pattern = pattern.replace(/\*/g, '[^/]*');
```

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Push to `main` branch
- Pull requests to `main`
- Multiple OS: Ubuntu, macOS, Windows
- Multiple Node versions: 14.x, 16.x, 18.x, 20.x

### Local Pre-commit Hook

```bash
# Copy pre-commit hook
cp pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Performance Benchmarks

### Expected Performance

- **Small files** (<1000 lines): <100ms
- **Medium files** (1000-5000 lines): <500ms
- **Large files** (10000+ lines): <5000ms

### Performance Test

```javascript
test('Scans large file quickly', () => {
    const largeCode = 'const x = 1;\n'.repeat(10000) + secret;
    const startTime = Date.now();
    const findings = scanContent(largeCode);
    const duration = Date.now() - startTime;
    
    assert(duration < 5000, `Scan took ${duration}ms, should be < 5000ms`);
});
```

## Debugging Tests

### Verbose Output

Modify test helper for debugging:

```javascript
function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
    } catch (error) {
        console.log(`✗ ${name}`);
        console.log(`  Error: ${error.message}`);
        console.log(`  Stack: ${error.stack}`);  // Add this for debugging
        testsFailed++;
    }
}
```

### Inspect Findings

```javascript
test('Debug test', () => {
    const code = `test code here`;
    const findings = scanContent(code);
    console.log('Findings:', JSON.stringify(findings, null, 2));
    // Continue with assertions...
});
```

## Test Coverage Goals

- **Pattern Detection**: 100% of patterns tested
- **False Positives**: All known false positive scenarios covered
- **Edge Cases**: Empty input, special chars, long lines, binary data
- **Integration**: Multi-secret files, realistic configs
- **Performance**: Large file benchmarks
- **Cross-platform**: Tests pass on Linux, macOS, Windows

## Contributing Tests

When adding new patterns or features:

1. **Add positive test** - Verify pattern detects the secret
2. **Add negative test** - Verify no false positives
3. **Test edge cases** - Boundary conditions, special formats
4. **Update test secrets** - Add obfuscated test secret if needed
5. **Run full suite** - Ensure no regressions

## Resources

- [Scanner.js patterns](./scanner.js) - V1 detection patterns
- [Scanner-v2.js patterns](./scanner-v2.js) - V2 enhanced patterns
- [CI Configuration](.github/workflows/ci.yml) - GitHub Actions setup
- [Bug Reports](./BUG_REPORT.md) - Known issues and fixes

## Questions?

For test-related issues:
1. Check [BUG_REPORT.md](./BUG_REPORT.md) for known issues
2. Review [CHANGELOG.md](./CHANGELOG.md) for recent fixes
3. Open an issue with test failure details
