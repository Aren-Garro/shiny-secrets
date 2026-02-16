(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./core'));
    } else {
        root.ShinySecretsBrowserScanner = factory(root.ShinySecretsCore);
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (core) {
    if (!core) {
        throw new Error('ShinySecretsCore is required before loading browser scanner helpers.');
    }

    function scanInput(content, options = {}) {
        return core.scanContent(content, {
            filename: options.filename || 'browser-input',
            enableEntropy: options.enableEntropy !== false,
            allowPatterns: options.allowPatterns || ['example', 'test', 'demo']
        }).map(({ file, ...finding }) => finding);
    }

    return {
        scanInput,
        patterns: core.patterns
    };
}));
