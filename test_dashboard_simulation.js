console.log('=== Simulating Dashboard Event Log Problem ===');

// Simulate the data the dashboard receives
const mockBlockchainLogs = [
  {
    eventName: "ItemCreated",
    blockNumber: 8,
    transactionHash: "0x85c195ebc6269f0f26ea6c6a1487a829aed0d6e390851675081568be91c9505d",
    timestamp: 1773994146000,
    args: {
      itemId: "1",
      beneficiary: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      ipfsHash: "QmTestDocument123"
    }
  },
  {
    eventName: "DocumentUploaded",
    blockNumber: 8,
    transactionHash: "0x85c195ebc6269f0f26ea6c6a1487a829aed0d6e390851675081568be91c9505d",
    timestamp: 1773994146000,
    args: {
      itemId: "1",
      stage: "0",
      ipfsHash: "QmTestDocument123",
      uploader: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    },
    stageName: "Created"
  }
];

const mockSubmissions = [
  {
    id: "APP-123",
    name: "Test User",
    phone: "9876543210",
    role: "producer",
    status: "approved",
    blockchain_itemId: 1,
    current_stage: 1,  // This shows stage 1 in database
    approvedAt: "2026-03-11T22:11:26Z"
  }
];

// Simulate the resolveTimelineWithLogs function
const STAGES = [
  { label: "Application Created" },
  { label: "Admin Verified (Processor Handover)" },
  { label: "Transporter Pickup" },
  { label: "Admin Verified (In Transit)" },
  { label: "Distributor Delivery" },
  { label: "Admin Verified (Delivered)" },
  { label: "Claimed by Beneficiary" },
];

function resolveTimelineWithLogs(logs, submissions) {
  if (submissions.length === 0) {
    return STAGES.map((s, i) => ({
      label: s.label,
      date: i === 0 ? "Pending application" : "Locked",
      status: "pending",
    }));
  }

  // Parse stages from logs
  const logEntries = logs.map(log => {
    let stage = -1;
    if (log.eventName === "ItemCreated") stage = 0;
    else if (log.eventName === "ItemVerified") stage = Number(log.args.newStage);
    else if (log.eventName === "DocumentUploaded") stage = Number(log.args.stage);
    else if (log.eventName === "SubsidyClaimed") stage = 6;

    return {
      stage,
      date: log.timestamp,
      txHash: log.transactionHash,
      cid: log.args.ipfsHash,
      eventName: log.eventName
    };
  }).filter(l => l.stage !== -1);

  console.log('Log entries parsed:', logEntries);

  // Find the highest stage index that has a VERIFIED log or evidence
  let effectiveDoneIdx = logEntries.length > 0 ? Math.max(...logEntries.map(l => l.stage)) : -1;
  console.log('Effective stage from blockchain logs:', effectiveDoneIdx);

  // Fallback/Augmentation: Check local submissions for current_stage if logs are lagging
  const maxSubStage = Math.max(-1, ...submissions.map(s => s.current_stage ?? -1));
  console.log('Max stage from submissions:', maxSubStage);

  if (maxSubStage > effectiveDoneIdx) {
    effectiveDoneIdx = maxSubStage;
    console.log('Using submission stage as fallback:', effectiveDoneIdx);
  }

  // If we have at least one submission, we are at least at Stage 0
  if (effectiveDoneIdx === -1 && submissions.length > 0) {
    effectiveDoneIdx = 0;
  }

  console.log('Final effective stage:', effectiveDoneIdx);

  return STAGES.map((s, i) => {
    let status = "pending";
    if (i <= effectiveDoneIdx) status = "done";
    else if (i === effectiveDoneIdx + 1) status = "active";

    return {
      label: s.label,
      status,
      stage: i,
      effectiveDoneIdx
    };
  });
}

const timeline = resolveTimelineWithLogs(mockBlockchainLogs, mockSubmissions);
console.log('\n=== TIMELINE RESULT ===');
timeline.forEach((item, i) => {
  console.log(`Stage ${i}: ${item.label} - Status: ${item.status}`);
});

console.log('\n=== PROBLEM ANALYSIS ===');
console.log('1. Blockchain logs only show stage 0 (ItemCreated, DocumentUploaded)');
console.log('2. Database shows current_stage = 1 (Admin Verified)');
console.log('3. Timeline uses fallback to database, showing stage 1 as done');
console.log('4. But there are no blockchain events for stage 1 verification');
console.log('5. This creates inconsistency between blockchain and displayed status');
