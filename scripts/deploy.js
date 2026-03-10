const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Starting deployment...");

    const [admin, processor, transporter, distributor, beneficiary] = await ethers.getSigners();
    console.log("Deploying with Admin:", admin.address);

    const Factory = await ethers.getContractFactory("TransparentSubsidySystem");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log("Contract deployed to:", address);

    // Grant roles to accounts for testing
    const PROCESSOR_ROLE = await contract.PROCESSOR_ROLE();
    const TRANSPORTER_ROLE = await contract.TRANSPORTER_ROLE();
    const DISTRIBUTOR_ROLE = await contract.DISTRIBUTOR_ROLE();

    console.log("Granting roles...");
    await contract.grantRole(PROCESSOR_ROLE, processor.address);
    await contract.grantRole(TRANSPORTER_ROLE, transporter.address);
    await contract.grantRole(DISTRIBUTOR_ROLE, distributor.address);

    // Also grant to admin for easy server-side testing if needed
    await contract.grantRole(PROCESSOR_ROLE, admin.address);
    await contract.grantRole(TRANSPORTER_ROLE, admin.address);
    await contract.grantRole(DISTRIBUTOR_ROLE, admin.address);

    console.log("Roles assigned successfully.");
    console.log("-----------------------------------------");
    console.log("Processor address:  ", processor.address);
    console.log("Transporter address:", transporter.address);
    console.log("Distributor address:", distributor.address);
    console.log("Beneficiary address:", beneficiary.address);
    console.log("-----------------------------------------");

    // Save the address to a local file for the app to see
    const envPath = path.join(__dirname, "..", ".env");
    let envContent = fs.readFileSync(envPath, "utf8");

    if (envContent.includes("CONTRACT_ADDRESS=")) {
        envContent = envContent.replace(/CONTRACT_ADDRESS=.*/, `CONTRACT_ADDRESS=${address}`);
    } else {
        envContent += `\nCONTRACT_ADDRESS=${address}`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log("Updated CONTRACT_ADDRESS in .env");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
