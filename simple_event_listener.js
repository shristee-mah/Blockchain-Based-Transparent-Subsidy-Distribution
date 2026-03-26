const { ethers } = require("ethers");

async function simpleEventListener() {
    console.log("Starting Simple Event Listener...");
    
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    
    const contractABI = [
        "event TransactionLogged(bytes32 indexed itemId, address indexed actor, string action)",
        "event ItemCreated(uint256 indexed itemId, address indexed beneficiary, string ipfsHash)",
        "event DocumentUploaded(uint256 indexed itemId, uint8 stage, string ipfsHash, address uploader)",
        "function createItem(address beneficiary, string calldata ipfsHash)"
    ];
    
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    const signer = await provider.getSigner();
    const contractWithSigner = contract.connect(signer);
    
    console.log("Setting up event listeners...");
    
    contract.on("TransactionLogged", (itemId, actor, action, event) => {
        console.log(`🔥 TransactionLogged: ${action} by ${actor}`);
        console.log(`   ItemId: ${itemId}`);
        console.log(`   Block: ${event.blockNumber}`);
        console.log(`   Transaction: ${event.transactionHash}`);
        console.log("---");
    });
    
    contract.on("ItemCreated", (itemId, beneficiary, ipfsHash, event) => {
        console.log(`🆕 ItemCreated: Item ${itemId} for ${beneficiary}`);
        console.log(`   IPFS: ${ipfsHash}`);
        console.log(`   Block: ${event.blockNumber}`);
        console.log(`   Transaction: ${event.transactionHash}`);
        console.log("---");
    });
    
    contract.on("DocumentUploaded", (itemId, stage, ipfsHash, uploader, event) => {
        console.log(`📄 DocumentUploaded: Stage ${stage} for Item ${itemId}`);
        console.log(`   IPFS: ${ipfsHash}`);
        console.log(`   Uploader: ${uploader}`);
        console.log(`   Block: ${event.blockNumber}`);
        console.log(`   Transaction: ${event.transactionHash}`);
        console.log("---");
    });
    
    console.log("Event listeners active! Creating test transaction in 3 seconds...");
    
    setTimeout(async () => {
        try {
            const testIpfs = "QmSimpleTest" + Date.now();
            const tx = await contractWithSigner.createItem(signer.address, testIpfs);
            console.log("Test transaction sent:", tx.hash);
            await tx.wait();
            console.log("Test transaction confirmed!");
        } catch (error) {
            console.error("Failed to create test transaction:", error);
        }
    }, 3000);
    
    // Keep running
    setTimeout(() => {
        console.log("Test completed!");
        contract.removeAllListeners();
        process.exit(0);
    }, 15000);
}

simpleEventListener();
