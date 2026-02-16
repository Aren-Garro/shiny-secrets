# 🔐 Shiny Secrets

> **Fast, lightweight secret scanner with 21+ detection patterns, entropy analysis, and zero dependencies.**

Detect hardcoded API keys, tokens, and credentials in your codebase before they reach production. Perfect for git hooks, CI/CD pipelines, and developer workflows.

[![npm version](https://img.shields.io/npm/v/shiny-secrets.svg)](https://www.npmjs.com/package/shiny-secrets)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js CI](https://github.com/Aren-Garro/shiny-secrets/workflows/Node.js%20CI/badge.svg)](https://github.com/Aren-Garro/shiny-secrets/actions)

---

## ✨ Features

- **21+ Secret Patterns** - AWS, GitHub, Stripe, Google, Slack, JWT, private keys, and more
- **Entropy Analysis** - Detect high-randomness strings that may be secrets
- **Zero Dependencies** - Pure Node.js, no external packages
- **Modular Architecture** - Core scanning logic in `lib/core.js` shared across CLI and browser
- **TypeScript Definitions** - Full type support in `types/` directory
- **Fast & Lightweight** - Scans thousands of files in seconds
- **Directory Scanning** - Recursive scanning with glob pattern support (v2)
- **Git Integration** - Pre-commit hooks to prevent secret commits
- **CI/CD Ready** - GitHub Actions, GitLab CI, and custom pipelines
- **SARIF Output** - Export results for security dashboards (v2)
- **Configurable** - Custom patterns, severity levels, and exclusions via `.shinysecretsrc`
- **Flexible Exit Codes** - `--fail-on=critical|high|any|never` (v2)
- **Allowlist Support** - Baseline management for known findings (v2)
- **Cross-Platform** - Works on Linux, macOS, and Windows
- **Dual Versions** - v1 (simple) and v2 (enhanced features)

---

## 🚀 Quick Start

### Installation

```bash
npm install -g shiny-secrets
```

### Basic Usage

```bash
# Scan a single file
shiny-secrets config.js

# Scan entire directory (v2)
shiny-secrets-v2 src/

# Scan git staged files (pre-commit)
shiny-secrets --scan-staged

# Scan with flexible exit codes (v2)
shiny-secrets-v2 --scan-staged --fail-on=high

# Export SARIF for GitHub Code Scanning (v2)
shiny-secrets-v2 . --sarif > results.sarif
```

---

## 📦 Installation Methods

### Global CLI Installation

```bash
npm install -g shiny-secrets
shiny-secrets --help
shiny-secrets-v2 --help
```

### Project Dependency

```bash
npm install --save-dev shiny-secrets
```

Add to `package.json`:

```json
{
  "scripts": {
    "scan": "shiny-secrets --scan-staged",
    "scan:v2": "shiny-secrets-v2 --scan-staged --fail-on=critical",
    "scan:all": "shiny-secrets-v2 src/"
  }
}
```

### Git Pre-Commit Hook

```bash
# Copy pre-commit hook
cp node_modules/shiny-secrets/pre-commit .git/hooks/
chmod +x .git/hooks/pre-commit
```

Or use with [husky](https://github.com/typicode/husky):

```bash
npm install --save-dev husky
npx husky init
echo "npx shiny-secrets-v2 --scan-staged --fail-on=critical" > .husky/pre-commit
```

---

## 🏗️ Architecture

### Modular Structure

```
shiny-secrets/
├── lib/
│   ├── core.js              # Shared scanning logic (UMD module)
│   └── browser-scanner.js   # Browser-specific utilities
├── types/
│   └── index.d.ts           # TypeScript definitions
├── scanner.js               # V1 CLI (simple, single-file)
├── scanner-v2.js            # V2 CLI (enhanced, directory scanning)
├── index.html               # Web-based scanner demo
└── pre-commit               # Git pre-commit hook
```

### Core Module (`lib/core.js`)

The heart of Shiny Secrets - a UMD module that works in both Node.js and browsers:

- **Pattern Detection** - 21 built-in secret patterns
- **Entropy Analysis** - Shannon entropy calculation
- **Deduplication** - Smart finding deduplication
- **Glob Matching** - File pattern matching with `**` support
- **Cross-Environment** - Runs in CLI, browser, and as library

```javascript
const { scanContent, patterns, calculateEntropy } = require('shiny-secrets/lib/core');

const findings = scanContent('const API_KEY = "sk_live_xxxxx"', {
  filename: 'config.js',
  enableEntropy: true
});
```

### TypeScript Support

Full type definitions available:

```typescript
import { scanContent, Finding, ScanOptions } from 'shiny-secrets';

const options: ScanOptions = {
  filename: 'app.ts',
  enableEntropy: true
};

const findings: Finding[] = scanContent(code, options);
```

---

## 🔍 Detected Secrets

| Pattern | Example | Severity |
|---------|---------|----------|
| AWS Access Key | `AKIAIOSFODNN7EXAMPLE` | 🔥 CRITICAL |
| AWS Secret Key | `aws_secret_access_key = wJalr...` | 🔥 CRITICAL |
| Stripe Live Key | `sk_live_51H...` | 🔥 CRITICAL |
| Stripe Test Key | `sk_test_51H...` | ⚠️ HIGH |
| GitHub Token | `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | 🔥 CRITICAL |
| GitHub OAuth | `gho_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | 🔥 CRITICAL |
| Google API Key | `AIzaSyDaGmWKa4JsXZ-HjGw7ISLn_3namBGewQe` | ⚠️ HIGH |
| Slack Token | `xoxb-123456789012-1234567890123-xxx` | ⚠️ HIGH |
| Slack Webhook | `https://hooks.slack.com/services/T.../B.../xxx` | ⚠️ HIGH |
| JWT Token | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | 🔵 MEDIUM |
| Private Key | `-----BEGIN RSA PRIVATE KEY-----` | 🔥 CRITICAL |
| Database URL | `postgresql://user:pass@host/db` | 🔥 CRITICAL |
| Generic API Key | `api_key = "xxxxxxxxxxxxxxxxxxxx"` | ⚠️ HIGH |
| Password Field | `password = "mySecretPass123"` | ⚠️ HIGH |
| Bearer Token | `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI...` | ⚠️ HIGH |
| OAuth Token | `oauth_token = "xxxxxxxxxxxxxxxxxxxx"` | ⚠️ HIGH |
| SendGrid Key | `SG.xxxxxxxxxxxxxxxxxxxx.xxxxxxx...` | ⚠️ HIGH |
| Twilio Key | `SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | ⚠️ HIGH |
| Azure Key | `azure_key = "xxxxxxxxxxxxxxxxxxxxxxxx..."` | ⚠️ HIGH |
| Heroku API Key | `heroku_api_key = "12345678-1234-..."` | ⚠️ HIGH |
| High Entropy String | Detected via Shannon entropy ≥ 4.7 bits | 🔵 MEDIUM |

---

## 🛠️ CLI Options

### V1 Scanner (`shiny-secrets`)

Simple, single-file scanner:

```bash
shiny-secrets [options] <file>
```

| Option | Description |
|--------|-------------|
| `--scan-staged` | Scan git staged files (for pre-commit hooks) |
| `--verbose`, `-v` | Show detailed output with descriptions |
| `--json` | Output results as JSON |
| `--fail-on-critical` | Exit with code 1 if critical secrets found |
| `--help`, `-h` | Show help message |

### V2 Scanner (`shiny-secrets-v2`)

Enhanced scanner with directory scanning:

```bash
shiny-secrets-v2 [options] [file|directory]
```

| Option | Description |
|--------|-------------|
| `--scan-staged` | Scan git staged files (for pre-commit hooks) |
| `--verbose`, `-v` | Show detailed output with descriptions |
| `--json` | Output results as JSON |
| `--sarif` | Output results in SARIF format (GitHub Code Scanning) |
| `--fail-on=LEVEL` | Exit with code 1 if secrets of LEVEL or higher found |
|  | Options: `critical` (default), `high`, `any`, `never` |
| `--report-threshold=LEVEL` | Minimum severity to report |
|  | Options: `critical`, `high`, `medium` (default) |
| `--config PATH` | Path to custom config file |
| `--exclude PATTERN` | Exclude files matching pattern (can be used multiple times) |
| `--help`, `-h` | Show help message |

### Examples

```bash
# V1 - Scan specific file with verbose output
shiny-secrets config.js --verbose

# V2 - Scan directory excluding tests
shiny-secrets-v2 src/ --exclude "**/*.test.js"

# V2 - Use custom config
shiny-secrets-v2 . --config .shinysecretsrc

# V2 - Export SARIF for security dashboard
shiny-secrets-v2 src/ --sarif > results.sarif

# V2 - Fail on high or critical secrets
shiny-secrets-v2 --scan-staged --fail-on=high

# V2 - Report only critical secrets
shiny-secrets-v2 . --report-threshold=critical
```

---

## ⚙️ Configuration

Create a `.shinysecretsrc` file in your project root:

```json
{
  "failOn": "critical",
  "reportThreshold": "medium",
  "exclude": [
    "**/node_modules/**",
    "**/*.min.js",
    "**/dist/**",
    "**/*.test.js"
  ],
  "include": [
    "*.js",
    "*.ts",
    "*.jsx",
    "*.tsx",
    "*.py",
    "*.env",
    "*.config"
  ],
  "allowlist": [
    "config.js:15:AWS Access Key"
  ],
  "allowPatterns": [
    "EXAMPLE",
    "TEST",
    "DEMO",
    "PLACEHOLDER"
  ],
  "disabledPatterns": [
    "jwt_token"
  ],
  "entropy": {
    "enabled": true,
    "threshold": 4.7,
    "minLength": 20,
    "maxLength": 100
  },
  "customPatterns": [
    {
      "name": "Custom API Key",
      "regex": "CUSTOM_[A-Z0-9]{32}",
      "severity": "HIGH"
    }
  ]
}
```

See [`.shinysecretsrc.example`](.shinysecretsrc.example) for all options.

### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `failOn` | string | Exit code behavior: `critical`, `high`, `any`, `never` |
| `reportThreshold` | string | Minimum severity to report: `critical`, `high`, `medium` |
| `exclude` | array | Glob patterns to exclude |
| `include` | array | Glob patterns to include |
| `allowlist` | array | Known findings to ignore (format: `file:line:type`) |
| `allowPatterns` | array | Patterns in matches to ignore (e.g., `EXAMPLE`, `TEST`) |
| `disabledPatterns` | array | Built-in patterns to disable |
| `entropy` | object | Entropy detection settings |
| `customPatterns` | array | Custom secret patterns to add |

---

## 🔗 CI/CD Integration

### GitHub Actions

```yaml
name: Security Scan

on: [push, pull_request]

jobs:
  scan-secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install -g shiny-secrets
      - run: shiny-secrets-v2 . --fail-on=critical
```

### GitHub Code Scanning (SARIF)

```yaml
name: Code Scanning

on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g shiny-secrets
      - run: shiny-secrets-v2 . --sarif > results.sarif
      - uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: results.sarif
```

### GitLab CI

```yaml
scan-secrets:
  stage: test
  script:
    - npm install -g shiny-secrets
    - shiny-secrets-v2 . --fail-on=critical --json > secrets.json
  artifacts:
    paths:
      - secrets.json
    when: always
```

### Pre-Commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
shiny-secrets-v2 --scan-staged --fail-on=critical
if [ $? -ne 0 ]; then
  echo "❌ Secret detected! Commit blocked."
  exit 1
fi
```

---

## 📊 Output Formats

### Default (Human-Readable)

```
❌ Found 2 secrets across 1 file(s)
   🔥 1 CRITICAL
   ⚠️  1 HIGH

config.js
  15:1 AWS Access Key [CRITICAL]
    const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";

  42:10 GitHub Token [HIGH]
    export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
```

### JSON

```json
[
  {
    "type": "AWS Access Key",
    "severity": "CRITICAL",
    "file": "config.js",
    "line": 15,
    "column": 1,
    "match": "AKIAIOSFODNN7EXAMPLE",
    "content": "const AWS_KEY = \"AKIAIOSFODNN7EXAMPLE\";",
    "description": "AWS Access Key ID"
  }
]
```

### SARIF (GitHub Code Scanning)

```json
{
  "version": "2.1.0",
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
  "runs": [{
    "tool": {
      "driver": {
        "name": "Shiny Secrets",
        "version": "2.1.0",
        "rules": [{
          "id": "aws-access-key",
          "name": "AWS Access Key",
          "shortDescription": { "text": "AWS Access Key ID" }
        }]
      }
    },
    "results": [{
      "ruleId": "aws-access-key",
      "level": "error",
      "message": { "text": "AWS Access Key: AWS Access Key ID" },
      "locations": [{
        "physicalLocation": {
          "artifactLocation": { "uri": "config.js" },
          "region": {
            "startLine": 15,
            "startColumn": 1,
            "snippet": { "text": "const AWS_KEY = ..." }
          }
        }
      }]
    }]
  }]
}
```

---

## 🧪 Development

### Running Tests

```bash
# Run all tests (Jest)
npm test

# Run legacy tests
npm run test:legacy

# Run v1 tests only
npm run test:v1

# Run v2 tests only
npm run test:v2

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Run linter
npm run lint

# Validate package
npm run validate

# TypeScript type checking
npm run typecheck
```

See [TESTING.md](TESTING.md) for detailed testing documentation.

### Project Structure

```
shiny-secrets/
├── lib/
│   ├── core.js              # Shared scanning logic (UMD)
│   └── browser-scanner.js   # Browser-specific utilities
├── types/
│   └── index.d.ts           # TypeScript definitions
├── tests/                   # Jest test suites
├── scanner.js               # V1 CLI scanner (stable)
├── scanner-v2.js            # V2 scanner (enhanced features)
├── test.js                  # V1 legacy test suite
├── test-v2.js               # V2 legacy test suite
├── pre-commit               # Git pre-commit hook
├── index.html               # Web-based scanner demo
├── .eslintrc.js             # ESLint configuration
├── jest.config.js           # Jest configuration
├── tsconfig.json            # TypeScript configuration
├── .shinysecretsrc.example  # Example config
├── TESTING.md               # Testing documentation
├── ROADMAP.md               # Feature roadmap
├── CHANGELOG.md             # Version history
└── docs/
    └── archive/             # Archived documentation
```

---

## 🆚 Version Comparison

### V1 vs V2 Feature Matrix

| Feature | V1 | V2 |
|---------|----:|----:|
| Detection Patterns | 21 | 21 |
| Single File Scan | ✓ | ✓ |
| Directory Scan | ✗ | ✓ |
| Git Staged Scan | ✓ | ✓ |
| JSON Output | ✓ | ✓ |
| SARIF Output | ✗ | ✓ |
| Config File | ✗ | ✓ |
| Allowlist | ✗ | ✓ |
| Flexible Exit Codes | ✗ | ✓ |
| Report Threshold | ✗ | ✓ |
| Glob Patterns | ✗ | ✓ |
| Custom Patterns | ✗ | ✓ |

### Which Version to Use?

**Use V1 (`shiny-secrets`) when:**
- Simple single-file scanning
- Quick checks in development
- Minimal configuration needed
- Pre-commit hooks for small projects

**Use V2 (`shiny-secrets-v2`) when:**
- Directory/project-wide scanning
- CI/CD pipelines
- GitHub Code Scanning integration
- Advanced configuration needs
- Allowlist management
- Flexible exit code control

---

## 📝 Documentation

- [Testing Guide](TESTING.md) - How to run and write tests
- [Roadmap](ROADMAP.md) - Planned features and improvements
- [Changelog](CHANGELOG.md) - Version history
- [Bug Reports](BUG_REPORT.md) - How to report bugs
- [Migration Guide](MIGRATION.md) - Upgrading from v1 to v2
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md) - Technical details
- [Refactoring Notes](REFACTORING.md) - Code quality improvements
- [Archived Docs](docs/archive/) - Historical documentation

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm test`)
4. Run linter (`npm run lint`)
5. Run type check (`npm run typecheck`)
6. Commit changes (`git commit -m 'Add amazing feature'`)
7. Push to branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

---

## 🔒 Security

If you discover a security vulnerability, please email [contact@arengarro.com](mailto:contact@arengarro.com) instead of using the issue tracker.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Inspired by [truffleHog](https://github.com/trufflesecurity/trufflehog) and [detect-secrets](https://github.com/Yelp/detect-secrets)
- Built with ❤️ by [Aren Garro LLC](https://arengarro.com)
- Maintained by the open-source community

---

## 🔗 Links

- [npm Package](https://www.npmjs.com/package/shiny-secrets)
- [GitHub Repository](https://github.com/Aren-Garro/shiny-secrets)
- [Demo Page](https://aren-garro.github.io/shiny-secrets/)
- [Bug Reports](https://github.com/Aren-Garro/shiny-secrets/issues)
- [Aren Garro LLC](https://arengarro.com)

---

**⭐ If you find this tool useful, please consider starring the repository!**
