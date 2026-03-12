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

    // Sync current_stage from MySQL applications table for all returned items
    try {
      const bcItemIds = data.map(s => s.blockchain_itemId).filter(id => id !== undefined && id !== null);
      const mySqlIds = data.map(s => s.applicationId).filter(id => id !== undefined && id !== null).map(id => Number(id));

      if (bcItemIds.length > 0 || mySqlIds.length > 0) {
        let bcRows: any[] = [];
        let mysqlRows: any[] = [];

        if (bcItemIds.length > 0) {
          const placeholders = bcItemIds.map(() => '?').join(',');
          [bcRows] = (await dbPool.execute(
            `SELECT application_id as id, blockchain_itemId, current_stage FROM applications WHERE blockchain_itemId IN (${placeholders})`,
            bcItemIds
          )) as any;
        }

        if (mySqlIds.length > 0) {
          const placeholders = mySqlIds.map(() => '?').join(',');
          [mysqlRows] = (await dbPool.execute(
            `SELECT application_id as id, blockchain_itemId, current_stage FROM applications WHERE application_id IN (${placeholders})`,
            mySqlIds
          )) as any;
        }

        // Combine results into robust maps for stage AND ID sync
        const dbDataByBcId = Object.fromEntries(bcRows.map((r: any) => [String(r.blockchain_itemId), r]));
        const dbDataBySqlId = Object.fromEntries([...bcRows, ...mysqlRows].map((r: any) => [String(r.id), r]));

        data = data.map(s => {
          let stage = s.current_stage;
          let bcId = s.blockchain_itemId;

          // Sync by Blockchain ID (if we have it already)
          if (bcId !== undefined && bcId !== null) {
            const row = dbDataByBcId[String(bcId)];
            if (row) {
              stage = row.current_stage;
            }
          }
          // Sync by Application ID (to find newly assigned bcId)
          if (s.applicationId) {
            const row = dbDataBySqlId[String(s.applicationId)];
            if (row) {
              stage = row.current_stage;
              if (bcId === undefined || bcId === null) {
                bcId = row.blockchain_itemId !== null ? Number(row.blockchain_itemId) : bcId;
              }
            }
          }
          return { ...s, current_stage: stage, blockchain_itemId: bcId };
        });
      }
    } catch (dbErr: any) {
      console.warn("[submissions GET] Could not sync stages from DB:", dbErr.message);
    }

    console.log('[submissions] GET —', data.length, 'records (synced stages)');
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
      // Shifted: Item is now created by the Admin during Verification/Release.
      // This ensures itemID is only minted once verified.
      let blockchainItemId: number | null = null;
      const passedBcId = formData.get('blockchain_itemId');
      if (passedBcId) blockchainItemId = Number(passedBcId);

      // Sync with applications table
      let mySqlAppId: number | undefined = undefined;
      try {
        if (blockchainItemId !== null) {
          // Check if it already exists to avoid duplicates in the sync table
          const [rows]: any = await dbPool.execute(
            "SELECT id FROM applications WHERE blockchain_itemId = ?",
            [blockchainItemId]
          );

          if (rows.length > 0) {
            await dbPool.execute(
              "UPDATE applications SET status = ? WHERE blockchain_itemId = ?",
              ['pending', blockchainItemId]
            );
            mySqlAppId = rows[0].id;
          } else {
            const [result]: any = await dbPool.execute(
              "INSERT INTO applications (status, blockchain_itemId, current_stage, created_at) VALUES (?, ?, ?, NOW())",
              ['pending', blockchainItemId, Stage.Created]
            );
            mySqlAppId = (result as any).insertId;
          }
        } else {
          // Fallback for non-blockchain items or if creation failed
          const [result]: any = await dbPool.execute(
            "INSERT INTO applications (status, current_stage, created_at) VALUES (?, ?, NOW())",
            ['pending', Stage.Created]
          );
          mySqlAppId = (result as any).insertId;
        }
      } catch (dbAppErr: any) {
        console.error("[db] applications table sync failed (proceeding with JSON only):", dbAppErr.message);
      }

      let submissionStage: number | undefined = undefined;
      if (blockchainItemId !== null) {
        if (role === 'producer') submissionStage = Stage.Created;
        else if (role === 'transporter') submissionStage = Stage.TransporterReady;
        else if (role === 'distributor') submissionStage = Stage.DistributorReady;
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
        blockchain_itemId: blockchainItemId !== null ? Number(blockchainItemId) : undefined,
        current_stage: submissionStage,
        applicationId: mySqlAppId ? String(mySqlAppId) : (applicationId ?? undefined),
        ...(phone && { phone }),
      };

      const db = read();
      db.push(newSubmission);
      write(db);

      console.log('[submissions] POST (FormData) — id:', newSubmission.id,
        '| role:', newSubmission.role, '| CIDs:', uploadedCIDs, '| BC_ID:', blockchainItemId, '| mySqlAppId:', mySqlAppId);

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
          bcData.id = bcData.application_id; // Aliasing for safety if needed
          console.log(`[PATCH] Found blockchain data for ${id} via BC_ID:`, bcData);
        }
      } else {
        // Fallback: search by the linked MySQL application ID if available
        const searchId = existing.applicationId || id.split("-")[1];
        const [rows]: any = await dbPool.execute(
          "SELECT blockchain_itemId, current_stage FROM applications WHERE id = ?",
          [searchId]
        );
        if (rows && rows.length > 0) {
          bcData = rows[0];
          bcData.id = bcData.application_id;
          console.log(`[PATCH] Found blockchain data for ${id} via applicationId (${searchId}):`, bcData);
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

    // Resolve the blockchain item ID
    let resolvedItemId = bcData.blockchain_itemId ?? existing.blockchain_itemId ?? null;
    const currentStage = bcData.current_stage ?? existing.current_stage ?? 0;

    // We ONLY sync local status here to 'approved'. The actual blockchain minting 
    // happens when the user subsequently calls POST /api/blockchain/verify.
    if (status === 'approved' && resolvedItemId === null) {
      console.warn(`[PATCH] Warning: Approving item ${id} locally. Blockchain sync will mint the item in the next step.`);
    }

    const qrData =
      status === 'approved'
        ? JSON.stringify({
          itemId: resolvedItemId !== null ? Number(resolvedItemId) : null,
          submissionId: existing.id,
          currentStage: bcData.current_stage ?? existing.current_stage ?? 0,
          role: existing.role,
          cid: existing.cid ?? null,
          approvedBy: approvedBy || 'Admin',
          approvedAt: new Date().toISOString(),
          nextStage,
        })
        : undefined;

    let nextStageNum = bcData.current_stage;
    if (status === 'approved' && (nextStageNum === undefined || nextStageNum === existing.current_stage)) {
      if (existing.role === 'producer') nextStageNum = Stage.VerifiedByAdmin; // 1
      else if (existing.role === 'transporter') nextStageNum = Stage.InTransit; // 3
      else if (existing.role === 'distributor') nextStageNum = Stage.Distributed; // 5
    }

    db[index] = {
      ...existing,
      status,
      approvedBy: approvedBy || 'Admin',
      approvedAt: new Date().toISOString(),
      qrData,
      nextStage,
      blockchain_itemId: (bcData.blockchain_itemId ?? existing.blockchain_itemId) !== undefined
        ? Number(bcData.blockchain_itemId ?? existing.blockchain_itemId)
        : undefined,
      current_stage: nextStageNum,
    };

    write(db);

    console.log('[submissions] PATCH — id:', id, '| status:', status, '| BC_ID:', bcData.blockchain_itemId);
    return NextResponse.json(db[index]);
  } catch (error) {
    console.error('API PATCH Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}