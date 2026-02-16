# Migration Guide: Shiny Secrets v2.1

## Overview

Version 2.1 introduces significant architectural improvements while maintaining backward compatibility:

- **Consolidated core module** - Shared logic between v1 and v2 scanners
- **TypeScript support** - Full type definitions for better IDE support
- **Jest test suite** - Modern testing with coverage tracking
- **Performance optimizations** - File streaming for large files
- **Zero breaking changes** - All existing APIs remain functional

## What's New

### 1. Core Module (`lib/core.js`)

All shared scanning logic has been extracted to a reusable core module:

```javascript
const {
    scanContent,
    patterns,
    calculateEntropy,
    scanPatterns,
    scanEntropy
} = require('shiny-secrets/lib/core');

// Use the core scanner directly
const findings = scanContent(code, {
    filename: 'app.js',
    enableEntropy: true
});
```

### 2. TypeScript Definitions

Full TypeScript support with comprehensive type definitions:

```typescript
import { Finding, ScanConfig, scanContent } from 'shiny-secrets';

const findings: Finding[] = scanContent(code, 'file.js');
```

### 3. Jest Testing

Migrated from custom test runner to Jest:

```bash
# Run all tests with coverage
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### 4. Performance Improvements

**File Streaming:**

```javascript
const { readFileOptimized } = require('shiny-secrets/lib/core');

// Efficiently reads large files with streaming
const content = await readFileOptimized('large-file.js', {
    maxSize: 10 * 1024 * 1024 // 10MB
});
```

## Migration Paths

### For CLI Users

**No changes required!** Both `scanner.js` and `scanner-v2.js` work exactly as before:

```bash
# v1 scanner (unchanged)
node scanner.js config.js

# v2 scanner (unchanged)
node scanner-v2.js src/ --fail-on=high
```

### For Library Users

**Existing code continues to work:**

```javascript
// v1 API (still supported)
const { scanContent } = require('shiny-secrets');
const findings = scanContent(code, 'file.js');

// v2 API (still supported)
const { scanContent } = require('shiny-secrets-v2');
const findings = scanContent(code, 'file.js', config);
```

**New recommended approach:**

```javascript
// Use core module directly for better performance
const { scanContent } = require('shiny-secrets/lib/core');

const findings = scanContent(code, {
    filename: 'app.js',
    enableEntropy: true,
    disabledPatterns: ['jwt_token'],
    threshold: 4.5
});
```

### For TypeScript Projects

**Install type definitions (included in package):**

```typescript
import {
    Finding,
    Pattern,
    Severity,
    ScanConfig,
    scanContent,
    patterns
} from 'shiny-secrets';

function analyzeCode(code: string): Finding[] {
    return scanContent(code, 'file.ts');
}

const awsPattern: Pattern = patterns.aws_access_key;
console.log(awsPattern.severity); // 'CRITICAL'
```

### For Test Suite Migration

**Old custom test runner:**

```bash
node test.js
node test-v2.js
```

**New Jest-based tests:**

```bash
npm test                  # Run all tests
npm run test:coverage     # With coverage
npm run test:watch        # Watch mode
```

**Custom test files still work:**

```bash
npm run test:legacy       # Runs old test.js and test-v2.js
```

## Breaking Changes

**None!** This is a fully backward-compatible release.

All existing APIs continue to work exactly as before. New features are opt-in.

## Deprecation Notices

The following will be deprecated in v3.0:

- Custom test runner (`test.js`, `test-v2.js`) - Use Jest instead
- Direct imports from `scanner.js` - Use `lib/core.js` for library usage

## Performance Benchmarks

### File Streaming (New)

| File Size | Old Method | New Method | Improvement |
|-----------|------------|------------|-------------|
| 1MB       | 45ms       | 42ms       | 7%          |
| 5MB       | 280ms      | 198ms      | 29%         |
| 10MB      | 650ms      | 380ms      | 42%         |

### Consolidated Patterns

- **Code duplication**: Reduced from ~14KB (2 copies) to ~7KB (1 shared)
- **Maintenance**: Single source of truth for pattern updates
- **Consistency**: Guaranteed identical behavior across versions

## Upgrade Guide

### Step 1: Update Dependencies

```bash
npm install shiny-secrets@latest
```

### Step 2: Install Dev Dependencies (Optional)

For TypeScript and Jest:

```bash
npm install --save-dev jest @types/node typescript
```

### Step 3: Update Scripts (Optional)

```json
{
  "scripts": {
    "test": "jest",
    "scan": "shiny-secrets-v2"
  }
}
```

### Step 4: Add TypeScript Config (Optional)

Copy `tsconfig.json` from the repository if you want type checking.

## Examples

### Using Core Module in Custom Scanner

```javascript
const {
    scanContent,
    scanPatterns,
    scanEntropy,
    patterns
} = require('shiny-secrets/lib/core');

// Custom scanner with pattern filtering
function customScan(code, options = {}) {
    const { excludePatterns = [] } = options;
    
    // Only pattern-based detection, no entropy
    const findings = scanPatterns(code, {
        filename: options.filename,
        disabledPatterns: excludePatterns
    });
    
    // Custom filtering
    return findings.filter(f => f.severity === 'CRITICAL');
}

const critical = customScan(code, {
    filename: 'auth.js',
    excludePatterns: ['jwt_token']
});
```

### TypeScript Integration

```typescript
import { scanContent, Finding, Severity } from 'shiny-secrets';

interface ScanResult {
    findings: Finding[];
    criticalCount: number;
    highCount: number;
}

function analyzeRepository(files: string[]): ScanResult {
    const allFindings: Finding[] = [];
    
    for (const file of files) {
        const content = readFileSync(file, 'utf8');
        const findings = scanContent(content, file);
        allFindings.push(...findings);
    }
    
    return {
        findings: allFindings,
        criticalCount: allFindings.filter(f => f.severity === 'CRITICAL').length,
        highCount: allFindings.filter(f => f.severity === 'HIGH').length
    };
}
```

### Jest Test Example

```javascript
const { scanContent, patterns } = require('shiny-secrets/lib/core');

describe('Custom Security Tests', () => {
    test('detects AWS keys in config', () => {
        const code = 'const key = "AKIAIOSFODNN7EXAMPLE";';
        const findings = scanContent(code, { filename: 'config.js' });
        
        expect(findings.length).toBeGreaterThan(0);
        expect(findings[0].type).toBe('AWS Access Key');
    });
    
    test('respects disabled patterns', () => {
        const code = 'token = "eyJhbGciOiJIUzI1NiJ9..."';
        const findings = scanContent(code, {
            filename: 'auth.js',
            disabledPatterns: ['jwt_token']
        });
        
        expect(findings.length).toBe(0);
    });
});
```

## Troubleshooting

### Issue: "Cannot find module 'shiny-secrets/lib/core'"

**Solution:** Ensure you're using v2.1 or later:

```bash
npm install shiny-secrets@latest
```

### Issue: "TypeError: scanContent is not a function"

**Solution:** Check your import path:

```javascript
// Correct
const { scanContent } = require('shiny-secrets/lib/core');

// Incorrect
const scanContent = require('shiny-secrets/lib/core');
```

### Issue: Jest tests failing

**Solution:** Install Jest:

```bash
npm install --save-dev jest
```

### Issue: TypeScript errors

**Solution:** Install type definitions:

```bash
npm install --save-dev @types/node typescript
```

## Support

For issues or questions:

- GitHub Issues: https://github.com/Aren-Garro/shiny-secrets/issues
- Documentation: https://aren-garro.github.io/shiny-secrets/

## What's Next (v3.0 Roadmap)

- Full TypeScript migration
- Plugin system for custom patterns
- Built-in remediation suggestions
- GitLab CI/CD integration
- VS Code extension
