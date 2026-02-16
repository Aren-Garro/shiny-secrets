# Shiny Secrets

Detect hardcoded secrets and credentials in source code before they reach production.

A lightweight, zero-dependency secret scanner for Node.js with 21 detection patterns, Shannon entropy analysis, and SARIF output for GitHub Code Scanning.

[![CI](https://github.com/Aren-Garro/shiny-secrets/actions/workflows/ci.yml/badge.svg)](https://github.com/Aren-Garro/shiny-secrets/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## Quick Start

### CLI

```bash
# Scan a file
node scanner.js config.js

# Scan a directory (v2)
node scanner-v2.js src/

# Scan git staged files (pre-commit hook)
node scanner.js --scan-staged

# SARIF output for GitHub Code Scanning
node scanner-v2.js . --sarif > results.sarif
```

### Web Interface

Open `index.html` in a browser. Paste code, click scan. Everything runs client-side -- your code never leaves the browser.

### Git Pre-Commit Hook

```bash
cp pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

---

## Installation

```bash
# Clone
git clone https://github.com/Aren-Garro/shiny-secrets.git
cd shiny-secrets

# Or install globally via npm
npm install -g shiny-secrets
```

No dependencies to install. Requires Node.js >= 18.

---

## What It Detects

**Critical:** AWS access/secret keys, Stripe live keys, GitHub tokens (`ghp_`, `gho_`), private keys, database connection URLs

**High:** Google API keys, Slack tokens/webhooks, SendGrid keys, Twilio keys, Azure keys, Heroku API keys, OAuth/Bearer tokens, generic API keys, passwords (8+ chars), Stripe test keys

**Medium:** JWT tokens, high-entropy strings (Shannon entropy >= 4.7 bits)

---

## CLI Options

### v1 (`scanner.js`)

```
node scanner.js <file> [options]

Options:
  --verbose, -v          Detailed output
  --json                 JSON output
  --scan-staged          Scan git staged files
  --fail-on-critical     Exit 1 only for critical findings
```

### v2 (`scanner-v2.js`)

```
node scanner-v2.js <file|directory> [options]

Options:
  --verbose, -v                   Detailed output
  --json                          JSON output
  --sarif                         SARIF 2.1.0 output
  --config <path>                 Config file path
  --fail-on=<level>               critical | high | any | never (default: critical)
  --report-threshold=<level>      critical | high | medium (default: medium)
  --exclude <pattern>             Exclude glob (repeatable)
  --scan-staged                   Scan git staged files
```

### Configuration File

Copy `.shinysecretsrc.example` to `.shinysecretsrc` and edit. Supports allowlists, file filters, entropy settings, and pattern toggling.

---

## Testing

```bash
npm test
```

Runs both v1 and v2 test suites (41 tests covering pattern detection, false positive prevention, entropy calculation, directory scanning, SARIF output, and edge cases).

---

## Adding Patterns

Edit the `patterns` object in `scanner.js`:

```javascript
new_service: {
    name: 'Service Name',
    regex: /pattern/g,
    description: 'What this detects',
    severity: 'CRITICAL' // or HIGH, MEDIUM
}
```

Add a corresponding test in `test.js`.

---

## License

MIT
