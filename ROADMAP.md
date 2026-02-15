# Shiny Secrets - Development Roadmap

## 🎯 Vision

Transform Shiny Secrets from a solid personal/team tool (7/10) into a production-grade secret scanner (9/10) that competes with established tools like Gitleaks and TruffleHog.

---

## ✅ v2.0.0 - Addressing Core Critiques (COMPLETED)

### Exit Code Flexibility
- [x] **Issue**: Exit code 1 for any secret, making `--fail-on-critical` less meaningful
- [x] **Solution**: Flexible `--fail-on=<level>` flag
  - `critical` - Exit 1 only for CRITICAL findings (default)
  - `high` - Exit 1 for CRITICAL or HIGH
  - `any` - Exit 1 if any secrets found
  - `never` - Always exit 0 (warn only mode)
- [x] **Status**: ✅ Implemented in `scanner-v2.js`

### Configuration & Allowlists
- [x] **Issue**: No config file, allowlist, or baseline support
- [x] **Solution**: `.shinysecretsrc` configuration file
  - Allowlist known findings (baseline)
  - Pattern-based allowlisting
  - Custom exclude/include patterns
  - Severity threshold configuration
  - Entropy settings
- [x] **Status**: ✅ Implemented with example config

### Directory Scanning
- [x] **Issue**: Single-file scanning only
- [x] **Solution**: Recursive directory scanning
  - Glob pattern matching
  - .gitignore-style exclusions
  - Multi-file output grouping
- [x] **Status**: ✅ Implemented in `scanner-v2.js`

### SARIF Output
- [x] **Issue**: No GitHub Code Scanning integration
- [x] **Solution**: SARIF 2.1.0 output format
  - `--sarif` flag for GitHub Actions
  - Compatible with Security tab
  - Includes line numbers, severity, descriptions
- [x] **Status**: ✅ Implemented with full spec compliance

### CI/CD Integration
- [x] **Issue**: Static test badge, no actual CI runs
- [x] **Solution**: GitHub Actions workflow
  - Multi-OS testing (Ubuntu, macOS, Windows)
  - Multi-Node version (14.x - 20.x)
  - Self-scanning for dogfooding
  - NPM pack dry-run
- [x] **Status**: ✅ `.github/workflows/ci.yml` created

---

## 🚀 v2.1.0 - NPM Package (Priority #1)

**Timeline**: 1-2 weeks  
**Effort**: Low  
**Impact**: High ⭐⭐⭐⭐⭐

### Tasks
- [ ] Publish to npm registry
  - [ ] Create npm account/verify access
  - [ ] Test `npm publish --dry-run`
  - [ ] Publish v2.0.0 to npm
  - [ ] Add npm badge to README
  - [ ] Test `npx shiny-secrets`

- [ ] Package optimization
  - [ ] Minimize bundle size
  - [ ] Add .npmignore
  - [ ] Verify only essential files included
  - [ ] Test global install: `npm i -g shiny-secrets`

- [ ] Distribution improvements
  - [ ] Add semantic versioning automation
  - [ ] Create CHANGELOG.md
  - [ ] Tag releases properly
  - [ ] Add GitHub Release notes

### Success Metrics
- ✅ Listed on npmjs.com
- ✅ `npx shiny-secrets` works without install
- ✅ Weekly download count visible
- ✅ Installation instructions in README work

---

## 📊 v2.2.0 - Coverage & Reliability

**Timeline**: 2-3 weeks  
**Effort**: Medium  
**Impact**: High ⭐⭐⭐⭐

### Multi-line Secret Detection
- [ ] **Issue**: Line-by-line scanning misses multi-line formats
- [ ] **Solution**: Enhanced pattern matching
  - [ ] Multi-line regex support for private keys
  - [ ] JWT tokens across lines
  - [ ] Base64-encoded blocks
  - [ ] PEM certificate formats

### False Positive Reduction
- [ ] **Issue**: 20 patterns can cause noise in diverse codebases
- [ ] **Solution**: Smarter detection
  - [ ] Machine learning entropy classifier (optional)
  - [ ] Context-aware validation (check if value is used)
  - [ ] Comment detection (skip secrets in comments)
  - [ ] Test file auto-detection
  - [ ] Historical commit analysis (git blame)

### Pattern Expansion
- [ ] Add 20+ more patterns
  - [ ] Shopify API keys
  - [ ] Square API keys
  - [ ] Mailchimp API keys
  - [ ] Firebase keys
  - [ ] Cloudflare tokens
  - [ ] Bitbucket tokens
  - [ ] GitLab tokens
  - [ ] NPM tokens
  - [ ] Docker Hub tokens
  - [ ] Kubernetes secrets

### Success Metrics
- ✅ 40+ detection patterns
- ✅ <5% false positive rate on real codebases
- ✅ Multi-line detection tested

---

## 🌍 v2.3.0 - Multi-Language Support

**Timeline**: 3-4 weeks  
**Effort**: High  
**Impact**: Medium-High ⭐⭐⭐⭐

### Language-Specific Patterns
- [ ] Python
  - [ ] Environment variable patterns
  - [ ] Django settings
  - [ ] Flask config
  - [ ] Python string formats

- [ ] Java
  - [ ] Properties files
  - [ ] Spring Boot configs
  - [ ] Gradle configs
  - [ ] Maven settings

- [ ] Go
  - [ ] Environment loading
  - [ ] Config structs
  - [ ] Viper configs

- [ ] Ruby
  - [ ] Rails credentials
  - [ ] YAML configs
  - [ ] Gemfile patterns

- [ ] PHP
  - [ ] .env files
  - [ ] Laravel configs
  - [ ] WordPress wp-config

### File Format Support
- [ ] YAML secrets detection
- [ ] TOML configs
- [ ] INI files
- [ ] XML configurations
- [ ] Docker Compose files
- [ ] Kubernetes manifests

### Success Metrics
- ✅ 5+ languages supported
- ✅ Language-specific documentation
- ✅ Test suite for each language

---

## 🔌 v3.0.0 - IDE Extensions

**Timeline**: 4-6 weeks  
**Effort**: High  
**Impact**: Very High ⭐⭐⭐⭐⭐

### VS Code Extension
- [ ] Real-time secret detection
- [ ] Inline warnings (red squiggles)
- [ ] Quick fixes ("Add to allowlist")
- [ ] Status bar indicator
- [ ] Settings UI
- [ ] Command palette integration
- [ ] Marketplace publication

### IntelliJ/WebStorm Plugin
- [ ] Similar feature set to VS Code
- [ ] JetBrains Marketplace publication
- [ ] Support for all JetBrains IDEs

### Vim/Neovim Plugin
- [ ] ALE/CoC integration
- [ ] Async scanning
- [ ] Quickfix list integration

### Success Metrics
- ✅ 1000+ VS Code installs
- ✅ 4+ star rating
- ✅ Active maintenance

---

## 🤖 v3.1.0 - GitHub Action

**Timeline**: 1-2 weeks  
**Effort**: Low-Medium  
**Impact**: High ⭐⭐⭐⭐⭐

### Action Features
- [ ] Simple workflow integration
  ```yaml
  - uses: aren-garro/shiny-secrets-action@v1
    with:
      fail-on: critical
      sarif-output: true
  ```
- [ ] Automatic PR comments
- [ ] Diff-only scanning (PR changed files)
- [ ] Status checks integration
- [ ] GitHub Marketplace listing

### Success Metrics
- ✅ Listed on GitHub Marketplace
- ✅ 100+ repos using the action
- ✅ Documentation with examples

---

## 📈 v3.2.0 - Advanced Reporting

**Timeline**: 2-3 weeks  
**Effort**: Medium  
**Impact**: Medium ⭐⭐⭐

### Report Formats
- [ ] HTML report generation
- [ ] PDF export
- [ ] CSV for spreadsheet analysis
- [ ] JUnit XML for CI integration
- [ ] GitLab SAST format
- [ ] SonarQube format

### Dashboard Features
- [ ] Historical trend tracking
- [ ] Team/project comparison
- [ ] Risk scoring
- [ ] Remediation tracking

### Success Metrics
- ✅ 5+ export formats
- ✅ Professional HTML reports
- ✅ Team adoption metrics

---

## 🎓 v4.0.0 - Enterprise Features

**Timeline**: 8-12 weeks  
**Effort**: Very High  
**Impact**: High (for enterprise users) ⭐⭐⭐⭐

### Team Collaboration
- [ ] Shared configuration profiles
- [ ] Team allowlist management
- [ ] Centralized policy enforcement
- [ ] RBAC (Role-Based Access Control)
- [ ] Audit logging

### Advanced Detection
- [ ] Custom regex patterns UI
- [ ] ML-based anomaly detection
- [ ] Secret validity checking (API calls)
- [ ] Secret rotation detection
- [ ] Leak source tracing

### Integrations
- [ ] Slack notifications
- [ ] Jira ticket creation
- [ ] PagerDuty alerts
- [ ] Vault integration
- [ ] 1Password integration
- [ ] AWS Secrets Manager sync

### Success Metrics
- ✅ 10+ enterprise customers
- ✅ Professional support tier
- ✅ SOC 2 compliance

---

## 🌟 Immediate "Easy Wins" (Next 2 Weeks)

### Priority 1: NPM Package
**Why**: Biggest adoption blocker  
**Effort**: 2 hours  
**Impact**: ⭐⭐⭐⭐⭐  
- [ ] `npm publish`
- [ ] Update README badges
- [ ] Test `npx shiny-secrets`

### Priority 2: Real CI Badge
**Why**: Credibility signal  
**Effort**: Already done!  
**Impact**: ⭐⭐⭐  
- [x] GitHub Actions workflow
- [ ] Update README badge to point to actual runs

### Priority 3: CHANGELOG.md
**Why**: Version history transparency  
**Effort**: 1 hour  
**Impact**: ⭐⭐⭐  
- [ ] Document v1.0.0 → v2.0.0 changes
- [ ] Follow Keep a Changelog format

### Priority 4: Promotion
**Why**: Get early users and feedback  
**Effort**: 2 hours  
**Impact**: ⭐⭐⭐⭐  
- [ ] Post on r/programming
- [ ] Tweet announcement
- [ ] Dev.to article
- [ ] Hacker News submission

### Priority 5: GitHub Action
**Why**: Easiest enterprise adoption  
**Effort**: 4 hours  
**Impact**: ⭐⭐⭐⭐⭐  
- [ ] Create `action.yml`
- [ ] Publish to Marketplace
- [ ] Add example workflows

---

## 📊 Success Metrics Tracking

### Open Source Metrics
- GitHub Stars: 0 → 100 (v2.1) → 500 (v3.0) → 1000 (v4.0)
- NPM Downloads: 0 → 1000/month (v2.1) → 10k/month (v3.0)
- Contributors: 1 → 5 (v2.x) → 10 (v3.x)
- Issues/PRs: Track response time < 48 hours

### Adoption Metrics
- VS Code Extension: 0 → 1000 installs
- GitHub Action: 0 → 100 repos using
- NPM Global Installs: 0 → 500

### Quality Metrics
- Test Coverage: 42 tests → 100+ tests (v3.0)
- False Positive Rate: <5%
- Detection Patterns: 21 → 40 (v2.2) → 60 (v3.0)
- Scan Performance: 10k lines/sec maintained

---

## 🎯 From 7/10 to 9/10

### Current State (7/10)
✅ Solid documentation  
✅ Clear problem/solution  
✅ Multiple interfaces  
✅ Zero dependencies  
✅ Test suite  
⚠️ Limited language support  
❌ No npm package  
❌ Static test badge  
❌ No stars/forks  

### Target State (9/10)
✅ Published npm package  
✅ Working CI with real badge  
✅ 500+ GitHub stars  
✅ 5+ language support  
✅ VS Code extension  
✅ GitHub Action  
✅ Multi-line detection  
✅ SARIF output  
✅ Config/allowlist support  
✅ Production adoption proof  

---

## 🤝 Contributing

Want to help? Pick an item from the roadmap and:

1. Open an issue to discuss approach
2. Fork and implement
3. Add tests
4. Submit PR with clear description
5. Update ROADMAP.md to mark as complete

Priority areas for contributors:
- Pattern expansion (easy, high impact)
- False positive reduction (medium, high impact)
- Language-specific detection (hard, high impact)
- Documentation improvements (easy, medium impact)

---

## 📅 Release Schedule

- **v2.1.0**: March 2026 (NPM package)
- **v2.2.0**: April 2026 (Coverage & reliability)
- **v2.3.0**: June 2026 (Multi-language)
- **v3.0.0**: September 2026 (IDE extensions)
- **v3.1.0**: October 2026 (GitHub Action)
- **v4.0.0**: Q1 2027 (Enterprise features)

---

## 💬 Feedback

This roadmap is based on the excellent critiques received. Have more suggestions?

- Open a [GitHub Issue](https://github.com/Aren-Garro/shiny-secrets/issues)
- Start a [Discussion](https://github.com/Aren-Garro/shiny-secrets/discussions)
- Email: contact@arengarro.com

Let's build the best open-source secret scanner together! 🚀
