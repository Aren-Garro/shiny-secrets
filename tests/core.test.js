/**
 * Core Module Tests
 * Unified test suite using Jest
 */

const {
    calculateEntropy,
    detectHighEntropy,
    scanContent,
    scanPatterns,
    scanEntropy,
    deduplicateFindings,
    sortFindings,
    matchesGlob,
    shouldScanFile,
    readFileOptimized,
    patterns
} = require('../lib/core');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('Core Module', () => {
    describe('calculateEntropy', () => {
        test('calculates entropy for random string', () => {
            const entropy = calculateEntropy('a9b8c7d6e5f4g3h2');
            expect(entropy).toBeGreaterThan(3.5);
            expect(entropy).toBeLessThan(5.0);
        });

        test('returns low entropy for repeated characters', () => {
            const entropy = calculateEntropy('aaaaaaaaaaaaaaaa');
            expect(entropy).toBe(0);
        });

        test('returns 0 for short strings', () => {
            const entropy = calculateEntropy('abc');
            expect(entropy).toBe(0);
        });

        test('handles empty string', () => {
            const entropy = calculateEntropy('');
            expect(entropy).toBe(0);
        });

        test('handles non-string input', () => {
            const entropy = calculateEntropy(null);
            expect(entropy).toBe(0);
        });
    });

    describe('detectHighEntropy', () => {
        test('detects high entropy token', () => {
            const line = 'const secret = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";';
            const findings = detectHighEntropy(line, 1);
            
            expect(findings.length).toBeGreaterThan(0);
            expect(findings[0].type).toBe('High Entropy String');
            expect(findings[0].severity).toBe('MEDIUM');
        });

        test('skips common code patterns', () => {
            const line = 'import something from "somewhere";';
            const findings = detectHighEntropy(line, 1);
            
            expect(findings.length).toBe(0);
        });

        test('skips URLs', () => {
            const line = 'const url = "https://example.com/api/v1/endpoint";';
            const findings = detectHighEntropy(line, 1);
            
            expect(findings.length).toBe(0);
        });

        test('skips test/demo/example patterns', () => {
            const line = 'const token = "example_token_12345678901234567890";';
            const findings = detectHighEntropy(line, 1);
            
            expect(findings.length).toBe(0);
        });

        test('respects custom options', () => {
            const line = 'const key = "abcd1234efgh5678ijkl";';
            const findings = detectHighEntropy(line, 1, {
                minLength: 10,
                threshold: 3.0
            });
            
            expect(findings.length).toBeGreaterThan(0);
        });

        test('reports correct columns for duplicate tokens', () => {
            const line = 'key1="abc123def456ghi789jkl" key2="abc123def456ghi789jkl"';
            const findings = detectHighEntropy(line, 1, {
                minLength: 10,
                threshold: 3.0
            });

            expect(findings.length).toBe(2);
            expect(findings[0].column).toBe(7);
            expect(findings[1].column).toBe(36);
        });
    });

    describe('scanPatterns', () => {
        test('detects AWS access key', () => {
            const content = 'const key = "AKIAIOSFODNN7EXAMPLE";';
            const findings = scanPatterns(content, { filename: 'test.js' });
            
            expect(findings.length).toBeGreaterThan(0);
            expect(findings[0].type).toBe('AWS Access Key');
            expect(findings[0].severity).toBe('CRITICAL');
        });

        test('detects GitHub token', () => {
            const content = 'token = "ghp_abcd1234efgh5678ijkl9012mnop3456qrst";';
            const findings = scanPatterns(content, { filename: 'config.js' });
            
            expect(findings.length).toBeGreaterThan(0);
            expect(findings[0].type).toBe('GitHub Token');
        });

        test('detects Stripe test key', () => {
            const content = 'STRIPE_KEY=' + 'sk_test_' + 'abcd1234efgh5678ijkl9012';
            const findings = scanPatterns(content, { filename: '.env' });
            
            expect(findings.length).toBeGreaterThan(0);
            expect(findings[0].type).toBe('Stripe Test API Key');
            expect(findings[0].severity).toBe('HIGH');
        });

        test('detects private key', () => {
            const content = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...';
            const findings = scanPatterns(content, { filename: 'key.pem' });
            
            expect(findings.length).toBeGreaterThan(0);
            expect(findings[0].type).toBe('Private Key');
        });

        test('detects JWT token', () => {
            const content = 'token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";';
            const findings = scanPatterns(content, { filename: 'auth.js' });
            
            expect(findings.length).toBeGreaterThan(0);
            expect(findings[0].type).toBe('JWT Token');
        });

        test('respects disabled patterns', () => {
            const content = 'token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";';
            const findings = scanPatterns(content, {
                filename: 'auth.js',
                disabledPatterns: ['jwt_token']
            });
            
            expect(findings.length).toBe(0);
        });

        test('handles multiple matches on same line', () => {
            const content = 'keys = ["AKIAIOSFODNN7EXAMPLE", "AKIAIOSFODNN8EXAMPLE"];';
            const findings = scanPatterns(content, { filename: 'test.js' });
            
            expect(findings.length).toBe(2);
        });
    });

    describe('scanEntropy', () => {
        test('detects high entropy strings', () => {
            const content = 'const secret = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0";';
            const findings = scanEntropy(content, { filename: 'app.js' });
            
            expect(findings.length).toBeGreaterThan(0);
            expect(findings[0].entropy).toBeDefined();
        });

        test('can be disabled', () => {
            const content = 'const secret = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0";';
            const findings = scanEntropy(content, {
                filename: 'app.js',
                enabled: false
            });

            expect(findings.length).toBe(0);
        });
    });

    describe('scanContent', () => {
        test('combines pattern and entropy detection', () => {
            const content = `
const awsKey = "AKIAIOSFODNN7EXAMPLE";
const someSecret = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";
            `;
            const findings = scanContent(content, {
                filename: 'config.js',
                enableEntropy: true
            });
            
            expect(findings.length).toBeGreaterThan(1);
        });

        test('deduplicates findings', () => {
            const content = `
const key1 = "AKIAIOSFODNN7EXAMPLE";
const key2 = "AKIAIOSFODNN7EXAMPLE";
            `;
            const findings = scanContent(content, { filename: 'test.js' });
            
            // Should only find unique findings (same key twice = 1 finding per line)
            expect(findings.length).toBe(2);
        });

        test('throws on non-string content', () => {
            expect(() => {
                scanContent(null);
            }).toThrow(TypeError);
        });

        test('respects enableEntropy option', () => {
            const content = 'const secret = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0";';
            const findings = scanContent(content, {
                filename: 'app.js',
                enableEntropy: false
            });
            
            // Should not find entropy-based secrets
            const entropyFindings = findings.filter(f => f.type === 'High Entropy String');
            expect(entropyFindings.length).toBe(0);
        });
    });

    describe('deduplicateFindings', () => {
        test('removes duplicate findings', () => {
            const findings = [
                { file: 'test.js', type: 'AWS Access Key', line: 1, match: 'AKIA123' },
                { file: 'test.js', type: 'AWS Access Key', line: 1, match: 'AKIA123' },
                { file: 'test.js', type: 'AWS Access Key', line: 2, match: 'AKIA456' }
            ];
            
            const unique = deduplicateFindings(findings);
            expect(unique.length).toBe(2);
        });

        test('preserves unique findings', () => {
            const findings = [
                { file: 'a.js', type: 'Type A', line: 1, match: 'ABC' },
                { file: 'b.js', type: 'Type A', line: 1, match: 'ABC' },
                { file: 'a.js', type: 'Type B', line: 1, match: 'ABC' }
            ];
            
            const unique = deduplicateFindings(findings);
            expect(unique.length).toBe(3);
        });
    });

    describe('sortFindings', () => {
        test('sorts by file then line number', () => {
            const findings = [
                { file: 'b.js', line: 5 },
                { file: 'a.js', line: 10 },
                { file: 'a.js', line: 2 },
                { file: 'b.js', line: 1 }
            ];
            
            const sorted = sortFindings(findings);
            
            expect(sorted[0].file).toBe('a.js');
            expect(sorted[0].line).toBe(2);
            expect(sorted[1].file).toBe('a.js');
            expect(sorted[1].line).toBe(10);
            expect(sorted[2].file).toBe('b.js');
            expect(sorted[2].line).toBe(1);
        });
    });

    describe('matchesGlob', () => {
        test('matches exact paths', () => {
            expect(matchesGlob('test.js', 'test.js')).toBe(true);
            expect(matchesGlob('test.js', 'other.js')).toBe(false);
        });

        test('matches wildcards', () => {
            expect(matchesGlob('test.js', '*.js')).toBe(true);
            expect(matchesGlob('test.py', '*.js')).toBe(false);
        });

        test('matches directory wildcards', () => {
            expect(matchesGlob('src/test.js', 'src/*.js')).toBe(true);
            expect(matchesGlob('src/test.js', '*.js')).toBe(false);
        });

        test('matches recursive wildcards', () => {
            expect(matchesGlob('src/lib/test.js', '**/*.js')).toBe(true);
            expect(matchesGlob('a/b/c/d.js', '**/*.js')).toBe(true);
        });

        test('matches root and nested node_modules with leading recursive glob', () => {
            expect(matchesGlob('node_modules/pkg/index.js', '**/node_modules/**')).toBe(true);
            expect(matchesGlob('src/node_modules/pkg/index.js', '**/node_modules/**')).toBe(true);
        });

        test('matches minified javascript at root and nested paths', () => {
            expect(matchesGlob('bundle.min.js', '**/*.min.js')).toBe(true);
            expect(matchesGlob('dist/assets/bundle.min.js', '**/*.min.js')).toBe(true);
        });

        test('handles Windows paths', () => {
            expect(matchesGlob('src\\test.js', 'src/*.js')).toBe(true);
        });
    });

    describe('shouldScanFile', () => {
        const config = {
            include: ['*.js', '*.ts', '*.env'],
            exclude: ['**/node_modules/**', '**/*.min.js']
        };

        test('includes matching file', () => {
            expect(shouldScanFile('test.js', config)).toBe(true);
            expect(shouldScanFile('app.ts', config)).toBe(true);
        });

        test('excludes non-matching file', () => {
            expect(shouldScanFile('test.py', config)).toBe(false);
        });

        test('excludes node_modules', () => {
            expect(shouldScanFile('node_modules/pkg/index.js', config)).toBe(false);
            expect(shouldScanFile('src/node_modules/pkg/index.js', config)).toBe(false);
        });

        test('excludes minified files', () => {
            expect(shouldScanFile('bundle.min.js', config)).toBe(false);
        });
    });

    describe('patterns', () => {
        test('contains all expected patterns', () => {
            expect(patterns).toHaveProperty('aws_access_key');
            expect(patterns).toHaveProperty('github_token');
            expect(patterns).toHaveProperty('stripe_live_key');
            expect(patterns).toHaveProperty('private_key');
        });

        test('patterns have required fields', () => {
            Object.values(patterns).forEach(pattern => {
                expect(pattern).toHaveProperty('name');
                expect(pattern).toHaveProperty('regex');
                expect(pattern).toHaveProperty('description');
                expect(pattern).toHaveProperty('severity');
                expect(pattern.regex).toBeInstanceOf(RegExp);
            });
        });
    });

    describe('readFileOptimized', () => {
        test('reads file asynchronously without blocking event loop', async () => {
            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiny-secrets-'));
            const tempFile = path.join(tempDir, 'large-file.txt');
            fs.writeFileSync(tempFile, 'x'.repeat(2 * 1024 * 1024));

            let asyncTickCompleted = false;
            const tickPromise = new Promise(resolve => {
                setTimeout(() => {
                    asyncTickCompleted = true;
                    resolve();
                }, 0);
            });

            const contentPromise = readFileOptimized(tempFile);
            await tickPromise;
            const content = await contentPromise;

            expect(asyncTickCompleted).toBe(true);
            expect(content.length).toBe(2 * 1024 * 1024);

            fs.unlinkSync(tempFile);
            fs.rmdirSync(tempDir);
        });
    });
});
