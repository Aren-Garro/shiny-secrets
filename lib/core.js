/**
 * Shiny Secrets Core Module
 * Shared logic for secret detection across CLI and browser surfaces.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.ShinySecretsCore = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const isNode = typeof process !== 'undefined' && !!(process.versions && process.versions.node);
    const fs = isNode ? require('fs') : null;
    const path = isNode ? require('path') : null;

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

    function calculateEntropy(str) {
        if (!str || typeof str !== 'string' || str.length < 8) return 0;
        const len = str.length;
        const freq = {};
        for (let i = 0; i < len; i++) {
            freq[str[i]] = (freq[str[i]] || 0) + 1;
        }
        let entropy = 0;
        for (const char in freq) {
            const p = freq[char] / len;
            entropy -= p * Math.log2(p);
        }
        return entropy;
    }

    function detectHighEntropy(line, lineNumber, options = {}) {
        const {
            minLength = 20,
            maxLength = 100,
            threshold = 3.7,
            allowPatterns = ['example', 'test', 'demo']
        } = options;

        const findings = [];

        if (/^[\s#\/\*]*(?:import|function|class|if|for|while)\b/.test(line)) {
            return findings;
        }

        const tokens = line.split(/[\s'"=:,;(){}[\]<>]/);

        for (const token of tokens) {
            if (token.length >= minLength && token.length <= maxLength && /[a-zA-Z0-9]/.test(token)) {
                if (/^(http|https|www|localhost|127\.0\.0\.1)/.test(token)) continue;
                if (/^\d+$/.test(token)) continue;
                if (allowPatterns.some(p => token.toLowerCase().includes(p.toLowerCase()))) continue;

                const entropy = calculateEntropy(token);
                if (entropy >= threshold && !/^[a-z]+$/.test(token)) {
                    findings.push({
                        type: 'High Entropy String',
                        line: lineNumber,
                        column: line.indexOf(token) + 1,
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

    function scanPatterns(content, options = {}) {
        const {
            filename = 'input',
            disabledPatterns = [],
            maxIterations = 1000
        } = options;

        const findings = [];
        const lines = content.split('\n');

        for (const [key, pattern] of Object.entries(patterns)) {
            if (disabledPatterns.includes(key)) continue;

            lines.forEach((line, index) => {
                const localRegex = new RegExp(pattern.regex.source, pattern.regex.flags);
                let match;
                let iterationCount = 0;

                while ((match = localRegex.exec(line)) !== null) {
                    if (++iterationCount > maxIterations) {
                        console.warn(`Warning: Regex pattern ${key} exceeded iteration limit on line ${index + 1}`);
                        break;
                    }

                    const matchValue = match[1] || match[0];
                    findings.push({
                        type: pattern.name,
                        line: index + 1,
                        column: match.index + 1,
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

        return findings;
    }

    function scanEntropy(content, options = {}) {
        const { filename = 'input' } = options;
        const findings = [];
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            const entropyFindings = detectHighEntropy(line, index + 1, options);
            entropyFindings.forEach(finding => {
                finding.file = filename;
                findings.push(finding);
            });
        });

        return findings;
    }

    function deduplicateFindings(findings) {
        const uniqueFindings = [];
        const seen = new Set();

        for (const finding of findings) {
            const key = `${finding.file || ''}|${finding.type}|${finding.line}|${finding.match}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueFindings.push(finding);
            }
        }

        return uniqueFindings;
    }

    function sortFindings(findings) {
        return findings.sort((a, b) => {
            const fileA = a.file || '';
            const fileB = b.file || '';
            if (fileA !== fileB) return fileA.localeCompare(fileB);
            return a.line - b.line;
        });
    }

    function scanContent(content, options = {}) {
        if (typeof content !== 'string') {
            throw new TypeError(`Expected string content, got ${typeof content}`);
        }

/**
 * Check if path matches glob pattern
 * @param {string} filePath - File path to check
 * @param {string} pattern - Glob pattern
 * @returns {boolean} - Whether path matches pattern
 */
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

        if (enableEntropy) {
            findings.push(...scanEntropy(content, options));
        }

        return sortFindings(deduplicateFindings(findings));
    }

    function matchesGlob(filePath, pattern) {
        const normalizedPath = filePath.replace(/\\/g, '/');
        const regex = pattern
            .replace(/\./g, '\\.')
            .replace(/\*\*/g, '§§')
            .replace(/\*/g, '[^/]*')
            .replace(/§§/g, '.*')
            .replace(/\?/g, '.');
        return new RegExp('^' + regex + '$').test(normalizedPath);
    }

    function shouldScanFile(filePath, config) {
        if (!isNode || !path) {
            throw new Error('shouldScanFile is only available in Node.js environments');
        }

        const normalizedInput = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
        const relativePath = path.relative(process.cwd(), normalizedInput).replace(/\\/g, '/');

        const candidatePaths = [relativePath, `/${relativePath}`];

        for (const pattern of config.exclude || []) {
            if (candidatePaths.some(candidate => matchesGlob(candidate, pattern))) return false;
        }

        const ext = path.extname(filePath);
        for (const pattern of config.include || []) {
            if (pattern.startsWith('*.')) {
                if (ext === pattern.slice(1)) return true;
            } else if (candidatePaths.some(candidate => matchesGlob(candidate, pattern))) {
                return true;
            }
        }
        
        // For large files, check size limit
        if (stat.size > maxSize) {
            reject(new Error(`File too large: ${stat.size} bytes (max: ${maxSize})`));
            return;
        }

        const { maxSize = 10 * 1024 * 1024 } = options;

        return new Promise((resolve, reject) => {
            const stat = fs.statSync(filePath);

            if (stat.size < 1024 * 1024) {
                try {
                    resolve(fs.readFileSync(filePath, 'utf8'));
                } catch (error) {
                    reject(error);
                }
                return;
            }

            if (stat.size > maxSize) {
                reject(new Error(`File too large: ${stat.size} bytes (max: ${maxSize})`));
                return;
            }

            const chunks = [];
            const stream = fs.createReadStream(filePath, { encoding: 'utf8' });

            stream.on('data', chunk => chunks.push(chunk));
            stream.on('end', () => resolve(chunks.join('')));
            stream.on('error', reject);
        });
    }

    return {
        patterns,
        calculateEntropy,
        detectHighEntropy,
        scanContent,
        scanPatterns,
        scanEntropy,
        deduplicateFindings,
        sortFindings,
        matchesGlob,
        shouldScanFile,
        readFileOptimized
    };
}));
