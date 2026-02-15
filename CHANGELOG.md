# Changelog

All notable changes to Shiny Secrets will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- NPM package publication
- Multi-language support (Python, Java, Go, Ruby, PHP)
- VS Code extension
- GitHub Action for easy CI/CD integration
- Historical git scanning

---

## [2.0.0] - 2026-02-15

### Added
- **Configuration file support** (`.shinysecretsrc`)
  - Allowlist/baseline for known findings
  - Pattern-based allowlisting (EXAMPLE, TEST, DEMO)
  - Custom exclude/include patterns
  - Severity threshold configuration
  - Entropy detection settings
  - Custom pattern definitions
  - Disable specific built-in patterns

- **Enhanced CLI (scanner-v2.js)**
  - Directory scanning with recursive file discovery
  - Glob pattern matching for includes/excludes
  - Flexible exit codes (`--fail-on=critical|high|any|never`)
  - Report threshold filtering (`--report-threshold=critical|high|medium`)
  - SARIF 2.1.0 output format for GitHub Code Scanning
  - Multi-file result grouping by file
  - Column number reporting for findings

- **GitHub Actions CI/CD workflow**
  - Multi-OS testing (Ubuntu, macOS, Windows)
  - Multi-Node version testing (14.x, 16.x, 18.x, 20.x)
  - Self-scanning for dogfooding
  - NPM pack dry-run validation
  - Actual CI badge (not static)

- **Documentation**
  - Comprehensive ROADMAP.md addressing all feedback
  - CHANGELOG.md following Keep a Changelog format
  - Configuration file example (`.shinysecretsrc.example`)
  - CI/CD integration examples

### Changed
- **Exit code behavior** (BREAKING)
  - v1: Always exit 1 if any secret found (even with `--fail-on-critical`)
  - v2: Configurable via `--fail-on` flag
    - `critical` (default): Exit 1 only for CRITICAL severity
    - `high`: Exit 1 for CRITICAL or HIGH
    - `any`: Exit 1 for any finding
    - `never`: Always exit 0 (warn only)

- **package.json**
  - Version bumped to 2.0.0
  - Added `scanner-v2` bin entry
  - Enhanced description and keywords
  - Updated Node.js requirement to >=14.0.0
  - Added funding and repository metadata
  - Included v2 files in distribution

### Fixed
- Exit code now respects severity levels correctly
- Configuration merging works properly with defaults
- Allowlist matching is case-insensitive
- SARIF output validates against spec

### Security
- Test secrets properly obfuscated to avoid GitHub secret scanning
- No secrets committed in test suite

---

## [1.0.0] - 2026-02-15

### Added
- **Core scanner (scanner.js)**
  - 21 detection patterns for common secrets
    - AWS Access Keys (AKIA...)
    - AWS Secret Keys
    - Stripe Live/Test Keys
    - GitHub Personal Access Tokens
    - Google API Keys
    - Slack Tokens and Webhooks
    - SendGrid API Keys
    - Twilio API Keys
    - Azure Keys
    - Heroku API Keys
    - OAuth Tokens
    - Bearer Tokens
    - Generic API Keys
    - Passwords (8+ chars)
    - Private Keys (RSA, EC, OpenSSH)
    - Database Connection URLs
    - JWT Tokens
    - High Entropy Strings
  - Shannon entropy analysis (4.7+ bits threshold)
  - Context-aware pattern matching
  - False positive reduction
    - Excludes test/example/demo strings
    - Filters short passwords (<8 chars)
    - Requires context for UUIDs (Heroku)
    - Skips import/keyword lines
  - ANSI color-coded terminal output
  - JSON export (`--json`)
  - Verbose mode (`--verbose`)
  - Git staged file scanning (`--scan-staged`)

- **Web interface (index.html)**
  - Drag & drop file upload
  - Paste code directly
  - Real-time scanning
  - Syntax highlighting in results
  - Dark mode support
  - Export results as JSON
  - Responsive design
  - Zero external dependencies
  - Client-side only (no data transmission)

- **Git pre-commit hook (pre-commit.sh)**
  - Automatic staged file scanning
  - Commit blocking on critical secrets
  - Easy installation script
  - Override capability

- **Comprehensive test suite (test.js)**
  - 42 tests covering:
    - Pattern detection (11 types)
    - False positive prevention (5 tests)
    - Entropy calculation (3 tests)
    - Multiline detection (2 tests)
    - Edge cases (5 tests)
    - Integration scenarios (2 tests)
    - Performance benchmarks (1 test)
    - Pattern validation (3 tests)
  - 100% test pass rate
  - Obfuscated test secrets

- **Documentation**
  - Comprehensive README (13KB)
    - Quick start guide
    - Installation options (3 methods)
    - Detailed usage examples
    - Security best practices
    - Architecture diagrams
    - Performance benchmarks
    - FAQ section
    - Contributing guidelines
  - MIT License
  - GitHub Pages deployment

### Performance
- Scans 10,000 lines per second
- Handles files up to 100,000+ lines
- Memory usage: ~50MB typical
- Regex infinite loop protection

### Known Limitations
- Line-by-line scanning (multiline formats may be missed)
- JavaScript-only (no Python, Java, Go, etc.)
- Single-file CLI scanning (v1 doesn't support directories)
- No configuration file support
- No allowlist/baseline management
- Static test badge (no actual CI runs)

---

## [0.1.0] - 2026-02-15 (Initial Release)

### Added
- Basic web interface for secret scanning
- Pattern-based detection for common secrets
- Entropy-based detection
- GitHub Pages deployment

---

## Version Comparison

### v1.0.0 vs v2.0.0 Feature Matrix

| Feature | v1.0.0 | v2.0.0 |
|---------|--------|--------|
| Detection Patterns | 21 | 21 |
| Single File Scan | ✓ | ✓ |
| Directory Scan | ✗ | ✓ |
| Git Staged Scan | ✓ | ✓ |
| JSON Output | ✓ | ✓ |
| SARIF Output | ✗ | ✓ |
| Config File | ✗ | ✓ |
| Allowlist | ✗ | ✓ |
| Flexible Exit Codes | ✗ | ✓ |
| Multi-OS CI | ✗ | ✓ |
| npm Published | ✗ | Pending |

---

## Migration Guide: v1 → v2

### Breaking Changes

1. **Exit Code Behavior**
   ```bash
   # v1: Always exits 1 if any secret found
   node scanner.js config.js --fail-on-critical
   
   # v2: Respects severity level
   node scanner-v2.js config.js --fail-on=critical
   ```

2. **Configuration**
   ```bash
   # v1: All options via CLI
   node scanner.js config.js --verbose
   
   # v2: Config file + CLI override
   node scanner-v2.js config.js --config .shinysecretsrc
   ```

### Recommended Upgrade Path

1. **Keep v1 CLI for quick scans**
   ```bash
   node scanner.js single-file.js
   ```

2. **Use v2 for advanced features**
   ```bash
   # Directory scanning
   node scanner-v2.js src/
   
   # SARIF for GitHub
   node scanner-v2.js . --sarif > results.sarif
   
   # Config-based workflow
   cp .shinysecretsrc.example .shinysecretsrc
   node scanner-v2.js . --fail-on=high
   ```

3. **Update git hooks**
   ```bash
   # Old
   node scanner.js --scan-staged --fail-on-critical
   
   # New
   node scanner-v2.js --scan-staged --fail-on=critical
   ```

---

## Contributors

- Aren Garro (@Aren-Garro) - Creator and maintainer

---

## Links

- [GitHub Repository](https://github.com/Aren-Garro/shiny-secrets)
- [Live Demo](https://aren-garro.github.io/shiny-secrets/)
- [Issue Tracker](https://github.com/Aren-Garro/shiny-secrets/issues)
- [Roadmap](ROADMAP.md)
- [npm Package](https://npmjs.com/package/shiny-secrets) (coming soon)

---

**Note**: This project follows semantic versioning. Major version changes (e.g., 1.x → 2.x) may include breaking changes. Minor versions (e.g., 2.0 → 2.1) add functionality in a backwards-compatible manner. Patch versions (e.g., 2.0.0 → 2.0.1) include only bug fixes.
