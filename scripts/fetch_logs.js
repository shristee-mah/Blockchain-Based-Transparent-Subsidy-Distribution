const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const contract = await ethers.getContractAt("TransparentSubsidySystem", contractAddress);

    console.log(`Fetching events from contract at: ${contractAddress}\n`);

    // Fetch all events
    const filter = {
        address: contractAddress,
        fromBlock: 0,
        toBlock: "latest"
    };

    const logs = await ethers.provider.getLogs(filter);

    console.log(`Total Logs Found: ${logs.length}\n`);

    const stageNames = [
        "Created",
        "VerifiedByAdmin",
        "TransporterReady",
        "InTransit",
        "DistributorReady",
        "Distributed",
        "Claimed",
        "Cancelled"
    ];

    for (const log of logs) {
        try {
            const parsedLog = contract.interface.parseLog(log);
            console.log(`Event: ${parsedLog.name}`);

            const block = await ethers.provider.getBlock(log.blockNumber);
            const date = new Date(block.timestamp * 1000).toLocaleString();

            const args = {};
            parsedLog.fragment.inputs.forEach((input, index) => {
                let value = parsedLog.args[index];
                if (input.name === "stage" || input.name === "newStage") {
                    value = `${value} (${stageNames[Number(value)]})`;
                }
                args[input.name] = value.toString();
            });

            console.log(`  Block: ${log.blockNumber}`);
            console.log(`  Time:  ${date}`);
            console.log(`  TX:    ${log.transactionHash}`);
            console.log(`  Args:  ${JSON.stringify(args, null, 2)}`);
            console.log("-----------------------------------------");
        } catch (e) {
            // Not an event for this contract or different interface
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
