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
- **Fast & Lightweight** - Scans thousands of files in seconds
- **Git Integration** - Pre-commit hooks to prevent secret commits
- **CI/CD Ready** - GitHub Actions, GitLab CI, and custom pipelines
- **SARIF Output** - Export results for security dashboards
- **Configurable** - Custom patterns, severity levels, and exclusions
- **Cross-Platform** - Works on Linux, macOS, and Windows

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

# Scan git staged files (pre-commit)
shiny-secrets --scan-staged

# Scan with JSON output
shiny-secrets app.js --json > results.json
```

---

## 📦 Installation Methods

### Global CLI Installation

```bash
npm install -g shiny-secrets
shiny-secrets --help
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
    "scan:all": "shiny-secrets src/"
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
echo "npx shiny-secrets --scan-staged --fail-on-critical" > .husky/pre-commit
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

```bash
shiny-secrets [options] [file|directory]
```

### Options

| Option | Description |
|--------|-------------|
| `--scan-staged` | Scan git staged files (for pre-commit hooks) |
| `--verbose`, `-v` | Show detailed output with descriptions |
| `--json` | Output results as JSON |
| `--sarif` | Output results in SARIF format |
| `--fail-on-critical` | Exit with code 1 if critical secrets found |
| `--fail-on=LEVEL` | Exit with code 1 if secrets of LEVEL or higher found (v2 only) |
| `--config PATH` | Path to custom config file |
| `--exclude PATTERN` | Exclude files matching pattern (can be used multiple times) |
| `--help`, `-h` | Show help message |

### Examples

```bash
# Scan specific file with verbose output
shiny-secrets config.js --verbose

# Scan directory excluding tests
shiny-secrets src/ --exclude "**/*.test.js"

# Use custom config
shiny-secrets . --config .shinysecretsrc

# Export SARIF for security dashboard
shiny-secrets src/ --sarif > results.sarif

# Fail on high or critical secrets
shiny-secrets-v2 --scan-staged --fail-on=high
```

---

## ⚙️ Configuration

Create a `.shinysecretsrc` file in your project root:

```json
{
  "exclude": [
    "**/node_modules/**",
    "**/*.min.js",
    "**/dist/**",
    "**/*.test.js"
  ],
  "severity": {
    "critical": ["aws_access_key", "stripe_live_key"],
    "high": ["github_token", "slack_token"],
    "medium": ["jwt_token"]
  },
  "customPatterns": [
    {
      "name": "Custom API Key",
      "regex": "CUSTOM_[A-Z0-9]{32}",
      "severity": "HIGH"
    }
  ],
  "entropyThreshold": 4.7,
  "maxFileSize": 5242880
}
```

See [`.shinysecretsrc.example`](.shinysecretsrc.example) for all options.

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
      - run: shiny-secrets . --fail-on-critical
```

### GitLab CI

```yaml
scan-secrets:
  stage: test
  script:
    - npm install -g shiny-secrets
    - shiny-secrets . --fail-on-critical --json > secrets.json
  artifacts:
    paths:
      - secrets.json
    when: always
```

### Pre-Commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
node_modules/.bin/shiny-secrets --scan-staged --fail-on-critical
if [ $? -ne 0 ]; then
  echo "❌ Secret detected! Commit blocked."
  exit 1
fi
```

---

## 📊 Output Formats

### Default (Human-Readable)

```
❌ Found 2 secrets
   🔥 1 CRITICAL
   ⚠️  1 HIGH

1. AWS Access Key [CRITICAL]
   File: config.js
   Line: 15
   Code: const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";

2. GitHub Token [HIGH]
   File: deploy.sh
   Line: 42
   Code: export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
```

### JSON

```json
[
  {
    "type": "AWS Access Key",
    "severity": "CRITICAL",
    "file": "config.js",
    "line": 15,
    "match": "AKIAIOSFODNN7EXAMPLE",
    "content": "const AWS_KEY = \"AKIAIOSFODNN7EXAMPLE\";",
    "description": "AWS Access Key ID"
  }
]
```

### SARIF

```json
{
  "version": "2.1.0",
  "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
  "runs": [{
    "tool": { "driver": { "name": "Shiny Secrets" }},
    "results": [{
      "ruleId": "aws_access_key",
      "level": "error",
      "message": { "text": "AWS Access Key detected" },
      "locations": [{
        "physicalLocation": {
          "artifactLocation": { "uri": "config.js" },
          "region": { "startLine": 15 }
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
# Run all tests
npm test

# Run v1 tests only
npm run test:v1

# Run v2 tests only
npm run test:v2

# Run linter
npm run lint

# Validate package
npm run validate
```

See [TESTING.md](TESTING.md) for detailed testing documentation.

### Project Structure

```
shiny-secrets/
├── scanner.js          # V1 CLI scanner (stable)
├── scanner-v2.js       # V2 scanner (enhanced features)
├── test.js             # V1 test suite
├── test-v2.js          # V2 test suite
├── pre-commit          # Git pre-commit hook
├── index.html          # Web-based scanner demo
├── .eslintrc.js        # ESLint configuration
├── .shinysecretsrc.example  # Example config
├── TESTING.md          # Testing documentation
├── ROADMAP.md          # Feature roadmap
├── CHANGELOG.md        # Version history
└── docs/
    └── archive/        # Archived documentation
```

---

## 📝 Documentation

- [Testing Guide](TESTING.md) - How to run and write tests
- [Roadmap](ROADMAP.md) - Planned features and improvements
- [Changelog](CHANGELOG.md) - Version history
- [Bug Reports](BUG_REPORT.md) - How to report bugs
- [Archived Docs](docs/archive/) - Historical documentation

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm test`)
4. Run linter (`npm run lint`)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

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
