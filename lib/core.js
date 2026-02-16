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
            regex: /sk_live_[0-9a-zA-Z]{24,100}(?![0-9a-zA-Z])/g,
            description: 'Stripe Secret Live Key',
            severity: 'CRITICAL'
        },
        stripe_test_key: {
            name: 'Stripe Test API Key',
            regex: /sk_test_[0-9a-zA-Z]{24,100}(?![0-9a-zA-Z])/g,
            description: 'Stripe Secret Test Key',
            severity: 'HIGH'
        },
        github_token: {
            name: 'GitHub Token',
            regex: /ghp_[a-zA-Z0-9]{36,100}(?![a-zA-Z0-9])/g,
            description: 'GitHub Personal Access Token',
            severity: 'CRITICAL'
        },
        github_oauth: {
            name: 'GitHub OAuth Token',
            regex: /gho_[a-zA-Z0-9]{36,100}(?![a-zA-Z0-9])/g,
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
            regex: /xox[baprs]-[0-9a-zA-Z-]{10,100}(?![0-9a-zA-Z-])/g,
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
            regex: /(?:mysql|postgresql|mongodb|redis):\/\/[^\s'"]{1,500}(?![^\s'"])/gi,
            description: 'Database Connection String',
            severity: 'CRITICAL'
        },
        generic_api_key: {
            name: 'Generic API Key',
            regex: /(?:api[_-]?key|apikey)\s*[:=]\s*['"]([a-zA-Z0-9_-]{20,100})(?![a-zA-Z0-9_-])['"]?/gi,
            description: 'Generic API Key Pattern',
            severity: 'HIGH'
        },
        password_field: {
            name: 'Password in Code',
            regex: /(?:password|passwd|pwd)\s*[:=]\s*['"]([^'"]{8,100})(?![^'"])['"]?/gi,
            description: 'Password Assignment (8+ chars)',
            severity: 'HIGH'
        },
        bearer_token: {
            name: 'Bearer Token',
            regex: /Bearer\s+[a-zA-Z0-9_-]{20,100}(?![a-zA-Z0-9_-])/gi,
            description: 'Bearer Authentication Token',
            severity: 'HIGH'
        },
        oauth_token: {
            name: 'OAuth Token',
            regex: /oauth[_-]?token\s*[:=]\s*['"]([a-zA-Z0-9_-]{20,100})(?![a-zA-Z0-9_-])['"]?/gi,
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
        const len = str.length;
        if (len < 8) return 0;
        
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
            allowPatterns = []
        } = options;

        if (/^[\s#\/\*]*(?:import|function|class|if|for|while)\b/.test(line)) return [];

        const findings = [];
        const tokenRegex = /[a-zA-Z0-9_\-+=\/]{20,100}/g;
        let match;

        while ((match = tokenRegex.exec(line)) !== null) {
            const token = match[0];
            if (token.length < minLength || token.length > maxLength) continue;
            if (!/[a-zA-Z0-9]/.test(token)) continue;
            if (/^(http|https|www|localhost|127\.0\.0\.1)/.test(token)) continue;
            if (/^\d+$/.test(token)) continue;
            if (/^[a-z]+$/.test(token)) continue;
            if (allowPatterns.some(p => token.toLowerCase().includes(p.toLowerCase()))) continue;

            const entropy = calculateEntropy(token);
            if (entropy >= threshold) {
                findings.push({
                    type: 'High Entropy String',
                    line: lineNumber,
                    column: match.index + 1,
                    match: token,
                    content: line.trim(),
                    entropy: entropy.toFixed(2),
                    description: 'Potential secret with high randomness',
                    severity: 'MEDIUM'
                });
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
        const safeMax = Math.min(Math.max(1, maxIterations | 0), 10000);

        for (const [key, pattern] of Object.entries(patterns)) {
            if (disabledPatterns.includes(key)) continue;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
                let match, iterations = 0;

                while ((match = regex.exec(line)) !== null && ++iterations <= safeMax) {
                    findings.push({
                        type: pattern.name,
                        line: i + 1,
                        column: match.index + 1,
                        match: match[1] || match[0],
                        content: line.trim(),
                        description: pattern.description,
                        severity: pattern.severity,
                        file: filename
                    });

                    if (match.index === regex.lastIndex) regex.lastIndex++;
                }

                if (iterations > safeMax) {
                    console.warn(`Pattern ${key} exceeded limit at line ${i + 1}`);
                }
            }
        }

        return findings;
    }

    function scanEntropy(content, options = {}) {
        const { filename = 'input', enabled = true } = options;
        if (!enabled) return [];

        const findings = [];
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const entropyFindings = detectHighEntropy(lines[i], i + 1, options);
            for (const finding of entropyFindings) {
                finding.file = filename;
                findings.push(finding);
            }
        }

        return findings;
    }

    function deduplicateFindings(findings) {
        const seen = new Set();
        return findings.filter(f => {
            const key = `${f.file || ''}|${f.type}|${f.line}|${f.match}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function sortFindings(findings) {
        return findings.sort((a, b) => {
            const fileCompare = (a.file || '').localeCompare(b.file || '');
            return fileCompare !== 0 ? fileCompare : a.line - b.line;
        });
    }

    function scanContent(content, options = {}) {
        if (typeof content !== 'string') {
            throw new TypeError(`Expected string, got ${typeof content}`);
        }

        const { enableEntropy = false } = options;
        let findings = scanPatterns(content, options);

        if (enableEntropy) {
            findings = findings.concat(scanEntropy(content, options));
        }

        return sortFindings(deduplicateFindings(findings));
    }

    function matchesGlob(filePath, pattern) {
        const normalize = (p) => p.replace(/\\/g, '/');
        const pathParts = normalize(filePath).split('/');
        const patternParts = normalize(pattern).split('/');
        const memo = new Map();

        const matchSegment = (seg, cand) => {
            const escaped = seg.replace(/([.+^${}()|[\]\\])/g, '\\$1');
            const regex = new RegExp('^' + escaped.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
            return regex.test(cand);
        };

        const match = (pi, fi) => {
            const key = `${pi}:${fi}`;
            if (memo.has(key)) return memo.get(key);

            if (pi === patternParts.length) {
                memo.set(key, fi === pathParts.length);
                return memo.get(key);
            }

            const part = patternParts[pi];
            let result = false;

            if (part === '**') {
                if (pi === patternParts.length - 1) {
                    result = true;
                } else {
                    for (let i = fi; i <= pathParts.length; i++) {
                        if (match(pi + 1, i)) {
                            result = true;
                            break;
                        }
                    }
                }
            } else if (fi < pathParts.length && matchSegment(part, pathParts[fi])) {
                result = match(pi + 1, fi + 1);
            }

            memo.set(key, result);
            return result;
        };

        return match(0, 0);
    }

    function shouldScanFile(filePath, config) {
        if (!isNode || !path) {
            throw new Error('shouldScanFile requires Node.js environment');
        }

        const normalized = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
        const relative = path.relative(process.cwd(), normalized).replace(/\\/g, '/');
        const candidates = [relative, `/${relative}`];

        for (const pattern of config.exclude || []) {
            if (candidates.some(c => matchesGlob(c, pattern))) return false;
        }

        const ext = path.extname(filePath);
        for (const pattern of config.include || []) {
            if (pattern.startsWith('*.') && ext === pattern.slice(1)) return true;
            if (candidates.some(c => matchesGlob(c, pattern))) return true;
        }

        return !config.include || config.include.length === 0;
    }

    function readFileOptimized(filePath, options = {}) {
        if (!isNode || !fs) {
            throw new Error('readFileOptimized requires Node.js environment');
        }

        const { maxSize = 10 * 1024 * 1024 } = options;

        return new Promise((resolve, reject) => {
            fs.stat(filePath, (err, stat) => {
                if (err) return reject(err);
                if (stat.size > maxSize) {
                    return reject(new Error(`File exceeds ${maxSize} bytes: ${stat.size}`));
                }

                if (stat.size < 1024 * 1024) {
                    fs.readFile(filePath, 'utf8', (err, data) => {
                        if (err) return reject(err);
                        resolve(data);
                    });
                } else {
                    const chunks = [];
                    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
                    stream.on('data', chunk => chunks.push(chunk));
                    stream.on('end', () => resolve(chunks.join('')));
                    stream.on('error', reject);
                }
            });
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
