import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormDataNode from 'form-data';
import dbPool from '@/app/lib/db';
import { getContract, ADMIN_KEY, Stage } from "@/app/lib/blockchain";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type Submission = {
  id: string;
  name: string;
  district: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  role: 'producer' | 'transporter' | 'distributor';
  docs: { label: string; fileType: string }[];
  cid?: string;
  qrData?: string;
  approvedAt?: string;
  approvedBy?: string;
  nextStage?: string;
  phone?: string;
  applicationId?: string;
  blockchain_itemId?: number;
  current_stage?: number;
};

const DB_FILE = path.join(process.cwd(), '.submissions.json');
const g = globalThis as typeof globalThis & { __nischit_db__?: Submission[] };

function read(): Submission[] {
  if (g.__nischit_db__) return g.__nischit_db__;
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8').trim();
      if (raw) {
        g.__nischit_db__ = JSON.parse(raw) as Submission[];
        console.log('[submissions] Loaded', g.__nischit_db__.length, 'records from disk');
        return g.__nischit_db__;
      }
    }
  } catch (e) {
    console.error('[submissions] Failed to read file, starting fresh:', e);
  }
  g.__nischit_db__ = [];
  return g.__nischit_db__;
}

function write(data: Submission[]): void {
  g.__nischit_db__ = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('[submissions] Failed to write file (data still in memory):', e);
  }
}

async function uploadToIPFS(buffer: Buffer, filename: string): Promise<string> {
  // If keys are missing, return a realistic looking fake CID for testing
  if (!process.env.PINATA_API_KEY || !process.env.PINATA_SECRET_API_KEY || process.env.PINATA_API_KEY === 'your_api_key_here') {
    const fakeCid = `QmFake${Math.random().toString(36).slice(2, 12).toUpperCase()}${Date.now().toString().slice(-4)}`;
    console.warn("[submissions] Pinata API keys missing or using placeholders, using fake CID:", fakeCid);
    return fakeCid;
  }

  try {
    const data = new FormDataNode();
    data.append('file', buffer, filename);

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      data,
      {
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        headers: {
          'Content-Type': `multipart/form-data; boundary=${data.getBoundary()}`,
          pinata_api_key: process.env.PINATA_API_KEY!,
          pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY!,
        },
      }
    );

    return response.data.IpfsHash;
  } catch (err: any) {
    console.error("[submissions] Pinata upload failed:",
      err.response?.status,
      JSON.stringify(err.response?.data || err.message)
    );
    const fakeCid = `QmError${Math.random().toString(36).slice(2, 12).toUpperCase()}${Date.now().toString().slice(-4)}`;
    return fakeCid;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const applicationId = searchParams.get('applicationId');

    let data = read();
    if (phone) data = data.filter((s) => s.phone === phone);
    if (applicationId) data = data.filter((s) => s.applicationId === applicationId);

    console.log('[submissions] GET —', data.length, 'records');
    return NextResponse.json(data);
  } catch (error) {
    console.error('API GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();

      const name = formData.get('name') as string;
      const node_id = (formData.get('node_id') as string) || '';
      const district = formData.get('district') as string;
      const role = (formData.get('role') as string) || 'producer';
      const phone = formData.get('phone') as string | null;
      const applicationId = formData.get('applicationId') as string | null;
      const rawFiles = formData.getAll('files') as File[];

      if (!name || rawFiles.length === 0) {
        return NextResponse.json(
          { error: 'Missing required fields: name, files' },
          { status: 400 }
        );
      }

      const uploadedCIDs: string[] = [];
      const docs: { label: string; fileType: string }[] = [];
      const submissionId = `APP-${Date.now()}`;

      for (const file of rawFiles) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const cid = await uploadToIPFS(buffer, file.name);
        uploadedCIDs.push(cid);
        docs.push({ label: file.name, fileType: file.type || 'Unknown' });

        // Extract numeric part from node_id or submissionId for the DB 'node_id' column if it's an INT
        const numericNodeId = parseInt(node_id) || parseInt(submissionId.replace(/\D/g, '')) || 0;

        try {
          await dbPool.execute(
            `INSERT INTO node_documents (node_role, node_id, document_type, ipfs_hash, uploaded_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [role, numericNodeId, file.name, cid]
          );
        } catch (dbErr: any) {
          console.error("[submissions] Database insertion failed:", dbErr.message);
          // We continue because file is still in memory/local JSON db
        }

        console.log('[submissions] Uploaded to IPFS (or mock):', file.name, '→', cid);
      }

      // ---------------- BREAKING: BLOCKCHAIN INTEGRATION ----------------
      // Create item on blockchain if role is producer (processor)
      let blockchainItemId: number | null = null;
      const passedBcId = formData.get('blockchain_itemId');
      if (passedBcId) blockchainItemId = Number(passedBcId);

      if (role === 'producer' && !blockchainItemId) {
        try {
          const contract = getContract(ADMIN_KEY); // Or use a separate processor key
          // Use a dummy address for beneficiary if not provided, or take it from the form
          const beneficiaryAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Default Hardhat Account #1
          const tx = await contract.createItem(beneficiaryAddress, uploadedCIDs[0] || "QmNone");
          const receipt = await tx.wait();

          // Extract itemId from ItemCreated event
          const event = receipt.logs.find((log: any) => log.fragment?.name === 'ItemCreated');
          if (event) {
            blockchainItemId = Number(event.args[0]);
            console.log(`[blockchain] Created Item ID ${blockchainItemId}`);
          }
        } catch (bcErr: any) {
          console.error("[blockchain] Failed to create item:", bcErr.message);
        }
      }

      // Sync with applications table
      try {
        if (blockchainItemId !== null) {
          // Check if it already exists to avoid duplicates in the sync table
          const [rows]: any = await dbPool.execute(
            "SELECT id FROM applications WHERE blockchain_itemId = ?",
            [blockchainItemId]
          );

          if (rows.length > 0) {
            await dbPool.execute(
              "UPDATE applications SET status = ?, updated_at = NOW() WHERE blockchain_itemId = ?",
              ['pending', blockchainItemId]
            );
          } else {
            await dbPool.execute(
              "INSERT INTO applications (status, blockchain_itemId, current_stage, created_at) VALUES (?, ?, ?, NOW())",
              ['pending', blockchainItemId, Stage.Created]
            );
          }
        } else {
          // Fallback for non-blockchain items or if creation failed
          await dbPool.execute(
            "INSERT INTO applications (status, current_stage, created_at) VALUES (?, ?, NOW())",
            ['pending', Stage.Created]
          );
        }
      } catch (dbAppErr: any) {
        console.error("[db] applications table sync failed (proceeding with JSON only):", dbAppErr.message);
      }

      const newSubmission: Submission = {
        id: submissionId,
        name,
        district: district || '',
        role: role as Submission['role'],
        status: 'pending',
        createdAt: new Date().toISOString(),
        docs,
        cid: uploadedCIDs[0],
        blockchain_itemId: blockchainItemId || undefined,
        current_stage: blockchainItemId !== null ? Stage.Created : undefined,
        ...(phone && { phone }),
        ...(applicationId && { applicationId }),
      };

      const db = read();
      db.push(newSubmission);
      write(db);

      console.log('[submissions] POST (FormData) — id:', newSubmission.id,
        '| role:', newSubmission.role, '| CIDs:', uploadedCIDs, '| BC_ID:', blockchainItemId);

      return NextResponse.json(newSubmission, { status: 201 });
    }

    // JSON path — transporter, distributor, legacy
    const body = await request.json();

    if (!body.name || !body.docs) {
      return NextResponse.json(
        { error: 'Missing required fields: name, docs' },
        { status: 400 }
      );
    }

    const newSubmission: Submission = {
      id: `APP-${Date.now()}`,
      district: '',
      ...body,
      status: 'pending',
      createdAt: new Date().toISOString(),
      cid: body.cid ?? `Qm${Math.random().toString(36).slice(2, 12).toUpperCase()}${Date.now()}`,
    };

    const db = read();
    db.push(newSubmission);
    write(db);

    console.log('[submissions] POST (JSON) — id:', newSubmission.id,
      '| role:', newSubmission.role, '| total:', db.length);

    return NextResponse.json(newSubmission, { status: 201 });

  } catch (error) {
    console.error('API POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, approvedBy } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    const db = read();
    const index = db.findIndex((s) => s.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const existing = db[index];

    // Attempt to fetch latest blockchain data from MySQL
    let bcData: any = {
      blockchain_itemId: existing.blockchain_itemId,
      current_stage: existing.current_stage
    };

    try {
      if (existing.blockchain_itemId !== undefined) {
        const [rows]: any = await dbPool.execute(
          "SELECT blockchain_itemId, current_stage FROM applications WHERE blockchain_itemId = ?",
          [existing.blockchain_itemId]
        );
        if (rows && rows.length > 0) {
          bcData = rows[0];
          console.log(`[PATCH] Found blockchain data for ${id} via BC_ID:`, bcData);
        }
      } else {
        // Fallback to searching by the timestamp segment of the ID if it's stored that way in DB
        // (This is mostly for legacy/debugging, as applications table id is usually auto-increment)
        const numericId = id.split("-")[1];
        const [rows]: any = await dbPool.execute(
          "SELECT blockchain_itemId, current_stage FROM applications WHERE id = ?",
          [numericId]
        );
        if (rows && rows.length > 0) {
          bcData = rows[0];
          console.log(`[PATCH] Found blockchain data for ${id} via numericId fallback:`, bcData);
        }
      }
    } catch (dbErr: any) {
      console.error("[PATCH] Database query failed (using existing JSON data):", dbErr.message);
      // We continue with whatever is in bcData (which defaults to JSON state)
    }

    const nextStage =
      status === 'approved'
        ? existing.role === 'producer'
          ? 'transporter_handover'
          : existing.role === 'transporter'
            ? 'distributor_handover'
            : 'beneficiary_delivery'
        : undefined;

    // Resolve the blockchain item ID — fall back to the submission ID itself when DB is unavailable
    const resolvedItemId = bcData.blockchain_itemId ?? existing.blockchain_itemId ?? null;

    const qrData =
      status === 'approved'
        ? JSON.stringify({
          itemId: resolvedItemId,           // number | null — scanner must tolerate null
          submissionId: existing.id,        // always present
          currentStage: bcData.current_stage ?? existing.current_stage ?? 0,
          role: existing.role,
          cid: existing.cid ?? null,
          approvedBy: approvedBy || 'Admin',
          approvedAt: new Date().toISOString(),
          nextStage,
        })
        : undefined;

    db[index] = {
      ...existing,
      status,
      approvedBy: approvedBy || 'Admin',
      approvedAt: new Date().toISOString(),
      qrData,
      nextStage,
      blockchain_itemId: bcData.blockchain_itemId,
      current_stage: bcData.current_stage,
    };

    write(db);

    console.log('[submissions] PATCH — id:', id, '| status:', status, '| BC_ID:', bcData.blockchain_itemId);
    return NextResponse.json(db[index]);
  } catch (error) {
    console.error('API PATCH Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}