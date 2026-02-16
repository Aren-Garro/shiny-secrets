const { scanPatterns } = require('../lib/core');

describe('Security regressions', () => {
    test('prevents runaway matching with extremely long api key strings', () => {
        const malicious = 'api_key="' + 'a'.repeat(10000) + '"';
        const start = Date.now();
        const findings = scanPatterns(malicious, { filename: 'malicious.txt' });
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(1000);
        expect(findings.length).toBe(0);
    });

    test('maxIterations is bounded and validated', () => {
        expect(() => scanPatterns('token="abc"', { maxIterations: Infinity })).not.toThrow();
        expect(() => scanPatterns('token="abc"', { maxIterations: -100 })).not.toThrow();
        expect(() => scanPatterns('token="abc"', { maxIterations: 999999 })).not.toThrow();
        expect(() => scanPatterns('token="abc"', { maxIterations: '5000' })).not.toThrow();
    });

    test('bounded patterns avoid matching over-long values', () => {
        const tooLongBearer = 'Authorization: Bearer ' + 'a'.repeat(101);
        const findings = scanPatterns(tooLongBearer);
        expect(findings.some(f => f.type === 'Bearer Token')).toBe(false);
    });
});
