#!/usr/bin/env node

/**
 * Shiny Secrets - CLI Secret Scanner
 * Detects hardcoded secrets and credentials in source code
 * Usage: node scanner.js <file-path>
 *        node scanner.js --scan-staged (for git pre-commit)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for terminal output
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

// Secret detection patterns (same as web version)
const patterns = {
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
    stripe_test_key: {
        name: 'Stripe Test API Key',
        regex: /sk_test_[0-9a-zA-Z]{24,}/g,
        description: 'Stripe Secret Test Key',
        severity: 'HIGH'
    },
    github_token: {
        name: 'GitHub Token',
        regex: /ghp_[a-zA-Z0-9]{36,}/g,
        description: 'GitHub Personal Access Token',
        severity: 'CRITICAL'
    },
    github_oauth: {
        name: 'GitHub OAuth Token',
        regex: /gho_[a-zA-Z0-9]{36,}/g,
        description: 'GitHub OAuth Access Token',
        severity: 'CRITICAL'
    },
    google_api_key: {
        name: 'Google API Key',
        regex: /AIza[0-9A-Za-z_-]{35}/g,
        description: 'Google Cloud API Key',
        severity: 'HIGH'
    },
    slack_token: {
        name: 'Slack Token',
        regex: /xox[baprs]-[0-9a-zA-Z-]{10,}/g,
        description: 'Slack API Token',
        severity: 'HIGH'
    },
    slack_webhook: {
        name: 'Slack Webhook',
        regex: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]+\/B[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/g,
        description: 'Slack Webhook URL',
        severity: 'HIGH'
    },
    jwt_token: {
        name: 'JWT Token',
        regex: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
        description: 'JSON Web Token',
        severity: 'MEDIUM'
    },
    private_key: {
        name: 'Private Key',
        regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
        description: 'Private Key (RSA/EC/OpenSSH)',
        severity: 'CRITICAL'
    },
    database_url: {
        name: 'Database Connection URL',
        regex: /(?:mysql|postgresql|mongodb|redis):\/\/[^\s'"]+/gi,
        description: 'Database Connection String',
        severity: 'CRITICAL'
    },
    generic_api_key: {
        name: 'Generic API Key',
        regex: /(?:api[_-]?key|apikey)\s*[:=]\s*['"]([a-zA-Z0-9_-]{20,})['"]?/gi,
        description: 'Generic API Key Pattern',
        severity: 'HIGH'
    },
    password_field: {
        name: 'Password in Code',
        regex: /(?:password|passwd|pwd)\s*[:=]\s*['"]([^'"]{8,})['"]?/gi,
        description: 'Password Assignment (8+ chars)',
        severity: 'HIGH'
    },
    bearer_token: {
        name: 'Bearer Token',
        regex: /Bearer\s+[a-zA-Z0-9_-]{20,}/gi,
        description: 'Bearer Authentication Token',
        severity: 'HIGH'
    },
    oauth_token: {
        name: 'OAuth Token',
        regex: /oauth[_-]?token\s*[:=]\s*['"]([a-zA-Z0-9_-]{20,})['"]?/gi,
        description: 'OAuth Access Token',
        severity: 'HIGH'
    },
    sendgrid_key: {
        name: 'SendGrid API Key',
        regex: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g,
        description: 'SendGrid API Key',
        severity: 'HIGH'
    },
    twilio_key: {
        name: 'Twilio API Key',
        regex: /SK[a-z0-9]{32}/g,
        description: 'Twilio API Key',
        severity: 'HIGH'
    },
    azure_key: {
        name: 'Azure Key',
        regex: /(?:azure|storage)[_-]?(?:key|secret)\s*[:=]\s*['"]?([a-zA-Z0-9+/]{44}={0,2})['"]?/gi,
        description: 'Azure Storage/API Key',
        severity: 'HIGH'
    },
    heroku_api_key: {
        name: 'Heroku API Key',
        regex: /(?:heroku|HEROKU)[_-]?(?:api[_-]?)?(?:key|token)\s*[:=]\s*['"]?([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})['"]?/gi,
        description: 'Heroku API Key with context',
        severity: 'HIGH'
    }
};

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

// High entropy detection
function detectHighEntropy(line, lineNumber) {
    const findings = [];
    if (/^[\s#\/\*]*(?:import|export|const|let|var|function|class|if|for|while)/.test(line)) {
        return findings;
    }
    
    const tokens = line.split(/[\s'"=:,;(){}[\]<>]/);
    
    for (let token of tokens) {
        if (token.length >= 20 && token.length <= 100 && /[a-zA-Z0-9]/.test(token)) {
            if (/^(http|https|www|localhost|127\.0\.0\.1)/.test(token)) continue;
            if (/^\d+$/.test(token)) continue;
            if (token.includes('example') || token.includes('test') || token.includes('demo')) continue;
            
            const entropy = calculateEntropy(token);
            if (entropy >= 4.7 && !/^[a-z]+$/.test(token)) {
                findings.push({
                    type: 'High Entropy String',
                    line: lineNumber,
                    match: token,
                    content: line.trim(),
                    entropy: entropy.toFixed(2),
                    description: 'Potential secret with high randomness',
                    severity: 'MEDIUM'
                });
            }
        }
    }
    return findings;
}

// Main scan function
function scanContent(content, filename = 'input') {
    const findings = [];
    const lines = content.split('\n');

    // Apply regex patterns
    for (let [key, pattern] of Object.entries(patterns)) {
        lines.forEach((line, index) => {
            const localRegex = new RegExp(pattern.regex.source, pattern.regex.flags);
            let match;
            while ((match = localRegex.exec(line)) !== null) {
                const matchValue = match[1] || match[0];
                findings.push({
                    type: pattern.name,
                    line: index + 1,
                    match: matchValue,
                    content: line.trim(),
                    description: pattern.description,
                    severity: pattern.severity,
                    file: filename
                });
                if (match.index === localRegex.lastIndex) {
                    localRegex.lastIndex++;
                }
            }
        });
    }

    // Apply entropy detection
    lines.forEach((line, index) => {
        const entropyFindings = detectHighEntropy(line, index + 1);
        entropyFindings.forEach(f => {
            f.file = filename;
            findings.push(f);
        });
    });

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

    uniqueFindings.sort((a, b) => a.line - b.line);
    return uniqueFindings;
}

// Get color for severity
function getSeverityColor(severity) {
    switch(severity) {
        case 'CRITICAL': return colors.red;
        case 'HIGH': return colors.yellow;
        case 'MEDIUM': return colors.blue;
        default: return colors.cyan;
    }
}

// Format and print findings
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

// Get staged files for git pre-commit hook
function getStagedFiles() {
    try {
        const output = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' });
        return output.split('\n').filter(f => f.trim().length > 0);
    } catch (error) {
        console.error(`${colors.red}Error getting staged files: ${error.message}${colors.reset}`);
        return [];
    }
}

// Main CLI logic
function main() {
    const args = process.argv.slice(2);
    
    // Show help
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
        // Scan git staged files
        const stagedFiles = getStagedFiles();
        if (stagedFiles.length === 0) {
            console.log(`${colors.yellow}No staged files to scan${colors.reset}`);
            process.exit(0);
        }

        console.log(`${colors.blue}Scanning ${stagedFiles.length} staged file(s)...${colors.reset}\n`);

        for (let file of stagedFiles) {
            if (!fs.existsSync(file)) continue;
            
            // Skip binary files and node_modules
            if (file.includes('node_modules/') || 
                file.match(/\.(jpg|jpeg|png|gif|pdf|zip|tar|gz|exe|dll|so|dylib)$/i)) {
                continue;
            }

            try {
                const content = fs.readFileSync(file, 'utf8');
                const findings = scanContent(content, file);
                allFindings.push(...findings);
            } catch (error) {
                // Skip files that can't be read as text
                continue;
            }
        }
    } else {
        // Scan single file
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

    // Print results
    printFindings(allFindings, options);

    // Exit with appropriate code
    if (allFindings.length > 0) {
        const hasCritical = allFindings.some(f => f.severity === 'CRITICAL');
        if (options.failOnCritical && hasCritical) {
            process.exit(1);
        }
        process.exit(1); // Exit with error if any secrets found
    }

    process.exit(0);
}

// Run if executed directly
if (require.main === module) {
    main();
}

// Export for testing
module.exports = { scanContent, patterns, calculateEntropy };
