module.exports = {
    env: {
        node: true,
        es2021: true
    },
    extends: 'eslint:recommended',
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module'
    },
    rules: {
        // Allow console.log for CLI tools
        'no-console': 'off',
        
        // Warn on unused variables, but allow _ prefix
        'no-unused-vars': ['warn', { 
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_'
        }],
        
        // Code quality
        'no-var': 'error',
        'prefer-const': 'warn',
        'prefer-arrow-callback': 'warn',
        'no-throw-literal': 'error',
        
        // Best practices
        'eqeqeq': ['error', 'always'],
        'curly': ['error', 'all'],
        'no-eval': 'error',
        'no-implied-eval': 'error',
        
        // Potential bugs
        'no-await-in-loop': 'warn',
        'no-constant-condition': ['error', { checkLoops: false }],
        'require-atomic-updates': 'error'
    },
    ignorePatterns: [
        'node_modules/',
        'dist/',
        '*.min.js'
    ]
};
