const { ethers } = require("ethers");

async function triggerTestEvent() {
    try {
        console.log("Triggering test event...");
        
        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        
        const contractABI = [
            "function createItem(address beneficiary, string calldata ipfsHash)"
        ];
        
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        const signer = await provider.getSigner();
        const contractWithSigner = contract.connect(signer);
        
        const testIpfs = "QmTriggerTest" + Date.now();
        const tx = await contractWithSigner.createItem(signer.address, testIpfs);
        console.log("Test transaction sent:", tx.hash);
        await tx.wait();
        console.log("Test transaction confirmed!");
        
    } catch (error) {
        console.error("Failed to trigger test event:", error);
    }
}

triggerTestEvent();
