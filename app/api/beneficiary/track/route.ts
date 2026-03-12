import { NextResponse } from 'next/server';
import dbPool from '@/app/lib/db';
import { Stage } from '@/app/lib/blockchain';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // First, try to find beneficiary by phone in beneficiary_general table
    let beneficiaryData: any = null;
    try {
      const [beneficiaryRows] = await dbPool.execute(
        'SELECT * FROM beneficiary_general WHERE phone_number = ? OR mobile = ?',
        [phone, phone]
      );
      if (Array.isArray(beneficiaryRows) && beneficiaryRows.length > 0) {
        beneficiaryData = beneficiaryRows[0];
      }
    } catch (dbErr: any) {
      console.warn('[Beneficiary Track] Could not query beneficiary_general:', dbErr.message);
    }

    // Find all applications related to this phone number
    const applications: any[] = [];
    
    try {
      // Search in applications table (if it has phone field)
      const [appRows] = await dbPool.execute(
        'SELECT a.*, u.phone, u.name FROM applications a LEFT JOIN users u ON a.user_id = u.user_id WHERE u.phone = ? OR a.phone = ?',
        [phone, phone]
      ) as any[];
      
      if (Array.isArray(appRows)) {
        for (const row of appRows) {
          applications.push({
            application_id: row.application_id,
            status: row.status,
            current_stage: row.current_stage,
            blockchain_itemId: row.blockchain_itemId,
            created_at: row.created_at,
            user_name: row.name,
            phone: row.phone
          });
        }
      }
    } catch (dbErr: any) {
      console.warn('[Beneficiary Track] Could not query applications:', dbErr.message);
    }

    // Also search in submissions JSON file for any additional data
    const submissionsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/submissions?phone=${phone}`);
    let submissionsData: any[] = [];
    
    if (submissionsResponse.ok) {
      submissionsData = await submissionsResponse.json();
    }

    // Combine all data and create comprehensive status
    const allApplications = [
      ...applications,
      ...submissionsData.map(sub => ({
        application_id: sub.applicationId || sub.id,
        status: sub.status,
        current_stage: sub.current_stage,
        blockchain_itemId: sub.blockchain_itemId,
        created_at: sub.createdAt,
        user_name: sub.name,
        phone: sub.phone,
        role: sub.role,
        district: sub.district,
        docs: sub.docs,
        approvedAt: sub.approvedAt,
        approvedBy: sub.approvedBy
      }))
    ];

    // Remove duplicates by application_id
    const uniqueApplications = allApplications.filter((app, index, self) =>
      index === self.findIndex((a) => a.application_id === app.application_id)
    );

    // Create status timeline for each application
    const timelineData = uniqueApplications.map(app => {
      const stageInfo = getStageInfo(app.current_stage);
      return {
        applicationId: app.application_id,
        status: app.status,
        currentStage: app.current_stage,
        stageName: stageInfo.name,
        stageDescription: stageInfo.description,
        progress: stageInfo.progress,
        blockchainItemId: app.blockchain_itemId,
        createdAt: app.created_at,
        approvedAt: app.approvedAt,
        approvedBy: app.approvedBy,
        userName: app.user_name,
        phone: app.phone,
        role: app.role,
        district: app.district,
        documents: app.docs,
        nextSteps: stageInfo.nextSteps,
        isCompleted: app.current_stage === Stage.Claimed,
        isActive: isStageActive(app.current_stage)
      };
    });

    // Sort by creation date (newest first)
    timelineData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const response = {
      success: true,
      beneficiary: beneficiaryData,
      phone: phone,
      applications: timelineData,
      summary: {
        totalApplications: timelineData.length,
        pendingApplications: timelineData.filter(app => app.status === 'pending').length,
        approvedApplications: timelineData.filter(app => app.status === 'approved').length,
        completedApplications: timelineData.filter(app => app.isCompleted).length,
        inProgressApplications: timelineData.filter(app => app.isActive && !app.isCompleted).length
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[Beneficiary Track] Error:', error.message);
    return NextResponse.json({ 
      error: 'Failed to track beneficiary application',
      details: error.message 
    }, { status: 500 });
  }
}

function getStageInfo(stage: number) {
  const stages: { [key: number]: { name: string; description: string; progress: number; nextSteps: string } } = {
    [Stage.Created]: {
      name: 'Application Submitted',
      description: 'Initial documents uploaded by processor',
      progress: 14,
      nextSteps: 'Awaiting admin verification of documents'
    },
    [Stage.VerifiedByAdmin]: {
      name: 'Admin Verified',
      description: 'Documents verified by admin, QR released to transporter',
      progress: 28,
      nextSteps: 'Transporter to scan QR and submit pickup documents'
    },
    [Stage.TransporterReady]: {
      name: 'Transporter Handover',
      description: 'Transporter has submitted pickup documents',
      progress: 42,
      nextSteps: 'Awaiting admin verification of pickup documents'
    },
    [Stage.InTransit]: {
      name: 'In Transit',
      description: 'Items being transported to distributor',
      progress: 57,
      nextSteps: 'Distributor to scan QR and submit delivery documents'
    },
    [Stage.DistributorReady]: {
      name: 'Distributor Handover',
      description: 'Distributor has submitted delivery documents',
      progress: 71,
      nextSteps: 'Awaiting admin verification of delivery documents'
    },
    [Stage.Distributed]: {
      name: 'Ready for Claim',
      description: 'Items ready for beneficiary claim, QR released to beneficiary',
      progress: 85,
      nextSteps: 'Beneficiary to scan QR for final claim'
    },
    [Stage.Claimed]: {
      name: 'Claimed',
      description: 'Subsidy successfully claimed by beneficiary',
      progress: 100,
      nextSteps: 'Process completed successfully'
    },
    [Stage.Cancelled]: {
      name: 'Cancelled',
      description: 'Application has been cancelled',
      progress: 0,
      nextSteps: 'Contact support for assistance'
    }
  };

  return stages[stage] || {
    name: 'Unknown Stage',
    description: 'Stage information not available',
    progress: 0,
    nextSteps: 'Contact support for assistance'
  };
}

function isStageActive(stage: number): boolean {
  return stage >= Stage.Created && stage <= Stage.Distributed;
}
