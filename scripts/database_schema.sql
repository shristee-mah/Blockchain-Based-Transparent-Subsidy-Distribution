-- Database Schema for Blockchain-Based Transparent Subsidy Distribution System
-- This schema ensures the blockchain is the Single Source of Truth (SSoT)

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS subsidy_system;
USE subsidy_system;

-- Event listener state tracking
CREATE TABLE IF NOT EXISTS event_listener_state (
    id INT AUTO_INCREMENT PRIMARY KEY,
    listener_name VARCHAR(100) NOT NULL UNIQUE,
    block_number BIGINT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_listener_name (listener_name)
);

-- Items table - Stores subsidy items with blockchain as SSoT
CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id_uint VARCHAR(20) NOT NULL UNIQUE,  -- uint256 item ID from contract
    item_id_bytes32 VARCHAR(66) NOT NULL UNIQUE, -- bytes32 item ID (keccak256 hash)
    beneficiary_address VARCHAR(42) NOT NULL,
    current_stage TINYINT NOT NULL DEFAULT 0, -- 0-7 based on Stage enum
    claimed BOOLEAN NOT NULL DEFAULT FALSE,
    claimed_by VARCHAR(42) NULL, -- Address of who claimed the item
    claimed_at TIMESTAMP NULL,
    current_ipfs_hash TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_item_id_uint (item_id_uint),
    INDEX idx_item_id_bytes32 (item_id_bytes32),
    INDEX idx_beneficiary (beneficiary_address),
    INDEX idx_stage (current_stage),
    INDEX idx_claimed (claimed)
);

-- Blockchain transactions table - Complete audit log
CREATE TABLE IF NOT EXISTS blockchain_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id_bytes32 VARCHAR(66) NOT NULL,
    actor_address VARCHAR(42) NOT NULL,
    action VARCHAR(50) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL UNIQUE,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_item_id_bytes32 (item_id_bytes32),
    INDEX idx_actor (actor_address),
    INDEX idx_action (action),
    INDEX idx_transaction_hash (transaction_hash),
    INDEX idx_block_number (block_number),
    INDEX idx_created_at (created_at)
);

-- Documents table - Stores IPFS document references
CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id_uint VARCHAR(20) NOT NULL,
    stage TINYINT NOT NULL,
    ipfs_hash TEXT NOT NULL,
    uploader_address VARCHAR(42) NOT NULL,
    block_number BIGINT NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (item_id_uint) REFERENCES items(item_id_uint) ON DELETE CASCADE,
    INDEX idx_item_id_uint (item_id_uint),
    INDEX idx_stage (stage),
    INDEX idx_uploader (uploader_address),
    INDEX idx_transaction_hash (transaction_hash)
);

-- Merkle roots table - For document batch verification
CREATE TABLE IF NOT EXISTS merkle_roots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id_uint VARCHAR(20) NOT NULL,
    stage TINYINT NOT NULL,
    merkle_root VARCHAR(66) NOT NULL,
    set_by_address VARCHAR(42) NOT NULL,
    block_number BIGINT NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (item_id_uint) REFERENCES items(item_id_uint) ON DELETE CASCADE,
    UNIQUE KEY unique_item_stage (item_id_uint, stage),
    INDEX idx_item_id_uint (item_id_uint),
    INDEX idx_stage (stage),
    INDEX idx_merkle_root (merkle_root)
);

-- Conflict resolution log - Tracks when blockchain overrides backend data
CREATE TABLE IF NOT EXISTS conflict_resolution_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id_uint VARCHAR(20) NOT NULL,
    conflict_type VARCHAR(50) NOT NULL, -- 'STAGE_MISMATCH', 'CLAIMED_STATUS', etc.
    backend_value TEXT NULL,
    blockchain_value TEXT NOT NULL,
    resolution_action VARCHAR(50) NOT NULL, -- 'OVERRIDE_WITH_BLOCKCHAIN', 'MANUAL_REVIEW', etc.
    resolved_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM', -- 'SYSTEM', 'ADMIN', etc.
    block_number BIGINT NOT NULL,
    transaction_hash VARCHAR(66) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (item_id_uint) REFERENCES items(item_id_uint) ON DELETE CASCADE,
    INDEX idx_item_id_uint (item_id_uint),
    INDEX idx_conflict_type (conflict_type),
    INDEX idx_created_at (created_at)
);

-- User roles and permissions (for frontend access control)
CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    address VARCHAR(42) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL, -- 'ADMIN', 'PROCESSOR', 'TRANSPORTER', 'DISTRIBUTOR', 'BENEFICIARY'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_address (address),
    INDEX idx_role (role),
    INDEX idx_is_active (is_active)
);

-- API keys for external integrations
CREATE TABLE IF NOT EXISTS api_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    key_name VARCHAR(100) NOT NULL UNIQUE,
    api_key VARCHAR(255) NOT NULL UNIQUE,
    permissions JSON NOT NULL, -- {"can_read": true, "can_write": false, "endpoints": [...]}
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    
    INDEX idx_key_name (key_name),
    INDEX idx_api_key (api_key),
    INDEX idx_is_active (is_active)
);

-- Insert default admin user (if not exists)
INSERT IGNORE INTO user_roles (address, role) 
VALUES ('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', 'ADMIN');

-- Insert default processor user (if not exists)
INSERT IGNORE INTO user_roles (address, role) 
VALUES ('0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 'PROCESSOR');

-- Insert default transporter user (if not exists)
INSERT IGNORE INTO user_roles (address, role) 
VALUES ('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', 'TRANSPORTER');

-- Insert default distributor user (if not exists)
INSERT IGNORE INTO user_roles (address, role) 
VALUES ('0x90F79bf6EB2c4f870365E785982E1f101E93b906', 'DISTRIBUTOR');

-- Create a view for recent blockchain transactions (for audit log)
CREATE OR REPLACE VIEW recent_blockchain_transactions AS
SELECT 
    bt.item_id_bytes32,
    bt.actor_address,
    bt.action,
    bt.transaction_hash,
    bt.block_number,
    bt.created_at,
    i.beneficiary_address,
    i.current_stage,
    i.claimed
FROM blockchain_transactions bt
LEFT JOIN items i ON bt.item_id_bytes32 = i.item_id_bytes32
ORDER BY bt.block_number DESC, bt.created_at DESC;

-- Create a view for item status with blockchain confirmation
CREATE OR REPLACE VIEW item_status_with_blockchain AS
SELECT 
    i.id,
    i.item_id_uint,
    i.item_id_bytes32,
    i.beneficiary_address,
    i.current_stage,
    i.claimed,
    i.claimed_by,
    i.claimed_at,
    i.current_ipfs_hash,
    i.created_at,
    i.updated_at,
    COUNT(bt.id) as transaction_count,
    MAX(bt.block_number) as last_block_number
FROM items i
LEFT JOIN blockchain_transactions bt ON i.item_id_bytes32 = bt.item_id_bytes32
GROUP BY i.id, i.item_id_uint, i.item_id_bytes32, i.beneficiary_address, 
         i.current_stage, i.claimed, i.claimed_by, i.claimed_at, 
         i.current_ipfs_hash, i.created_at, i.updated_at;

-- Stored procedure for conflict resolution (blockchain overrides backend)
DELIMITER //
CREATE PROCEDURE ResolveConflictWithBlockchain(
    IN p_item_id_uint VARCHAR(20),
    IN p_conflict_type VARCHAR(50),
    IN p_backend_value TEXT,
    IN p_blockchain_value TEXT,
    IN p_block_number BIGINT,
    IN p_transaction_hash VARCHAR(66)
)
BEGIN
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    
    -- Log the conflict
    INSERT INTO conflict_resolution_log (
        item_id_uint, conflict_type, backend_value, blockchain_value, 
        resolution_action, resolved_by, block_number, transaction_hash
    ) VALUES (
        p_item_id_uint, p_conflict_type, p_backend_value, p_blockchain_value,
        'OVERRIDE_WITH_BLOCKCHAIN', 'SYSTEM', p_block_number, p_transaction_hash
    );
    
    COMMIT;
END //
DELIMITER ;

-- Function to check if user has required role
DELIMITER //
CREATE FUNCTION HasUserRole(user_address VARCHAR(42), required_role VARCHAR(20))
RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE role_count INT;
    
    SELECT COUNT(*) INTO role_count
    FROM user_roles
    WHERE address = user_address 
      AND role = required_role 
      AND is_active = TRUE;
    
    RETURN role_count > 0;
END //
DELIMITER ;

-- Trigger to update updated_at timestamp for items
DELIMITER //
CREATE TRIGGER items_before_update 
BEFORE UPDATE ON items
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END //
DELIMITER ;
