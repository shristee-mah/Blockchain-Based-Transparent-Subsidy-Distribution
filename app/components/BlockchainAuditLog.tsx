'use client';

import React, { useState, useEffect } from 'react';
import { getBlockchainConnection } from '../lib/blockchain';

interface Transaction {
    itemId: string;
    actor: string;
    action: string;
    blockNumber: number;
    transactionHash: string;
    timestamp: string;
    beneficiary?: string;
    currentStage?: number;
    claimed?: boolean;
}

interface WalletConnection {
    address: string;
    connected: boolean;
}

const BlockchainAuditLog: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [walletConnection, setWalletConnection] = useState<WalletConnection>({
        address: '',
        connected: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

    // Format address for display
    const formatAddress = (address: string): string => {
        if (!address) return 'N/A';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    // Format transaction hash for display
    const formatTxHash = (hash: string): string => {
        if (!hash) return 'N/A';
        return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
    };

    // Get action display name
    const getActionDisplayName = (action: string): string => {
        const actionMap: { [key: string]: string } = {
            'CREATE_ITEM': 'Create Item',
            'ADMIN_VERIFY': 'Admin Verify',
            'TRANSPORTER_SUBMIT': 'Transporter Submit',
            'DISTRIBUTOR_SUBMIT': 'Distributor Submit',
            'BENEFICIARY_CLAIM': 'Beneficiary Claim',
            'CANCEL_ITEM': 'Cancel Item'
        };
        return actionMap[action] || action;
    };

    // Get stage display name
    const getStageDisplayName = (stage?: number): string => {
        if (stage === undefined) return 'N/A';
        const stages = [
            'Created', 'Verified', 'Transport Ready', 'In Transit',
            'Distributor Ready', 'Distributed', 'Claimed', 'Cancelled'
        ];
        return stages[stage] || `Stage ${stage}`;
    };

    // Connect to wallet
    const connectWallet = async () => {
        setLoading(true);
        setError(null);

        try {
            const blockchain = getBlockchainConnection(contractAddress);
            const result = await blockchain.connect();
            
            setWalletConnection({
                address: result.address,
                connected: result.success
            });

            // Start listening to events
            if (!isListening) {
                await listenToEvents(blockchain);
            }

        } catch (error: any) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Disconnect wallet
    const disconnectWallet = async () => {
        try {
            const blockchain = getBlockchainConnection(contractAddress);
            blockchain.stopListening();
            blockchain.disconnect();
            
            setWalletConnection({ address: '', connected: false });
            setIsListening(false);

        } catch (error: any) {
            setError(error.message);
        }
    };

    // Listen to blockchain events
    const listenToEvents = async (blockchain: any) => {
        try {
            setIsListening(true);
            
            await blockchain.listenToTransactionLogs(
                (itemId: string, actor: string, action: string, event: any) => {
                    console.log('New transaction event:', { itemId, actor, action });
                    
                    // Add new transaction to the list
                    const newTransaction: Transaction = {
                        itemId,
                        actor,
                        action,
                        blockNumber: event.blockNumber,
                        transactionHash: event.transactionHash,
                        timestamp: new Date().toISOString()
                    };

                    setTransactions(prev => [newTransaction, ...prev.slice(0, 9)]); // Keep last 10
                }
            );

        } catch (error: any) {
            setError(`Failed to listen to events: ${error.message}`);
            setIsListening(false);
        }
    };

    // Fetch recent transactions
    const fetchRecentTransactions = async () => {
        if (!walletConnection.connected) {
            setError('Please connect your wallet first');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const blockchain = getBlockchainConnection(contractAddress);
            const recentTxs = await blockchain.getRecentTransactions(10);
            
            setTransactions(recentTxs);
            setLastRefresh(new Date());

        } catch (error: any) {
            setError(`Failed to fetch transactions: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Fetch transactions from backend API (alternative method)
    const fetchTransactionsFromAPI = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/blockchain/sync?action=recent_transactions&limit=10');
            const data = await response.json();

            if (data.success) {
                setTransactions(data.data);
                setLastRefresh(new Date());
            } else {
                setError(data.message);
            }

        } catch (error: any) {
            setError(`Failed to fetch from API: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Auto-connect if wallet is already connected
    useEffect(() => {
        const checkConnection = async () => {
            if (window.ethereum && window.ethereum.selectedAddress) {
                await connectWallet();
            }
        };
        checkConnection();
    }, []);

    // Auto-refresh transactions every 30 seconds
    useEffect(() => {
        if (walletConnection.connected) {
            const interval = setInterval(() => {
                fetchTransactionsFromAPI();
            }, 30000);

            return () => clearInterval(interval);
        }
    }, [walletConnection.connected]);

    return (
        <div style={{ 
            padding: '20px', 
            maxWidth: '1200px', 
            margin: '0 auto',
            fontFamily: 'Arial, sans-serif'
        }}>
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
            }}>
                <h2 style={{ margin: 0, color: '#333' }}>Blockchain Audit Log</h2>
                
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {walletConnection.connected ? (
                        <>
                            <div style={{ 
                                padding: '8px 12px', 
                                backgroundColor: '#d4edda', 
                                color: '#155724',
                                borderRadius: '4px',
                                fontSize: '14px',
                                border: '1px solid #c3e6cb'
                            }}>
                                {formatAddress(walletConnection.address)}
                            </div>
                            <button
                                onClick={disconnectWallet}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Disconnect
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={connectWallet}
                            disabled={loading}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.6 : 1
                            }}
                        >
                            {loading ? 'Connecting...' : 'Connect Wallet'}
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div style={{
                    padding: '12px',
                    backgroundColor: '#f8d7da',
                    color: '#721c24',
                    border: '1px solid #f5c6cb',
                    borderRadius: '4px',
                    marginBottom: '20px'
                }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '15px'
            }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={fetchRecentTransactions}
                        disabled={loading || !walletConnection.connected}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: (loading || !walletConnection.connected) ? 'not-allowed' : 'pointer',
                            opacity: (loading || !walletConnection.connected) ? 0.6 : 1
                        }}
                    >
                        {loading ? 'Loading...' : 'Refresh from Blockchain'}
                    </button>
                    
                    <button
                        onClick={fetchTransactionsFromAPI}
                        disabled={loading}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#17a2b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1
                        }}
                    >
                        {loading ? 'Loading...' : 'Refresh from API'}
                    </button>
                </div>

                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                    {isListening && (
                        <span style={{ color: '#28a745', marginRight: '10px' }}>
                            ● Live Listening
                        </span>
                    )}
                    {lastRefresh && (
                        <span>Last refresh: {lastRefresh.toLocaleTimeString()}</span>
                    )}
                </div>
            </div>

            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #dee2e6',
                overflow: 'hidden'
            }}>
                <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '12px',
                    borderBottom: '1px solid #dee2e6',
                    fontWeight: 'bold',
                    color: '#495057'
                }}>
                    Last 10 Transactions
                </div>

                {transactions.length === 0 ? (
                    <div style={{
                        padding: '40px',
                        textAlign: 'center',
                        color: '#6c757d'
                    }}>
                        {walletConnection.connected 
                            ? 'No transactions found. Try refreshing or wait for new transactions.' 
                            : 'Connect your wallet to view blockchain transactions.'}
                    </div>
                ) : (
                    <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {transactions.map((tx, index) => (
                            <div
                                key={`${tx.transactionHash}-${index}`}
                                style={{
                                    padding: '15px',
                                    borderBottom: index < transactions.length - 1 ? '1px solid #e9ecef' : 'none',
                                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '10px',
                                            marginBottom: '8px'
                                        }}>
                                            <strong style={{ color: '#333' }}>
                                                {getActionDisplayName(tx.action)}
                                            </strong>
                                            <span style={{
                                                padding: '2px 8px',
                                                backgroundColor: '#e9ecef',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                color: '#495057'
                                            }}>
                                                Block #{tx.blockNumber}
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '5px' }}>
                                            <strong>Item ID:</strong> 
                                            <span style={{ 
                                                fontFamily: 'monospace', 
                                                marginLeft: '5px',
                                                backgroundColor: '#f1f3f4',
                                                padding: '2px 6px',
                                                borderRadius: '3px'
                                            }}>
                                                {tx.itemId}
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '5px' }}>
                                            <strong>Actor:</strong> 
                                            <span style={{ marginLeft: '5px' }}>
                                                {formatAddress(tx.actor)}
                                            </span>
                                        </div>

                                        {tx.beneficiary && (
                                            <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '5px' }}>
                                                <strong>Beneficiary:</strong> 
                                                <span style={{ marginLeft: '5px' }}>
                                                    {formatAddress(tx.beneficiary)}
                                                </span>
                                            </div>
                                        )}

                                        {tx.currentStage !== undefined && (
                                            <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '5px' }}>
                                                <strong>Stage:</strong> 
                                                <span style={{ marginLeft: '5px' }}>
                                                    {getStageDisplayName(tx.currentStage)}
                                                </span>
                                                {tx.claimed && (
                                                    <span style={{ 
                                                        marginLeft: '10px',
                                                        padding: '2px 8px',
                                                        backgroundColor: '#d4edda',
                                                        color: '#155724',
                                                        borderRadius: '12px',
                                                        fontSize: '12px'
                                                    }}>
                                                        Claimed
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <div style={{ fontSize: '14px', color: '#6c757d' }}>
                                            <strong>Transaction:</strong> 
                                            <a
                                                href={`https://etherscan.io/tx/${tx.transactionHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    marginLeft: '5px',
                                                    color: '#007bff',
                                                    textDecoration: 'none'
                                                }}
                                            >
                                                {formatTxHash(tx.transactionHash)}
                                            </a>
                                        </div>
                                    </div>

                                    <div style={{ 
                                        fontSize: '12px', 
                                        color: '#6c757d',
                                        textAlign: 'right',
                                        minWidth: '120px'
                                    }}>
                                        {new Date(tx.timestamp).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BlockchainAuditLog;
