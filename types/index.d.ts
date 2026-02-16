/**
 * TypeScript definitions for Shiny Secrets
 */

/**
 * Severity levels for detected secrets
 */
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Secret pattern definition
 */
export interface Pattern {
    /** Human-readable pattern name */
    name: string;
    /** Regular expression for detection */
    regex: RegExp;
    /** Description of what this pattern detects */
    description: string;
    /** Severity level */
    severity: Severity;
}

/**
 * Collection of all detection patterns
 */
export interface Patterns {
    [key: string]: Pattern;
}

/**
 * A detected secret or credential
 */
export interface Finding {
    /** Type of secret detected */
    type: string;
    /** Line number where secret was found */
    line: number;
    /** Column number (1-indexed) */
    column?: number;
    /** The matched secret value */
    match: string;
    /** Full line of code containing the secret */
    content: string;
    /** Description of the finding */
    description: string;
    /** Severity level */
    severity: Severity;
    /** File path where secret was found */
    file: string;
    /** Entropy value (for entropy-based findings) */
    entropy?: string;
}

/**
 * Configuration for entropy detection
 */
export interface EntropyConfig {
    /** Enable entropy detection */
    enabled: boolean;
    /** Minimum entropy threshold (bits) */
    threshold: number;
    /** Minimum token length for analysis */
    minLength: number;
    /** Maximum token length for analysis */
    maxLength: number;
}

/**
 * Scanner configuration
 */
export interface ScanConfig {
    /** Exit code behavior */
    failOn: 'critical' | 'high' | 'any' | 'never';
    /** Minimum severity to report */
    reportThreshold: 'critical' | 'high' | 'medium';
    /** Entropy detection config */
    entropy: EntropyConfig;
    /** File patterns to exclude */
    exclude: string[];
    /** File patterns to include */
    include: string[];
    /** Allowlisted findings */
    allowlist: string[];
    /** Allowlisted string patterns */
    allowPatterns: string[];
    /** Disabled detection patterns */
    disabledPatterns: string[];
}

/**
 * Scanning options
 */
export interface ScanOptions {
    /** Target filename */
    filename?: string;
    /** Enable entropy detection */
    enableEntropy?: boolean;
    /** Disabled pattern keys */
    disabledPatterns?: string[];
    /** Maximum regex iterations per line */
    maxIterations?: number;
    /** Minimum entropy threshold */
    threshold?: number;
    /** Minimum token length */
    minLength?: number;
    /** Maximum token length */
    maxLength?: number;
    /** Allow patterns (skip detection) */
    allowPatterns?: string[];
}

/**
 * CLI output options
 */
export interface OutputOptions {
    /** Show verbose output */
    verbose?: boolean;
    /** Output as JSON */
    json?: boolean;
    /** Output as SARIF */
    sarif?: boolean;
    /** Configuration object */
    config?: ScanConfig;
}

/**
 * File read options
 */
export interface ReadOptions {
    /** Maximum file size in bytes */
    maxSize?: number;
}

/**
 * SARIF report format
 */
export interface SARIFReport {
    version: string;
    $schema: string;
    runs: SARIFRun[];
}

export interface SARIFRun {
    tool: {
        driver: {
            name: string;
            version: string;
            informationUri: string;
            rules: SARIFRule[];
        };
    };
    results: SARIFResult[];
}

export interface SARIFRule {
    id: string;
    name: string;
    shortDescription: { text: string };
    fullDescription: { text: string };
    defaultConfiguration: {
        level: 'error' | 'warning' | 'note';
    };
    properties: {
        tags: string[];
        precision: string;
    };
}

export interface SARIFResult {
    ruleId: string;
    level: 'error' | 'warning' | 'note';
    message: { text: string };
    locations: Array<{
        physicalLocation: {
            artifactLocation: {
                uri: string;
                uriBaseId: string;
            };
            region: {
                startLine: number;
                startColumn: number;
                snippet: { text: string };
            };
        };
    }>;
}

/**
 * Core module exports
 */
declare module 'shiny-secrets/lib/core' {
    /**
     * Calculate Shannon entropy for a string
     */
    export function calculateEntropy(str: string): number;

    /**
     * Detect high entropy strings in a line of code
     */
    export function detectHighEntropy(
        line: string,
        lineNumber: number,
        options?: Partial<ScanOptions>
    ): Finding[];

    /**
     * Scan content using regex patterns
     */
    export function scanPatterns(
        content: string,
        options?: Partial<ScanOptions>
    ): Finding[];

    /**
     * Scan content using entropy detection
     */
    export function scanEntropy(
        content: string,
        options?: Partial<ScanOptions>
    ): Finding[];

    /**
     * Full content scan with all detection methods
     */
    export function scanContent(
        content: string,
        options?: Partial<ScanOptions>
    ): Finding[];

    /**
     * Remove duplicate findings
     */
    export function deduplicateFindings(findings: Finding[]): Finding[];

    /**
     * Sort findings by file and line
     */
    export function sortFindings(findings: Finding[]): Finding[];

    /**
     * Check if path matches glob pattern
     */
    export function matchesGlob(filePath: string, pattern: string): boolean;

    /**
     * Check if file should be scanned
     */
    export function shouldScanFile(
        filePath: string,
        config: Partial<ScanConfig>
    ): boolean;

    /**
     * Read file with streaming for large files
     */
    export function readFileOptimized(
        filePath: string,
        options?: ReadOptions
    ): Promise<string>;

    /**
     * Detection patterns
     */
    export const patterns: Patterns;
}

/**
 * Scanner module exports
 */
declare module 'shiny-secrets' {
    /**
     * Scan content for secrets
     */
    export function scanContent(
        content: string,
        filename?: string
    ): Finding[];

    /**
     * Detection patterns
     */
    export const patterns: Patterns;

    /**
     * Calculate entropy
     */
    export function calculateEntropy(str: string): number;
}

/**
 * Scanner v2 module exports
 */
declare module 'shiny-secrets-v2' {
    /**
     * Scan content with configuration
     */
    export function scanContent(
        content: string,
        filename: string,
        config: Partial<ScanConfig>
    ): Finding[];

    /**
     * Scan directory recursively
     */
    export function scanDirectory(
        dirPath: string,
        config: Partial<ScanConfig>,
        results?: Finding[]
    ): Finding[];

    /**
     * Load configuration from file
     */
    export function loadConfig(configPath?: string | null): ScanConfig;

    /**
     * Generate SARIF report
     */
    export function generateSARIF(
        findings: Finding[],
        config: Partial<ScanConfig>
    ): SARIFReport;

    /**
     * Detection patterns
     */
    export const patterns: Patterns;

    /**
     * Calculate entropy
     */
    export function calculateEntropy(str: string): number;

    /**
     * Scanner version
     */
    export const VERSION: string;
}
