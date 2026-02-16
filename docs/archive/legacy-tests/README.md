# Legacy Test Files

This directory contains legacy test files that have been archived for reference and backward compatibility.

## Current Test Suite

The project now uses **Jest** as the primary testing framework. See:
- `tests/core.test.js` - Current Jest test suite
- `package.json` - Run `npm test` to execute Jest tests

## Archived Files

### test.js (V1 Legacy Tests)
Original comprehensive test suite for Shiny Secrets V1.
- Pattern detection tests
- Entropy calculation tests
- False positive prevention
- Edge case handling

**Note:** Requires `../../../scanner.js` to run

### test-v2.js (V2 Legacy Tests)
Test suite for Shiny Secrets V2 enhanced features.
- Configuration file parsing
- Directory scanning
- SARIF output generation
- Glob pattern matching
- Allowlist filtering

**Note:** Requires `../../../scanner-v2.js` to run

## Running Legacy Tests

If needed for backward compatibility testing:

```bash
# From repository root
node docs/archive/legacy-tests/test.js
node docs/archive/legacy-tests/test-v2.js
```

## Maintenance

These files are **archived** and not actively maintained. They are kept for:
1. Historical reference
2. Understanding test evolution
3. Backward compatibility validation
4. Migration path documentation

For new tests, use the Jest framework in `tests/` directory.
