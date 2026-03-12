import { NextResponse } from "next/server";
import dbPool from "@/app/lib/db";

interface MilestoneCheckin {
  applicationId: string;
  milestone: string;
  location?: {
    lat: number;
    lng: number;
  };
  notes?: string;
  timestamp?: string;
}

export async function POST(request: Request) {
    try {
        const body: MilestoneCheckin = await request.json();
        const { applicationId, milestone, location, notes, timestamp } = body;

        if (!applicationId || !milestone) {
            return NextResponse.json({ error: "Missing applicationId or milestone" }, { status: 400 });
        }

        console.log(`[MilestoneCheckin] Processing: applicationId=${applicationId}, milestone=${milestone}`);

        // Insert milestone check-in record
        await dbPool.execute(`
            INSERT INTO milestone_checkins (
                application_id, 
                milestone, 
                checkin_lat, 
                checkin_lng, 
                notes, 
                checkin_timestamp
            ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
            applicationId,
            milestone,
            location?.lat || null,
            location?.lng || null,
            notes || null,
            timestamp || new Date().toISOString()
        ]);

        // Update transport tracking with latest milestone
        await dbPool.execute(`
            UPDATE transport_tracking 
            SET last_milestone = ?, updated_at = NOW()
            WHERE application_id = ?
        `, [milestone, applicationId]);

        console.log("[MilestoneCheckin] Milestone recorded successfully");

        return NextResponse.json({
            success: true,
            message: "Milestone checked in successfully",
            milestone,
            timestamp: timestamp || new Date().toISOString()
        });

    } catch (error: any) {
        console.error("[MilestoneCheckin] Error:", error.message);
        return NextResponse.json({ 
            error: error.message || "Milestone check-in failed"
        }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const applicationId = searchParams.get('applicationId');

        if (!applicationId) {
            return NextResponse.json({ error: "Missing applicationId parameter" }, { status: 400 });
        }

        // Fetch milestone history for an application
        const [milestones] = await dbPool.execute(`
            SELECT milestone, checkin_lat, checkin_lng, notes, checkin_timestamp
            FROM milestone_checkins 
            WHERE application_id = ?
            ORDER BY checkin_timestamp DESC
        `, [applicationId]);

        return NextResponse.json({
            success: true,
            milestones
        });

    } catch (error: any) {
        console.error("[MilestoneCheckin] GET Error:", error.message);
        return NextResponse.json({ 
            error: error.message || "Failed to fetch milestones"
        }, { status: 500 });
    }
}
