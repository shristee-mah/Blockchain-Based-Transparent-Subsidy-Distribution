import { ethers } from 'ethers';

// Error types for better categorization
export enum ErrorType {
    BLOCKCHAIN_ERROR = 'BLOCKCHAIN_ERROR',
    DATABASE_ERROR = 'DATABASE_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    CONFLICT_ERROR = 'CONFLICT_ERROR',
    AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
    TRANSACTION_ERROR = 'TRANSACTION_ERROR'
}

// Error severity levels
export enum ErrorSeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

// Standardized error structure
export interface StandardError {
    type: ErrorType;
    severity: ErrorSeverity;
    code: string;
    message: string;
    details?: any;
    timestamp: Date;
    context?: {
        userId?: string;
        transactionId?: string;
        itemId?: string;
        action?: string;
    };
    recoverable: boolean;
    suggestions?: string[];
}

// Conflict resolution strategies
export enum ConflictResolutionStrategy {
    BLOCKCHAIN_WINS = 'BLOCKCHAIN_WINS', // Blockchain is SSoT
    DATABASE_WINS = 'DATABASE_WINS', // For manual override scenarios
    MANUAL_REVIEW = 'MANUAL_REVIEW', // Requires human intervention
    MERGE = 'MERGE', // Attempt to merge data
    TIMESTAMP_WINS = 'TIMESTAMP_WINS' // Use most recent timestamp
}

// Conflict detection result
export interface ConflictResult {
    hasConflict: boolean;
    conflicts: ConflictDetail[];
    recommendedStrategy: ConflictResolutionStrategy;
    severity: ErrorSeverity;
}

// Individual conflict detail
export interface ConflictDetail {
    field: string;
    backendValue: any;
    blockchainValue: any;
    type: 'VALUE_MISMATCH' | 'MISSING_IN_BACKEND' | 'MISSING_IN_BLOCKCHAIN' | 'TYPE_MISMATCH';
    impact: 'LOW' | 'MEDIUM' | 'HIGH';
}

// Error handling utility class
export class ErrorHandler {
    private static instance: ErrorHandler;
    private errorLog: StandardError[] = [];
    private maxLogSize = 1000;

    private constructor() {}

    static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    // Log and categorize blockchain errors
    handleBlockchainError(error: any, context?: any): StandardError {
        let standardError: StandardError;

        if (error.code) {
            standardError = this.handleEthersError(error, context);
        } else if (error.message) {
            standardError = this.handleGenericError(error, ErrorType.BLOCKCHAIN_ERROR, context);
        } else {
            standardError = this.createStandardError(
                ErrorType.BLOCKCHAIN_ERROR,
                ErrorSeverity.HIGH,
                'UNKNOWN_BLOCKCHAIN_ERROR',
                'Unknown blockchain error occurred',
                { originalError: error },
                context
            );
        }

        this.logError(standardError);
        return standardError;
    }

    // Handle ethers.js specific errors
    private handleEthersError(error: any, context?: any): StandardError {
        const errorCode = `ETH_${error.code}`;
        let severity = ErrorSeverity.MEDIUM;
        let message = error.message;
        let recoverable = true;
        let suggestions: string[] = [];

        switch (error.code) {
            case 4001: // USER_REJECTED
                severity = ErrorSeverity.LOW;
                message = 'Transaction rejected by user';
                suggestions = ['Try again if this was accidental', 'Check if you want to proceed with this transaction'];
                break;
            case 4100: // UNAUTHORIZED
                severity = ErrorSeverity.HIGH;
                message = 'Unauthorized to perform this action';
                suggestions = ['Check your wallet permissions', 'Ensure you have the correct role'];
                recoverable = false;
                break;
            case -32603: // INTERNAL_ERROR
                severity = ErrorSeverity.HIGH;
                message = 'Internal JSON-RPC error';
                suggestions = ['Check network connection', 'Try again later', 'Contact support if persists'];
                break;
            case -32000: // INVALID_INPUT
                severity = ErrorSeverity.MEDIUM;
                message = 'Invalid input provided';
                suggestions = ['Check all input parameters', 'Verify data formats'];
                break;
            case -32002: // RESOURCE_UNAVAILABLE
                severity = ErrorSeverity.MEDIUM;
                message = 'Resource unavailable';
                suggestions = ['Try again later', 'Check network status'];
                break;
            case -32003: // TRANSACTION_REJECTED
                severity = ErrorSeverity.MEDIUM;
                message = 'Transaction rejected by network';
                suggestions = ['Check gas settings', 'Try with higher gas limit', 'Check network congestion'];
                break;
            default:
                severity = ErrorSeverity.MEDIUM;
                suggestions = ['Check transaction details', 'Try again'];
        }

        return this.createStandardError(
            ErrorType.BLOCKCHAIN_ERROR,
            severity,
            errorCode,
            message,
            { originalError: error },
            context,
            recoverable,
            suggestions
        );
    }

    // Handle generic errors
    private handleGenericError(error: any, type: ErrorType, context?: any): StandardError {
        let severity = ErrorSeverity.MEDIUM;
        let message = error.message;

        if (error.message.includes('revert')) {
            severity = ErrorSeverity.HIGH;
            message = `Contract execution failed: ${error.reason || error.message}`;
        } else if (error.message.includes('insufficient funds')) {
            severity = ErrorSeverity.HIGH;
            message = 'Insufficient funds for transaction';
        } else if (error.message.includes('gas')) {
            severity = ErrorSeverity.MEDIUM;
            message = 'Gas estimation failed';
        }

        return this.createStandardError(
            type,
            severity,
            'GENERIC_ERROR',
            message,
            { originalError: error },
            context
        );
    }

    // Create standardized error
    private createStandardError(
        type: ErrorType,
        severity: ErrorSeverity,
        code: string,
        message: string,
        details?: any,
        context?: any,
        recoverable: boolean = true,
        suggestions?: string[]
    ): StandardError {
        return {
            type,
            severity,
            code,
            message,
            details,
            timestamp: new Date(),
            context,
            recoverable,
            suggestions
        };
    }

    // Log error
    private logError(error: StandardError): void {
        this.errorLog.push(error);
        
        // Keep log size manageable
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog = this.errorLog.slice(-this.maxLogSize);
        }

        // Console logging for development
        console.error(`[${error.severity}] ${error.type}: ${error.message}`, error);
    }

    // Get recent errors
    getRecentErrors(limit: number = 50): StandardError[] {
        return this.errorLog.slice(-limit);
    }

    // Get errors by type
    getErrorsByType(type: ErrorType): StandardError[] {
        return this.errorLog.filter(error => error.type === type);
    }

    // Get errors by severity
    getErrorsBySeverity(severity: ErrorSeverity): StandardError[] {
        return this.errorLog.filter(error => error.severity === severity);
    }
}

// Conflict resolution utility class
export class ConflictResolver {
    private static instance: ConflictResolver;

    private constructor() {}

    static getInstance(): ConflictResolver {
        if (!ConflictResolver.instance) {
            ConflictResolver.instance = new ConflictResolver();
        }
        return ConflictResolver.instance;
    }

    // Detect conflicts between backend and blockchain data
    detectConflicts(backendData: any, blockchainData: any): ConflictResult {
        const conflicts: ConflictDetail[] = [];

        // Check for missing data
        if (!backendData && blockchainData) {
            conflicts.push({
                field: 'entire_record',
                backendValue: null,
                blockchainValue: blockchainData,
                type: 'MISSING_IN_BACKEND',
                impact: 'HIGH'
            });
        } else if (backendData && !blockchainData) {
            conflicts.push({
                field: 'entire_record',
                backendValue: backendData,
                blockchainValue: null,
                type: 'MISSING_IN_BLOCKCHAIN',
                impact: 'HIGH'
            });
        } else if (backendData && blockchainData) {
            // Check individual fields
            this.compareFields(backendData, blockchainData, conflicts);
        }

        const hasConflict = conflicts.length > 0;
        const severity = this.calculateConflictSeverity(conflicts);
        const recommendedStrategy = this.recommendResolutionStrategy(conflicts, severity);

        return {
            hasConflict,
            conflicts,
            recommendedStrategy,
            severity
        };
    }

    // Compare individual fields for conflicts
    private compareFields(backend: any, blockchain: any, conflicts: ConflictDetail[]): void {
        const fieldsToCheck = [
            'current_stage',
            'claimed',
            'current_ipfs_hash',
            'beneficiary_address',
            'claimed_by',
            'claimed_at'
        ];

        for (const field of fieldsToCheck) {
            const backendValue = backend[field];
            const blockchainValue = blockchain[field];

            if (backendValue !== blockchainValue) {
                conflicts.push({
                    field,
                    backendValue,
                    blockchainValue,
                    type: 'VALUE_MISMATCH',
                    impact: this.getFieldImpact(field)
                });
            }
        }
    }

    // Determine impact level of field conflict
    private getFieldImpact(field: string): 'LOW' | 'MEDIUM' | 'HIGH' {
        const highImpactFields = ['current_stage', 'claimed', 'beneficiary_address'];
        const mediumImpactFields = ['claimed_by', 'claimed_at'];
        
        if (highImpactFields.includes(field)) return 'HIGH';
        if (mediumImpactFields.includes(field)) return 'MEDIUM';
        return 'LOW';
    }

    // Calculate overall conflict severity
    private calculateConflictSeverity(conflicts: ConflictDetail[]): ErrorSeverity {
        if (conflicts.length === 0) return ErrorSeverity.LOW;

        const highImpactCount = conflicts.filter(c => c.impact === 'HIGH').length;
        const mediumImpactCount = conflicts.filter(c => c.impact === 'MEDIUM').length;

        if (highImpactCount > 0) return ErrorSeverity.HIGH;
        if (mediumImpactCount > 2) return ErrorSeverity.HIGH;
        if (mediumImpactCount > 0) return ErrorSeverity.MEDIUM;
        return ErrorSeverity.LOW;
    }

    // Recommend resolution strategy based on conflicts
    private recommendResolutionStrategy(
        conflicts: ConflictDetail[], 
        severity: ErrorSeverity
    ): ConflictResolutionStrategy {
        // If any data is missing in blockchain, it's critical
        const missingInBlockchain = conflicts.some(c => c.type === 'MISSING_IN_BLOCKCHAIN');
        if (missingInBlockchain) {
            return ConflictResolutionStrategy.MANUAL_REVIEW;
        }

        // If only missing in backend, blockchain wins
        const missingInBackend = conflicts.some(c => c.type === 'MISSING_IN_BACKEND');
        if (missingInBackend) {
            return ConflictResolutionStrategy.BLOCKCHAIN_WINS;
        }

        // For high severity conflicts, require manual review
        if (severity === ErrorSeverity.HIGH) {
            return ConflictResolutionStrategy.MANUAL_REVIEW;
        }

        // For medium severity, blockchain usually wins (SSoT principle)
        if (severity === ErrorSeverity.MEDIUM) {
            return ConflictResolutionStrategy.BLOCKCHAIN_WINS;
        }

        // For low severity, blockchain wins
        return ConflictResolutionStrategy.BLOCKCHAIN_WINS;
    }

    // Apply conflict resolution
    async resolveConflict(
        backendData: any,
        blockchainData: any,
        strategy: ConflictResolutionStrategy,
        context?: any
    ): Promise<{ success: boolean; resolvedData?: any; message: string }> {
        try {
            switch (strategy) {
                case ConflictResolutionStrategy.BLOCKCHAIN_WINS:
                    return {
                        success: true,
                        resolvedData: blockchainData,
                        message: 'Conflict resolved using blockchain data (Single Source of Truth)'
                    };

                case ConflictResolutionStrategy.DATABASE_WINS:
                    return {
                        success: true,
                        resolvedData: backendData,
                        message: 'Conflict resolved using database data (manual override)'
                    };

                case ConflictResolutionStrategy.MANUAL_REVIEW:
                    return {
                        success: false,
                        message: 'Conflict requires manual review. Please check the conflict resolution log.'
                    };

                case ConflictResolutionStrategy.MERGE:
                    return this.attemptMerge(backendData, blockchainData);

                case ConflictResolutionStrategy.TIMESTAMP_WINS:
                    return this.resolveByTimestamp(backendData, blockchainData);

                default:
                    return {
                        success: false,
                        message: 'Unknown conflict resolution strategy'
                    };
            }
        } catch (error: any) {
            const errorHandler = ErrorHandler.getInstance();
            errorHandler.handleBlockchainError(error, context);
            
            return {
                success: false,
                message: `Failed to resolve conflict: ${error.message}`
            };
        }
    }

    // Attempt to merge conflicting data
    private async attemptMerge(backendData: any, blockchainData: any): Promise<any> {
        // Simple merge strategy - prioritize blockchain for critical fields
        const criticalFields = ['current_stage', 'claimed', 'beneficiary_address'];
        const merged = { ...backendData };

        for (const field of criticalFields) {
            if (blockchainData[field] !== undefined) {
                merged[field] = blockchainData[field];
            }
        }

        return {
            success: true,
            resolvedData: merged,
            message: 'Conflict resolved by merging data (blockchain prioritized for critical fields)'
        };
    }

    // Resolve conflict by timestamp
    private async resolveByTimestamp(backendData: any, blockchainData: any): Promise<any> {
        const backendTime = new Date(backendData.updated_at || 0);
        const blockchainTime = new Date(); // Blockchain timestamp would come from block timestamp

        const resolvedData = blockchainTime > backendTime ? blockchainData : backendData;
        const source = blockchainTime > backendTime ? 'blockchain' : 'database';

        return {
            success: true,
            resolvedData,
            message: `Conflict resolved using most recent data (${source})`
        };
    }
}

// Transaction status monitoring
export class TransactionMonitor {
    private static instance: TransactionMonitor;
    private pendingTransactions: Map<string, {
        hash: string;
        startTime: Date;
        timeout: number;
        callback?: (receipt: any) => void;
        errorCallback?: (error: any) => void;
    }> = new Map();

    private constructor() {}

    static getInstance(): TransactionMonitor {
        if (!TransactionMonitor.instance) {
            TransactionMonitor.instance = new TransactionMonitor();
        }
        return TransactionMonitor.instance;
    }

    // Monitor transaction with timeout
    async monitorTransaction(
        provider: ethers.JsonRpcProvider,
        txHash: string,
        timeout: number = 30000, // 30 seconds default
        callback?: (receipt: any) => void,
        errorCallback?: (error: any) => void
    ): Promise<ethers.TransactionReceipt> {
        return new Promise(async (resolve, reject) => {
            const startTime = new Date();
            
            // Store transaction info
            this.pendingTransactions.set(txHash, {
                hash: txHash,
                startTime,
                timeout,
                callback,
                errorCallback
            });

            try {
                // Wait for transaction
                const receipt = await provider.waitForTransaction(txHash, 1, timeout);

                if (!receipt) {
                    throw new Error('Transaction receipt is null');
                }

                // Clean up
                this.pendingTransactions.delete(txHash);

                // Call callback if provided
                if (callback) {
                    callback(receipt);
                }

                resolve(receipt);

            } catch (error: any) {
                // Clean up
                this.pendingTransactions.delete(txHash);

                // Call error callback if provided
                if (errorCallback) {
                    errorCallback(error);
                }

                // Handle specific errors
                const errorHandler = ErrorHandler.getInstance();
                const standardError = errorHandler.handleBlockchainError(error, {
                    transactionHash: txHash,
                    action: 'TRANSACTION_MONITOR'
                });

                reject(standardError);
            }
        });
    }

    // Get pending transactions
    getPendingTransactions(): Array<{
        hash: string;
        startTime: Date;
        duration: number;
    }> {
        const now = new Date();
        return Array.from(this.pendingTransactions.entries()).map(([hash, info]) => ({
            hash,
            startTime: info.startTime,
            duration: now.getTime() - info.startTime.getTime()
        }));
    }

    // Cancel transaction monitoring
    cancelMonitoring(txHash: string): boolean {
        return this.pendingTransactions.delete(txHash);
    }
}

// Export singleton instances
export const errorHandler = ErrorHandler.getInstance();
export const conflictResolver = ConflictResolver.getInstance();
export const transactionMonitor = TransactionMonitor.getInstance();
