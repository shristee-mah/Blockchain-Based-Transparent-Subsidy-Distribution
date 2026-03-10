# Nischit (निश्चित) - Blockchain-Based Transparent Subsidy Distribution

A modern, transparent, and secure subsidy distribution system leveraging blockchain technology to ensure traceability and prevent fraud in the supply chain of subsidized goods.

## 🚀 Project Overview

Nischit is a specialized platform designed to track the journey of subsidized items from production to the final beneficiary. By recording every handover and approval on a blockchain, it provides a tamper-proof audit trail that can be verified by all stakeholders.

## 🛠️ Technology Stack

- **Frontend**: Next.js 15 (App Router), React, CSS Modules
- **Blockchain**: Ethereum, Hardhat, Ethers.js
- **Backend/API**: Next.js Server Actions & API Routes
- **Database**: MySQL (for local caching and document metadata)
- **Storage**: IPFS (Pinata) for immutable document storage
- **QR Integration**: html5-qrcode & jsQR

## 🔄 The 7-Stage Workflow

The system follows a strict state-machine pattern on the blockchain:
1.  **Application Created**: Processor uploads initial item details and documents.
2.  **Admin Verified (Stage 0)**: Admin approves the initial submission.
3.  **Transporter Pickup**: Transporter scans QR and uploads pickup documents.
4.  **Admin Verified (In Transit)**: Admin approves transport documentation.
5.  **Distributor Delivery**: Distributor scans QR and uploads delivery receipts.
6.  **Admin Verified (Delivered)**: Admin gives final delivery approval.
7.  **Claimed by Beneficiary**: Beneficiary scans the final QR to claim the subsidy on-chain.

## ✨ Key Features

- **Live Application Timeline**: Beneficiaries can track their application in real-time with verified blockchain timestamps and transaction hashes.
- **Robust QR Handover**: Secure, encrypted QR codes handle the transition between roles (Processor → Transporter → Distributor → Beneficiary).
- **Multi-Role Dashboards**: Custom interfaces for Admin, Processors, Transporters, and Distributors.
- **Blockchain Event Logs**: The system queries live smart contract events to generate accurate, unfalsifiable history for every item.

## 📦 Setting Up Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/shristee-mah/Blockchain-Based-Transparent-Subsidy-Distribution.git
   cd final_major_project
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the Blockchain (Hardhat)**:
   ```bash
   npx hardhat node
   ```

4. **Deploy the Smart Contract**:
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```

5. **Run the Dev Server**:
   ```bash
   npm run dev
   ```

## 📝 Configuration

Ensure your `.env` file contains the correct `CONTRACT_ADDRESS` and private keys for testing.

---
Built with ❤️ for Transparency.
