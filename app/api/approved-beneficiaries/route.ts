import { NextResponse } from 'next/server';
import db from '@/app/lib/db';

export async function GET(request: Request) {
  try {
    // Query to get approved beneficiaries from the approved_subsidy_beneficiaries table
    // These are beneficiaries with KYC status 'APPROVED' and subsidy not yet claimed
    const [rows] = await db.execute(`
      SELECT 
        id,
        full_name,
        phone_number,
        identity_no,
        identity_type,
        local_level_id,
        ward_no,
        tole_name,
        kyc_status,
        batch_id,
        subsidy_claimed,
        claim_date,
        verified_by,
        verified_at,
        is_active,
        created_at,
        updated_at
      FROM approved_subsidy_beneficiaries
      WHERE kyc_status = 'APPROVED' 
        AND is_active = 1
        AND (subsidy_claimed = 0 OR subsidy_claimed IS NULL)
      ORDER BY created_at DESC
      LIMIT 50
    `) as any[];

    // Transform the data to match the expected format
    const approvedBeneficiaries = (rows as any[]).map((row: any) => ({
      id: row.id,
      beneficiary_name: row.full_name,
      beneficiary_phone: row.phone_number,
      identity_no: row.identity_no,
      identity_type: row.identity_type,
      local_level_id: row.local_level_id,
      ward_no: row.ward_no,
      tole_name: row.tole_name,
      kyc_status: row.kyc_status,
      batch_id: row.batch_id,
      subsidy_claimed: row.subsidy_claimed,
      claim_date: row.claim_date,
      verified_by: row.verified_by,
      verified_at: row.verified_at,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      progress_percentage: row.subsidy_claimed ? 100 : 50,
      transaction_count: row.verified_by ? 1 : 0
    }));

    return NextResponse.json({
      success: true,
      data: approvedBeneficiaries,
      count: approvedBeneficiaries.length
    });

  } catch (error: any) {
    console.error('[Approved Beneficiaries] Error:', error.message);
    return NextResponse.json({ 
      error: 'Failed to fetch approved beneficiaries',
      details: error.message 
    }, { status: 500 });
  }
}

function getStageName(stage: number): string {
  const stageNames: { [key: number]: string } = {
    0: 'Created',
    1: 'Verified by Admin',
    2: 'Transporter Ready',
    3: 'In Transit',
    4: 'Distributor Ready',
    5: 'Distributed',
    6: 'Claimed',
    7: 'Cancelled'
  };
  return stageNames[stage] || 'Unknown';
}

function getProgressPercentage(stage: number): number {
  const progressMap: { [key: number]: number } = {
    0: 14,
    1: 28,
    2: 42,
    3: 57,
    4: 71,
    5: 85,
    6: 100,
    7: 0
  };
  return progressMap[stage] || 0;
}
