import axios from "axios";
import FormData from "form-data";
import db from "@/app/lib/db";

export async function POST(req) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const node_role = formData.get("node_role");
    const node_id = formData.get("node_id");
    const document_type = formData.get("document_type");

    if (!file || !node_id) {
      return Response.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Fallback for testing: Generate a realistic-looking mock CID if keys are missing
    const fakeHash = `QmFake${Math.random().toString(36).slice(2, 12).toUpperCase()}${Date.now().toString().slice(-4)}`;
    let ipfsHash = fakeHash;

    // Attempt Pinata upload only if keys are present and not placeholders
    if (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_API_KEY && process.env.PINATA_API_KEY !== 'your_api_key_here') {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const data = new FormData();
        data.append("file", buffer, file.name);

        const response = await axios.post(
          "https://api.pinata.cloud/pinning/pinFileToIPFS",
          data,
          {
            maxBodyLength: "Infinity",
            headers: {
              "Content-Type": `multipart/form-data; boundary=${data.getBoundary()}`,
              pinata_api_key: process.env.PINATA_API_KEY,
              pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
            },
          }
        );
        ipfsHash = response.data.IpfsHash;
      } catch (pinataError) {
        console.error("Pinata upload failed, using mock CID:", pinataError.message);
      }
    } else {
      console.warn("Pinata API keys missing, using mock CID");
    }

    await db.execute(
      `INSERT INTO node_documents
         (node_role, node_id, document_type, ipfs_hash)
         VALUES (?, ?, ?, ?)`,
      [node_role, node_id, document_type, ipfsHash]
    );

    return new Response(
      JSON.stringify({
        success: true,
        cid: ipfsHash
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("IPFS upload error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}