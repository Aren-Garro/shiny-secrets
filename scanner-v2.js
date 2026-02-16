#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VERSION = '2.1.0';

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    bold: '\x1b[1m'
};

const {
    scanPatterns,
    scanEntropy,
    deduplicateFindings,
    sortFindings,
    shouldScanFile
} = require('./lib/core');

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

const MERGE_KEYS = new Set(['exclude', 'include', 'allowlist', 'allowPatterns', 'disabledPatterns']);

function mergeConfig(config = {}) {
    const merged = {
        ...defaultConfig,
        ...config,
        entropy: { ...defaultConfig.entropy, ...(config.entropy || {}) }
    };

    for (const key of MERGE_KEYS) {
        merged[key] = Array.isArray(config[key]) 
            ? [...defaultConfig[key], ...config[key]] 
            : [...defaultConfig[key]];
    }

    return merged;
}

function parseConfig(content) {
    const config = {};
    const lines = content.split('\n');
    let section = null;
    let array = null;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        if (trimmed.endsWith(':') && !trimmed.includes(': ')) {
            section = trimmed.slice(0, -1);
            config[section] = {};
            array = null;
        } else if (trimmed.startsWith('- ')) {
            const value = trimmed.slice(2).replace(/["']/g, '');
            if (!array) {
                array = [];
                if (section) config[section] = array;
            }
            array.push(value);
        } else if (trimmed.includes(': ')) {
            const [key, ...parts] = trimmed.split(': ');
            let value = parts.join(': ').replace(/["']/g, '');
            
            if (value === 'true') value = true;
            else if (value === 'false') value = false;
            else if (!isNaN(value) && value !== '') value = +value;

            if (section && typeof config[section] === 'object' && !Array.isArray(config[section])) {
                config[section][key] = value;
            } else {
                config[key] = value;
            }
            array = null;
        }
    }
    return config;
}

function loadConfig(configPath = null) {
    const paths = [
        configPath,
        '.shinysecretsrc',
        '.shinysecretsrc.json',
        '.shinysecretsrc.yaml',
        path.join(process.env.HOME || '', '.shinysecretsrc')
    ].filter(Boolean);

    for (const p of paths) {
        if (fs.existsSync(p)) {
            try {
                return mergeConfig(parseConfig(fs.readFileSync(p, 'utf8')));
            } catch (error) {
                console.error(`${colors.yellow}Config parse failed ${p}: ${error.message}${colors.reset}`);
            }
        }
    }
    return mergeConfig();
}

function scanDirectory(dirPath, config, results = []) {
    if (!fs.existsSync(dirPath)) return results;
    
    const stat = fs.statSync(dirPath);
    
    if (stat.isFile()) {
        if (shouldScanFile(dirPath, config)) {
            try {
                const findings = scanContent(fs.readFileSync(dirPath, 'utf8'), dirPath, config);
                results.push(...findings);
            } catch {}
        }
    } else if (stat.isDirectory()) {
        for (const item of fs.readdirSync(dirPath)) {
            scanDirectory(path.join(dirPath, item), config, results);
        }
    }
    
    return results;
}

function isAllowlisted(finding, config) {
    const key = `${finding.file}:${finding.line}:${finding.type}`;
    if (config.allowlist.includes(key)) return true;
    return config.allowPatterns.some(p => finding.match.includes(p));
}

function scanContent(content, filename = 'input', config = defaultConfig) {
    let findings = scanPatterns(content, {
        filename,
        disabledPatterns: config.disabledPatterns || []
    });

    if (config.entropy.enabled) {
        findings = findings.concat(scanEntropy(content, {
            filename,
            minLength: config.entropy.minLength,
            maxLength: config.entropy.maxLength,
            threshold: config.entropy.threshold,
            allowPatterns: config.allowPatterns || []
        }));
    }

    return sortFindings(deduplicateFindings(findings.filter(f => !isAllowlisted(f, config))));
}

function filterBySeverity(findings, threshold) {
    const levels = { CRITICAL: 3, HIGH: 2, MEDIUM: 1 };
    const min = levels[threshold.toUpperCase()] || 1;
    return findings.filter(f => (levels[f.severity] || 0) >= min);
}

function generateSARIF(findings) {
    const rules = {};
    
    for (const finding of findings) {
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
                properties: { tags: ['security', 'secrets'], precision: 'high' }
            };
        }
    }

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
            results: findings.map(f => ({
                ruleId: f.type.toLowerCase().replace(/\s+/g, '-'),
                level: f.severity === 'CRITICAL' ? 'error' : f.severity === 'HIGH' ? 'warning' : 'note',
                message: { text: `${f.type}: ${f.description}` },
                locations: [{
                    physicalLocation: {
                        artifactLocation: { uri: f.file, uriBaseId: '%SRCROOT%' },
                        region: {
                            startLine: f.line,
                            startColumn: f.column || 1,
                            snippet: { text: f.content }
                        }
                    }
                }]
            }))
        }]
    };
}

function determineExitCode(findings, failOn) {
    if (failOn === 'never' || findings.length === 0) return 0;
    
    const hasCritical = findings.some(f => f.severity === 'CRITICAL');
    const hasHigh = findings.some(f => f.severity === 'HIGH');
    
    switch (failOn.toLowerCase()) {
        case 'critical': return hasCritical ? 1 : 0;
        case 'high': return (hasCritical || hasHigh) ? 1 : 0;
        case 'any': return 1;
        default: return hasCritical ? 1 : 0;
    }
}

function printFindings(findings, options = {}) {
    const { verbose = false, json = false, sarif = false } = options;

    if (sarif) return console.log(JSON.stringify(generateSARIF(findings), null, 2));
    if (json) return console.log(JSON.stringify(findings, null, 2));

    if (findings.length === 0) {
        console.log(`${colors.green}${colors.bold}✓ No secrets detected${colors.reset}`);
        return;
    }

    const counts = {
        CRITICAL: findings.filter(f => f.severity === 'CRITICAL').length,
        HIGH: findings.filter(f => f.severity === 'HIGH').length,
        MEDIUM: findings.filter(f => f.severity === 'MEDIUM').length
    };

    console.log(`${colors.red}${colors.bold}❌ Found ${findings.length} secret${findings.length > 1 ? 's' : ''} across ${new Set(findings.map(f => f.file)).size} file(s)${colors.reset}`);
    if (counts.CRITICAL) console.log(`${colors.red}   🔥 ${counts.CRITICAL} CRITICAL${colors.reset}`);
    if (counts.HIGH) console.log(`${colors.yellow}   ⚠️  ${counts.HIGH} HIGH${colors.reset}`);
    if (counts.MEDIUM) console.log(`${colors.blue}   ℹ️  ${counts.MEDIUM} MEDIUM${colors.reset}`);
    console.log('');

    const byFile = {};
    for (const f of findings) {
        if (!byFile[f.file]) byFile[f.file] = [];
        byFile[f.file].push(f);
    }

    for (const [file, fileFindings] of Object.entries(byFile)) {
        console.log(`${colors.bold}${file}${colors.reset}`);
        for (const finding of fileFindings) {
            const color = finding.severity === 'CRITICAL' ? colors.red : finding.severity === 'HIGH' ? colors.yellow : colors.blue;
            console.log(`${color}  ${finding.line}:${finding.column || 1} ${finding.type} [${finding.severity}]${colors.reset}`);
            if (verbose) {
                console.log(`    ${finding.description}`);
                console.log(`    Match: ${finding.match}`);
                if (finding.entropy) console.log(`    Entropy: ${finding.entropy} bits`);
            }
            console.log(`    ${finding.content.substring(0, 100)}${finding.content.length > 100 ? '...' : ''}`);
            console.log('');
        }
    }
}

function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log(`
${colors.bold}Shiny Secrets v${VERSION}${colors.reset}

Usage:
  shiny-secrets <file|dir>        Scan file or directory
  shiny-secrets --scan-staged     Scan git staged files
  shiny-secrets --help            Show this help

Options:
  --verbose, -v                   Detailed output
  --json                          JSON output
  --sarif                         SARIF output (GitHub Code Scanning)
  --config <path>                 Config file path
  --fail-on=<level>               Exit 1 if secrets found: critical, high, any, never (default: critical)
  --exclude <pattern>             Exclude pattern (repeatable)
  --report-threshold=<level>      Min severity: critical, high, medium (default: medium)

Examples:
  shiny-secrets src/
  shiny-secrets . --fail-on=high --sarif
  shiny-secrets --scan-staged --fail-on=critical
`);
        process.exit(0);
    }

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

    const failOnArg = args.find(a => a.startsWith('--fail-on='));
    if (failOnArg) options.failOn = failOnArg.split('=')[1];

    const thresholdArg = args.find(a => a.startsWith('--report-threshold='));
    if (thresholdArg) options.reportThreshold = thresholdArg.split('=')[1];

    const configIdx = args.indexOf('--config');
    if (configIdx !== -1 && args[configIdx + 1]) options.configPath = args[configIdx + 1];

    args.forEach((arg, i) => {
        if (arg === '--exclude' && args[i + 1]) options.excludePatterns.push(args[i + 1]);
    });

    let config = loadConfig(options.configPath);
    if (options.failOn) config.failOn = options.failOn;
    if (options.reportThreshold) config.reportThreshold = options.reportThreshold;
    if (options.excludePatterns.length) config.exclude = [...config.exclude, ...options.excludePatterns];

    let findings = [];

    if (options.scanStaged) {
        try {
            const output = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' });
            const files = output.split('\n').filter(f => f.trim());
            
            if (files.length === 0) {
                console.log(`${colors.yellow}No staged files${colors.reset}`);
                process.exit(0);
            }

            console.log(`${colors.blue}Scanning ${files.length} staged file(s)${colors.reset}\n`);
            
            for (const file of files) {
                if (shouldScanFile(file, config) && fs.existsSync(file)) {
                    try {
                        findings.push(...scanContent(fs.readFileSync(file, 'utf8'), file, config));
                    } catch {}
                }
            }
        } catch (error) {
            console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
            process.exit(1);
        }
    } else {
        const target = args.find(a => !a.startsWith('--') && a !== '-v');
        if (!target) {
            console.error(`${colors.red}Error: No file or directory specified${colors.reset}`);
            process.exit(1);
        }

        if (!fs.existsSync(target)) {
            console.error(`${colors.red}Error: Path not found: ${target}${colors.reset}`);
            process.exit(1);
        }

        findings = scanDirectory(target, config);
    }

    findings = filterBySeverity(findings, config.reportThreshold);
    printFindings(findings, options);
    process.exit(determineExitCode(findings, config.failOn));
}

if (require.main === module) main();

module.exports = { scanContent, scanDirectory, loadConfig, generateSARIF, VERSION };
