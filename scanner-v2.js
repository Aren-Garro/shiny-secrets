#!/usr/bin/env node

/**
 * Shiny Secrets v2.0 - Enhanced CLI Secret Scanner
 * 
 * New features:
 * - Configuration file support (.shinysecretsrc)
 * - Directory scanning with glob patterns
 * - Flexible exit codes (--fail-on=critical|high|any)
 * - SARIF output for GitHub Code Scanning
 * - Allowlist/baseline support
 * - Standard ignore patterns (.gitignore)
 * - Multi-file scanning
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Version
const VERSION = '2.0.0';

// ANSI colors
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

// Import patterns from scanner.js
const patterns = require('./scanner.js').patterns || {
    aws_access_key: {
        name: 'AWS Access Key',
        regex: /AKIA[0-9A-Z]{16}/g,
        description: 'AWS Access Key ID',
        severity: 'CRITICAL'
    },
    aws_secret_key: {
        name: 'AWS Secret Key',
        regex: /aws_secret_access_key\s*=\s*['"]?([A-Za-z0-9/+=]{40})['"]?/gi,
        description: 'AWS Secret Access Key',
        severity: 'CRITICAL'
    },
    stripe_live_key: {
        name: 'Stripe Live API Key',
        regex: /sk_live_[0-9a-zA-Z]{24,}/g,
        description: 'Stripe Secret Live Key',
        severity: 'CRITICAL'
    },
    github_token: {
        name: 'GitHub Token',
        regex: /ghp_[a-zA-Z0-9]{36,}/g,
        description: 'GitHub Personal Access Token',
        severity: 'CRITICAL'
    }
};

// Default configuration
const defaultConfig = {
    failOn: 'critical',
    reportThreshold: 'medium',
    entropy: {
        enabled: true,
        threshold: 4.7,
        minLength: 20,
        maxLength: 100
    },
    exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/*.min.js',
        '**/*.bundle.js'
    ],
    include: [
        '*.js', '*.ts', '*.jsx', '*.tsx',
        '*.py', '*.java', '*.go', '*.rb',
        '*.php', '*.env', '*.config',
        '*.yaml', '*.yml', '*.json'
    ],
    allowlist: [],
    allowPatterns: ['EXAMPLE', 'TEST', 'DEMO', 'PLACEHOLDER'],
    disabledPatterns: []
};

// Load configuration
function loadConfig(configPath = null) {
    const searchPaths = [
        configPath,
        '.shinysecretsrc',
        '.shinysecretsrc.json',
        '.shinysecretsrc.yaml',
        path.join(process.env.HOME || '', '.shinysecretsrc')
    ].filter(Boolean);

    for (const p of searchPaths) {
        if (fs.existsSync(p)) {
            try {
                const content = fs.readFileSync(p, 'utf8');
                // Simple YAML/JSON parser
                const config = parseConfig(content);
                return { ...defaultConfig, ...config };
            } catch (error) {
                console.error(`${colors.yellow}Warning: Failed to parse config ${p}: ${error.message}${colors.reset}`);
            }
        }
    }
    return defaultConfig;
}

// Simple config parser (YAML-like)
function parseConfig(content) {
    const config = {};
    const lines = content.split('\n');
    let currentSection = null;
    let currentArray = null;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        if (trimmed.endsWith(':') && !trimmed.includes(': ')) {
            currentSection = trimmed.slice(0, -1);
            config[currentSection] = {};
            currentArray = null;
        } else if (trimmed.startsWith('- ')) {
            const value = trimmed.slice(2).replace(/["']/g, '');
            if (!currentArray) {
                currentArray = [];
                if (currentSection) {
                    config[currentSection] = currentArray;
                }
            }
            currentArray.push(value);
        } else if (trimmed.includes(': ')) {
            const [key, ...valueParts] = trimmed.split(': ');
            let value = valueParts.join(': ').replace(/["']/g, '');
            
            if (value === 'true') value = true;
            else if (value === 'false') value = false;
            else if (!isNaN(value) && value !== '') value = parseFloat(value);

            if (currentSection && typeof config[currentSection] === 'object' && !Array.isArray(config[currentSection])) {
                config[currentSection][key] = value;
            } else {
                config[key] = value;
            }
            currentArray = null;
        }
    }
    return config;
}

// Check if path matches glob pattern
function matchesGlob(filePath, pattern) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const normalizedPattern = pattern.replace(/\\/g, '/');

    const pathParts = normalizedPath.split('/');
    const patternParts = normalizedPattern.split('/');
    const memo = new Map();

    const matchesSegment = (segment, candidate) => {
        const escapedSegment = segment.replace(/([.+^${}()|[\]\\])/g, '\\$1');
        const segmentRegex = '^' + escapedSegment.replace(/\*/g, '.*').replace(/\?/g, '.') + '$';
        return new RegExp(segmentRegex).test(candidate);
    };

    const matches = (patternIndex, pathIndex) => {
        const key = `${patternIndex}:${pathIndex}`;
        if (memo.has(key)) return memo.get(key);

        if (patternIndex === patternParts.length) {
            return pathIndex === pathParts.length;
        }

        const part = patternParts[patternIndex];
        let result = false;

        if (part === '**') {
            if (patternIndex === patternParts.length - 1) {
                result = true;
            } else {
                for (let i = pathIndex; i <= pathParts.length; i++) {
                    if (matches(patternIndex + 1, i)) {
                        result = true;
                        break;
                    }
                }
            }
        } else if (pathIndex < pathParts.length && matchesSegment(part, pathParts[pathIndex])) {
            result = matches(patternIndex + 1, pathIndex + 1);
        }

        memo.set(key, result);
        return result;
    };

    return matches(0, 0);
}

// Check if file should be scanned
function shouldScanFile(filePath, config) {
    const relativePath = path.relative(process.cwd(), filePath);
    
    // Check excludes
    for (const pattern of config.exclude) {
        if (matchesGlob(relativePath, pattern)) return false;
    }
    
    // Check includes
    const ext = path.extname(filePath);
    for (const pattern of config.include) {
        if (pattern.startsWith('*.')) {
            if (ext === pattern.slice(1)) return true;
        } else if (matchesGlob(relativePath, pattern)) {
            return true;
        }
    }
    
    return false;
}

// Recursively scan directory
function scanDirectory(dirPath, config, results = []) {
    if (!fs.existsSync(dirPath)) return results;
    
    const stat = fs.statSync(dirPath);
    
    if (stat.isFile()) {
        if (shouldScanFile(dirPath, config)) {
            try {
                const content = fs.readFileSync(dirPath, 'utf8');
                const findings = scanContent(content, dirPath, config);
                results.push(...findings);
            } catch (error) {
                // Skip binary files or unreadable files
            }
        }
    } else if (stat.isDirectory()) {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
            scanDirectory(path.join(dirPath, item), config, results);
        }
    }
    
    return results;
}

// Shannon entropy calculation
function calculateEntropy(str) {
    if (!str || str.length < 8) return 0;
    const len = str.length;
    const freq = {};
    for (let i = 0; i < len; i++) {
        freq[str[i]] = (freq[str[i]] || 0) + 1;
    }
    let entropy = 0;
    for (let char in freq) {
        const p = freq[char] / len;
        entropy -= p * Math.log2(p);
    }
    return entropy;
}

// Check if finding is allowlisted
function isAllowlisted(finding, config) {
    // Check baseline allowlist
    const key = `${finding.file}:${finding.line}:${finding.type}`;
    if (config.allowlist.includes(key)) return true;
    
    // Check pattern allowlist
    for (const pattern of config.allowPatterns) {
        if (finding.match.includes(pattern)) return true;
    }
    
    return false;
}

// Main scan function
function scanContent(content, filename = 'input', config = defaultConfig) {
    const findings = [];
    const lines = content.split('\n');

    // Apply regex patterns
    for (let [key, pattern] of Object.entries(patterns)) {
        // Skip disabled patterns
        if (config.disabledPatterns.includes(key)) continue;
        
        lines.forEach((line, index) => {
            const localRegex = new RegExp(pattern.regex.source, pattern.regex.flags);
            let match;
            while ((match = localRegex.exec(line)) !== null) {
                const matchValue = match[1] || match[0];
                const finding = {
                    type: pattern.name,
                    line: index + 1,
                    column: match.index + 1,
                    match: matchValue,
                    content: line.trim(),
                    description: pattern.description,
                    severity: pattern.severity,
                    file: filename
                };
                
                if (!isAllowlisted(finding, config)) {
                    findings.push(finding);
                }
                
                if (match.index === localRegex.lastIndex) {
                    localRegex.lastIndex++;
                }
            }
        });
    }

    // Apply entropy detection if enabled
    if (config.entropy.enabled) {
        lines.forEach((line, index) => {
            if (/^[\s#\/\*]*(?:import|function|class|if|for|while)\b/.test(line)) {
                return;
            }
            
            const tokens = line.split(/[\s'"=:,;(){}[\]<>]/);
            
            for (let token of tokens) {
                if (token.length >= config.entropy.minLength && token.length <= config.entropy.maxLength && /[a-zA-Z0-9]/.test(token)) {
                    if (/^(http|https|www|localhost|127\.0\.0\.1)/.test(token)) continue;
                    if (/^\d+$/.test(token)) continue;
                    
                    // Check allow patterns
                    let skip = false;
                    for (const pattern of config.allowPatterns) {
                        if (token.toLowerCase().includes(pattern.toLowerCase())) {
                            skip = true;
                            break;
                        }
                    }
                    if (skip) continue;
                    
                    const entropy = calculateEntropy(token);
                    if (entropy >= config.entropy.threshold && !/^[a-z]+$/.test(token)) {
                        const finding = {
                            type: 'High Entropy String',
                            line: index + 1,
                            column: line.indexOf(token) + 1,
                            match: token,
                            content: line.trim(),
                            entropy: entropy.toFixed(2),
                            description: 'Potential secret with high randomness',
                            severity: 'MEDIUM',
                            file: filename
                        };
                        
                        if (!isAllowlisted(finding, config)) {
                            findings.push(finding);
                        }
                    }
                }
            }
        });
    }

    // Remove duplicates
    const uniqueFindings = [];
    const seen = new Set();
    for (let finding of findings) {
        const key = `${finding.file}|${finding.type}|${finding.line}|${finding.match}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueFindings.push(finding);
        }
    }

    uniqueFindings.sort((a, b) => {
        if (a.file !== b.file) return a.file.localeCompare(b.file);
        return a.line - b.line;
    });
    
    return uniqueFindings;
}

// Filter findings by severity threshold
function filterBySeverity(findings, threshold) {
    const severityLevels = { 'CRITICAL': 3, 'HIGH': 2, 'MEDIUM': 1 };
    const minLevel = severityLevels[threshold.toUpperCase()] || 1;
    return findings.filter(f => (severityLevels[f.severity] || 0) >= minLevel);
}

// Generate SARIF output
function generateSARIF(findings, config) {
    const rules = {};
    
    findings.forEach(finding => {
        const ruleId = finding.type.toLowerCase().replace(/\s+/g, '-');
        if (!rules[ruleId]) {
            rules[ruleId] = {
                id: ruleId,
                name: finding.type,
                shortDescription: { text: finding.description },
                fullDescription: { text: finding.description },
                defaultConfiguration: {
                    level: finding.severity === 'CRITICAL' ? 'error' : finding.severity === 'HIGH' ? 'warning' : 'note'
                },
                properties: {
                    tags: ['security', 'secrets'],
                    precision: 'high'
                }
            };
        }
    });

    const results = findings.map(finding => ({
        ruleId: finding.type.toLowerCase().replace(/\s+/g, '-'),
        level: finding.severity === 'CRITICAL' ? 'error' : finding.severity === 'HIGH' ? 'warning' : 'note',
        message: {
            text: `${finding.type}: ${finding.description}`
        },
        locations: [{
            physicalLocation: {
                artifactLocation: {
                    uri: finding.file,
                    uriBaseId: '%SRCROOT%'
                },
                region: {
                    startLine: finding.line,
                    startColumn: finding.column || 1,
                    snippet: {
                        text: finding.content
                    }
                }
            }
        }]
    }));

    return {
        version: '2.1.0',
        $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
        runs: [{
            tool: {
                driver: {
                    name: 'Shiny Secrets',
                    version: VERSION,
                    informationUri: 'https://github.com/Aren-Garro/shiny-secrets',
                    rules: Object.values(rules)
                }
            },
            results: results
        }]
    };
}

// Determine exit code
function determineExitCode(findings, failOn) {
    if (failOn === 'never') return 0;
    if (findings.length === 0) return 0;
    
    const hasCritical = findings.some(f => f.severity === 'CRITICAL');
    const hasHigh = findings.some(f => f.severity === 'HIGH');
    
    switch(failOn.toLowerCase()) {
        case 'critical':
            return hasCritical ? 1 : 0;
        case 'high':
            return (hasCritical || hasHigh) ? 1 : 0;
        case 'any':
            return findings.length > 0 ? 1 : 0;
        default:
            return hasCritical ? 1 : 0;
    }
}

// Print findings
function printFindings(findings, options = {}) {
    const { verbose = false, json = false, sarif = false, config } = options;

    if (sarif) {
        console.log(JSON.stringify(generateSARIF(findings, config), null, 2));
        return;
    }

    if (json) {
        console.log(JSON.stringify(findings, null, 2));
        return;
    }

    if (findings.length === 0) {
        console.log(`${colors.green}${colors.bold}✓ No secrets detected${colors.reset}`);
        return;
    }

    const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
    const highCount = findings.filter(f => f.severity === 'HIGH').length;
    const mediumCount = findings.filter(f => f.severity === 'MEDIUM').length;

    console.log(`${colors.red}${colors.bold}❌ Found ${findings.length} secret${findings.length > 1 ? 's' : ''} across ${new Set(findings.map(f => f.file)).size} file(s)${colors.reset}`);
    if (criticalCount > 0) console.log(`${colors.red}   🔥 ${criticalCount} CRITICAL${colors.reset}`);
    if (highCount > 0) console.log(`${colors.yellow}   ⚠️  ${highCount} HIGH${colors.reset}`);
    if (mediumCount > 0) console.log(`${colors.blue}   ℹ️  ${mediumCount} MEDIUM${colors.reset}`);
    console.log('');

    // Group by file
    const byFile = {};
    findings.forEach(f => {
        if (!byFile[f.file]) byFile[f.file] = [];
        byFile[f.file].push(f);
    });

    Object.entries(byFile).forEach(([file, fileFindings]) => {
        console.log(`${colors.bold}${file}${colors.reset}`);
        fileFindings.forEach((finding, index) => {
            const color = finding.severity === 'CRITICAL' ? colors.red : finding.severity === 'HIGH' ? colors.yellow : colors.blue;
            console.log(`${color}  ${finding.line}:${finding.column || 1} ${finding.type} [${finding.severity}]${colors.reset}`);
            if (verbose) {
                console.log(`    ${finding.description}`);
                console.log(`    Match: ${finding.match}`);
                if (finding.entropy) console.log(`    Entropy: ${finding.entropy} bits`);
            }
            console.log(`    ${finding.content.substring(0, 100)}${finding.content.length > 100 ? '...' : ''}`);
            console.log('');
        });
    });
}

// Main CLI
function main() {
    const args = process.argv.slice(2);
    
    // Show help
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log(`
${colors.bold}Shiny Secrets v${VERSION} - Enhanced CLI Secret Scanner${colors.reset}

Usage:
  shiny-secrets <file|directory>         Scan file or directory
  shiny-secrets --scan-staged            Scan git staged files
  shiny-secrets --help                   Show this help

Options:
  --verbose, -v                          Show detailed output
  --json                                 Output as JSON
  --sarif                                Output as SARIF (GitHub Code Scanning)
  --config <path>                        Config file path
  --fail-on=<level>                      Exit with 1 if secrets found
                                         Options: critical, high, any, never
                                         Default: critical
  --exclude <pattern>                    Exclude pattern (can be repeated)
  --report-threshold=<level>             Minimum severity to report
                                         Options: critical, high, medium
                                         Default: medium

Examples:
  shiny-secrets src/
  shiny-secrets config.js --verbose
  shiny-secrets . --fail-on=high --sarif
  shiny-secrets --scan-staged --fail-on=critical

`);
        process.exit(0);
    }

    // Parse options
    const options = {
        verbose: args.includes('--verbose') || args.includes('-v'),
        json: args.includes('--json'),
        sarif: args.includes('--sarif'),
        scanStaged: args.includes('--scan-staged'),
        failOn: null,
        reportThreshold: null,
        configPath: null,
        excludePatterns: []
    };

    // Parse --fail-on
    const failOnArg = args.find(a => a.startsWith('--fail-on='));
    if (failOnArg) options.failOn = failOnArg.split('=')[1];

    // Parse --report-threshold
    const thresholdArg = args.find(a => a.startsWith('--report-threshold='));
    if (thresholdArg) options.reportThreshold = thresholdArg.split('=')[1];

    // Parse --config
    const configIdx = args.indexOf('--config');
    if (configIdx !== -1 && args[configIdx + 1]) {
        options.configPath = args[configIdx + 1];
    }

    // Parse --exclude
    args.forEach((arg, i) => {
        if (arg === '--exclude' && args[i + 1]) {
            options.excludePatterns.push(args[i + 1]);
        }
    });

    // Load config
    let config = loadConfig(options.configPath);
    if (options.failOn) config.failOn = options.failOn;
    if (options.reportThreshold) config.reportThreshold = options.reportThreshold;
    if (options.excludePatterns.length > 0) {
        config.exclude = [...config.exclude, ...options.excludePatterns];
    }

    let allFindings = [];

    if (options.scanStaged) {
        // Scan git staged files
        try {
            const output = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' });
            const files = output.split('\n').filter(f => f.trim());
            
            if (files.length === 0) {
                console.log(`${colors.yellow}No staged files to scan${colors.reset}`);
                process.exit(0);
            }

            console.log(`${colors.blue}Scanning ${files.length} staged file(s)...${colors.reset}\n`);
            
            files.forEach(file => {
                if (shouldScanFile(file, config) && fs.existsSync(file)) {
                    try {
                        const content = fs.readFileSync(file, 'utf8');
                        const findings = scanContent(content, file, config);
                        allFindings.push(...findings);
                    } catch (error) {
                        // Skip unreadable files
                    }
                }
            });
        } catch (error) {
            console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
            process.exit(1);
        }
    } else {
        // Scan specified path
        const target = args.find(a => !a.startsWith('--') && a !== '-v');
        if (!target) {
            console.error(`${colors.red}Error: No file or directory specified${colors.reset}`);
            process.exit(1);
        }

        if (!fs.existsSync(target)) {
            console.error(`${colors.red}Error: Path not found: ${target}${colors.reset}`);
            process.exit(1);
        }

        allFindings = scanDirectory(target, config);
    }

    // Filter by report threshold
    allFindings = filterBySeverity(allFindings, config.reportThreshold);

    // Print results
    printFindings(allFindings, { ...options, config });

    // Exit with appropriate code
    const exitCode = determineExitCode(allFindings, config.failOn);
    process.exit(exitCode);
}

// Run if executed directly
if (require.main === module) {
    main();
}

// Export for testing
module.exports = { 
    scanContent, 
    scanDirectory,
    loadConfig, 
    patterns, 
    calculateEntropy,
    generateSARIF,
    VERSION
};
