#!/usr/bin/env node

/**
 * Shiny Secrets - CLI Secret Scanner
 * Detects hardcoded secrets and credentials in source code
 * Usage: node scanner.js <file-path>
 *        node scanner.js --scan-staged (for git pre-commit)
 */

const fs = require('fs');
const { execSync } = require('child_process');
const {
    patterns,
    calculateEntropy,
    scanContent: scanContentCore
} = require('./lib/core');

// ANSI color codes for terminal output
const colors = {
    reset: '[0m',
    red: '[31m',
    green: '[32m',
    yellow: '[33m',
    blue: '[34m',
    magenta: '[35m',
    cyan: '[36m',
    bold: '[1m'
};

/**
 * Scan content for secrets and credentials
 * @param {string} content - File content to scan
 * @param {string} filename - Name of file being scanned
 * @returns {Array} - Array of findings
 */
function scanContent(content, filename = 'input') {
    return scanContentCore(content, { filename, enableEntropy: true });
}

/**
 * Get color for severity level
 * @param {string} severity - Severity level
 * @returns {string} - ANSI color code
 */
function getSeverityColor(severity) {
    switch(severity) {
        case 'CRITICAL': return colors.red;
        case 'HIGH': return colors.yellow;
        case 'MEDIUM': return colors.blue;
        default: return colors.cyan;
    }
}

/**
 * Format and print findings to console
 * @param {Array} findings - Array of findings
 * @param {Object} options - Output options
 */
function printFindings(findings, options = {}) {
    const { verbose = false, json = false } = options;

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

    console.log(`${colors.red}${colors.bold}❌ Found ${findings.length} secret${findings.length > 1 ? 's' : ''}${colors.reset}`);
    if (criticalCount > 0) {
        console.log(`${colors.red}   🔥 ${criticalCount} CRITICAL${colors.reset}`);
    }
    if (highCount > 0) {
        console.log(`${colors.yellow}   ⚠️  ${highCount} HIGH${colors.reset}`);
    }
    console.log('');

    findings.forEach((finding, index) => {
        const color = getSeverityColor(finding.severity);
        console.log(`${color}${index + 1}. ${finding.type} [${finding.severity}]${colors.reset}`);
        console.log(`   File: ${finding.file}`);
        console.log(`   Line: ${finding.line}`);
        if (verbose) {
            console.log(`   Description: ${finding.description}`);
            console.log(`   Match: ${finding.match}`);
            if (finding.entropy) {
                console.log(`   Entropy: ${finding.entropy} bits`);
            }
        }
        console.log(`   Code: ${finding.content.substring(0, 100)}${finding.content.length > 100 ? '...' : ''}`);
        console.log('');
    });
}

function getStagedFiles() {
    try {
        const output = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' });
        return output.split('\n').filter(f => f.trim().length > 0);
    } catch (error) {
        console.error(`${colors.red}Error getting staged files: ${error.message}${colors.reset}`);
        return [];
    }
}

function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log(`
${colors.bold}Shiny Secrets - CLI Secret Scanner${colors.reset}

Usage:
  node scanner.js <file>              Scan a single file
  node scanner.js --scan-staged       Scan git staged files (for pre-commit)
  node scanner.js --help              Show this help message

Options:
  --verbose, -v                       Show detailed output
  --json                              Output results as JSON
  --fail-on-critical                  Exit with code 1 if critical secrets found

Examples:
  node scanner.js config.js
  node scanner.js --scan-staged --fail-on-critical
  node scanner.js app.js --json > results.json

`);
        process.exit(0);
    }

    const options = {
        verbose: args.includes('--verbose') || args.includes('-v'),
        json: args.includes('--json'),
        failOnCritical: args.includes('--fail-on-critical'),
        scanStaged: args.includes('--scan-staged')
    };

    let allFindings = [];

    if (options.scanStaged) {
        const stagedFiles = getStagedFiles();
        if (stagedFiles.length === 0) {
            console.log(`${colors.yellow}No staged files to scan${colors.reset}`);
            process.exit(0);
        }

        console.log(`${colors.blue}Scanning ${stagedFiles.length} staged file(s)...${colors.reset}
`);

        for (const file of stagedFiles) {
            if (!fs.existsSync(file)) continue;

            if (file.includes('node_modules/') ||
                file.match(/\.(jpg|jpeg|png|gif|pdf|zip|tar|gz|exe|dll|so|dylib)$/i)) {
                continue;
            }

            try {
                const content = fs.readFileSync(file, 'utf8');
                allFindings.push(...scanContent(content, file));
            } catch (error) {
                continue;
            }
        }
    } else {
        const filePath = args.find(arg => !arg.startsWith('--'));
        if (!filePath) {
            console.error(`${colors.red}Error: No file specified${colors.reset}`);
            process.exit(1);
        }

        if (!fs.existsSync(filePath)) {
            console.error(`${colors.red}Error: File not found: ${filePath}${colors.reset}`);
            process.exit(1);
        }

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            allFindings = scanContent(content, filePath);
        } catch (error) {
            console.error(`${colors.red}Error reading file: ${error.message}${colors.reset}`);
            process.exit(1);
        }
    }

    printFindings(allFindings, options);

    if (allFindings.length > 0) {
        if (options.failOnCritical) {
            const hasCritical = allFindings.some(f => f.severity === 'CRITICAL');
            process.exit(hasCritical ? 1 : 0);
        }
        process.exit(1);
    }

    process.exit(0);
}

if (require.main === module) {
    main();
}

module.exports = { scanContent, patterns, calculateEntropy };
