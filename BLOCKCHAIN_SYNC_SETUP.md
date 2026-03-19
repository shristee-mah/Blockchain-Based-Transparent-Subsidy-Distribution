# Blockchain-Based Transparent Subsidy Distribution System

## Overview

This system implements a complete synchronization between Frontend (React/Next.js), Backend (Node.js/Express), and Blockchain (Hardhat/Solidity) with the blockchain as the Single Source of Truth (SSoT).

## Architecture

### Smart Contract Layer
- **Unique Item IDs**: Generated using `keccak256(abi.encodePacked(block.timestamp, msg.sender, counter))`
- **TransactionLogged Events**: Emitted for every state change with itemId, actor, and action
- **SSoT Principle**: Blockchain data always overrides backend conflicts

### Frontend-Blockchain Connection
- **ethers.js v6**: Modern Web3 library for blockchain interaction
- **MetaMask Integration**: Wallet connection and transaction signing
- **Real-time Updates**: Event listeners for live transaction monitoring
- **Error Handling**: Comprehensive error management for user interactions

### Backend-Blockchain Synchronization
- **Event Listener**: Continuously monitors TransactionLogged events
- **Database Sync**: Updates backend database with blockchain state
- **Conflict Resolution**: Automatic resolution with blockchain as authority
- **API Endpoints**: RESTful APIs for data synchronization

## Setup Instructions

### 1. Prerequisites

```bash
# Install Node.js dependencies
npm install

# Install Hardhat globally
npm install -g hardhat

# Start local Hardhat node
npx hardhat node
```

### 2. Smart Contract Deployment

```bash
# Deploy the smart contract
npx hardhat run scripts/deploy.js --network localhost

# Note the contract address for environment variables
```

### 3. Database Setup

```bash
# Create database and run schema
mysql -u root -p < scripts/database_schema.sql
```

### 4. Environment Variables

Create `.env.local` file:

```env
# Blockchain Configuration
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=subsidy_system

# Private Keys for Backend Operations
ADMIN_PRIVATE_KEY=your_admin_private_key
TRANSPORTER_PRIVATE_KEY=your_transporter_private_key
DISTRIBUTOR_PRIVATE_KEY=your_distributor_private_key
```

### 5. Start Backend Services

```bash
# Start the blockchain event listener
node scripts/blockchain_event_listener.js

# Start the Next.js application
npm run dev
```

## Key Components

### Smart Contract Features

1. **Item ID Generation**:
   ```solidity
   bytes32 uniqueItemId = keccak256(abi.encodePacked(block.timestamp, msg.sender, itemCount));
   ```

2. **TransactionLogged Events**:
   ```solidity
   event TransactionLogged(bytes32 indexed itemId, address indexed actor, string action);
   ```

3. **All State Changes Emit Events**:
   - CREATE_ITEM
   - ADMIN_VERIFY
   - TRANSPORTER_SUBMIT
   - DISTRIBUTOR_SUBMIT
   - BENEFICIARY_CLAIM
   - CANCEL_ITEM

### Frontend Components

1. **Blockchain Connection** (`app/lib/blockchain.ts`):
   - MetaMask wallet integration
   - Transaction signing and monitoring
   - Event listeners for real-time updates

2. **Blockchain Audit Log** (`app/components/BlockchainAuditLog.tsx`):
   - Displays last 10 transactions
   - Shows hexadecimal Item IDs and block numbers
   - Real-time transaction monitoring

3. **Error Handling** (`app/lib/errorHandling.ts`):
   - Comprehensive error categorization
   - User-friendly error messages
   - Transaction monitoring with timeouts

### Backend Components

1. **Event Listener** (`scripts/blockchain_event_listener.js`):
   - Monitors TransactionLogged events
   - Updates database in real-time
   - Handles historical event processing

2. **Database Schema** (`scripts/database_schema.sql`):
   - Items table with blockchain synchronization
   - Transaction audit log
   - Conflict resolution tracking

3. **Sync API** (`app/api/blockchain/sync/route.ts`):
   - Manual synchronization endpoints
   - Data integrity validation
   - Conflict resolution

## API Endpoints

### Blockchain Synchronization

#### POST /api/blockchain/sync
```json
{
  "action": "sync_item",
  "itemId": "1"
}
```

#### GET /api/blockchain/sync
```
/api/blockchain/sync?action=recent_transactions&limit=10
/api/blockchain/sync?action=get_item&itemId=0x123...
/api/blockchain/sync?action=validate_integrity
```

## Frontend Usage Examples

### Connecting Wallet
```typescript
import { getBlockchainConnection } from '../lib/blockchain';

const blockchain = getBlockchainConnection(contractAddress);
const result = await blockchain.connect();
console.log('Connected:', result.address);
```

### Creating Item with Error Handling
```typescript
try {
  const tx = await blockchain.createItem(beneficiary, ipfsHash);
  const receipt = await blockchain.waitForTransaction(tx.hash);
  console.log('Transaction confirmed:', receipt.transactionHash);
} catch (error) {
  if (error.message.includes('User rejected')) {
    // Handle user rejection
  } else if (error.message.includes('Out of gas')) {
    // Handle gas issues
  }
}
```

### Real-time Transaction Monitoring
```typescript
await blockchain.listenToTransactionLogs(
  (itemId, actor, action, event) => {
    console.log('New transaction:', { itemId, actor, action });
    // Update UI with new transaction
  }
);
```

## Error Handling

### Error Categories
- **BLOCKCHAIN_ERROR**: Ethereum network and transaction errors
- **DATABASE_ERROR**: Database connection and query errors
- **NETWORK_ERROR**: Network connectivity issues
- **VALIDATION_ERROR**: Input validation failures
- **CONFLICT_ERROR**: Data synchronization conflicts
- **AUTHORIZATION_ERROR**: Permission and role errors

### Error Recovery
- Automatic retry for network issues
- User guidance for transaction failures
- Graceful degradation for service unavailability

## Conflict Resolution

### Strategies
1. **BLOCKCHAIN_WINS**: Default strategy (SSoT principle)
2. **DATABASE_WINS**: Manual override scenarios
3. **MANUAL_REVIEW**: High-severity conflicts
4. **MERGE**: Intelligent data merging
5. **TIMESTAMP_WINS**: Most recent data wins

### Implementation
```typescript
const conflictResult = conflictResolver.detectConflicts(backendData, blockchainData);
if (conflictResult.hasConflict) {
  const resolution = await conflictResolver.resolveConflict(
    backendData,
    blockchainData,
    conflictResult.recommendedStrategy
  );
}
```

## Security Considerations

### Smart Contract Security
- Access control with role-based permissions
- Input validation and sanitization
- Reentrancy protection
- Gas optimization

### Frontend Security
- MetaMask connection validation
- Transaction confirmation dialogs
- Error message sanitization
- Secure storage of sensitive data

### Backend Security
- Database connection encryption
- API key authentication
- Rate limiting
- Input validation

## Monitoring and Maintenance

### Health Checks
- Blockchain node connectivity
- Database connection status
- Event listener health
- API response times

### Logs and Metrics
- Transaction success rates
- Error frequency and types
- Conflict resolution statistics
- Performance metrics

## Troubleshooting

### Common Issues

1. **MetaMask Connection Issues**
   - Ensure MetaMask is installed and unlocked
   - Check network configuration (localhost:8545)
   - Verify contract address is correct

2. **Transaction Failures**
   - Check gas limit and price settings
   - Verify account has sufficient ETH
   - Check contract function permissions

3. **Database Sync Issues**
   - Verify database connection
   - Check event listener status
   - Review conflict resolution logs

4. **Performance Issues**
   - Monitor blockchain node performance
   - Check database query optimization
   - Review API response times

### Debug Tools
- Hardhat console for contract debugging
- Browser developer tools for frontend
- Database logs for backend issues
- Network monitoring tools

## Future Enhancements

### Scalability
- Layer 2 solutions for lower gas fees
- Database sharding for large datasets
- Caching strategies for improved performance

### Features
- Multi-signature transactions
- Advanced audit trails
- Automated conflict resolution
- Real-time notifications

### Integration
- External wallet providers
- Third-party audit services
- Analytics and reporting tools

## Support

For technical support and questions:
1. Check the troubleshooting section
2. Review error logs and metrics
3. Consult the API documentation
4. Contact the development team

---

**Note**: This system prioritizes blockchain data as the Single Source of Truth (SSoT). All conflicts are resolved in favor of blockchain data to ensure data integrity and transparency.
