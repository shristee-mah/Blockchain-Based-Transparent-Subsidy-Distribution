const { ethers } = require("hardhat");

async function debugContract() {
    try {
        console.log("Debugging contract...");
        
        const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        console.log("Contract address:", contractAddress);
        
        // Get provider and check if code exists at address
        const provider = ethers.provider;
        const code = await provider.getCode(contractAddress);
        console.log("Contract bytecode length:", code.length);
        
        if (code === "0x") {
            console.log("ERROR: No contract deployed at this address!");
            return;
        }
        
        // Try to connect to contract
        const contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);
        
        // Test basic functions
        try {
            const itemCount = await contract.itemCount();
            console.log("Item count:", itemCount.toString());
        } catch (error) {
            console.error("Error calling itemCount:", error.message);
        }
        
        // Try to call ADMIN_ROLE constant
        try {
            const adminRole = await contract.ADMIN_ROLE();
            console.log("ADMIN_ROLE:", adminRole);
        } catch (error) {
            console.error("Error calling ADMIN_ROLE:", error.message);
        }
        
        // List available functions
        console.log("Available functions:");
        console.log(Object.keys(contract.functions));
        
    } catch (error) {
        console.error("Debug failed:", error);
    }
}

debugContract().then(() => process.exit(0));
