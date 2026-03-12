import { NextResponse } from "next/server";
import { getContract, ADMIN_KEY, Stage } from "@/app/lib/blockchain";
import dbPool from "@/app/lib/db";

interface TransportSubmission {
  itemId: number;
  CID: string;
  dbId?: string;
  currentLocation?: {
    lat: number;
    lng: number;
  };
  lastHub?: string;
  roadCondition?: "Blacktopped" | "Gravel" | "Landslide Risk";
  terrain?: "Urban" | "Highway" | "Rural" | "Hill";
}

export async function POST(request: Request) {
    try {
        const body: TransportSubmission = await request.json();
        const { itemId, CID, dbId, currentLocation, lastHub, roadCondition, terrain } = body;

        if (itemId === undefined || CID === undefined) {
            return NextResponse.json({ error: "Missing itemId or CID" }, { status: 400 });
        }

        console.log(`[TransporterSubmit] Processing: itemId=${itemId}, CID=${CID}, dbId=${dbId}`);
        console.log(`[TransporterSubmit] Location data:`, { currentLocation, lastHub, roadCondition, terrain });

        const contract = getContract(ADMIN_KEY);
        let receipt;

        try {
            const tx = await contract.transporterSubmit(itemId, CID);
            receipt = await tx.wait();
            console.log(`[TransporterSubmit] Success: ${receipt.hash}`);
        } catch (contractError: any) {
            console.error("[TransporterSubmit] Contract error:", contractError.message);
            throw new Error(`Blockchain submission failed: ${contractError.message}`);
        }

        // Enhanced Database Sync with geospatial data
        if (dbId) {
            try {
                // Update applications table with stage and status
                await dbPool.execute(
                    "UPDATE applications SET current_stage = ?, status = 'transporter_submitted' WHERE blockchain_itemId = ?",
                    [Stage.TransporterReady, itemId]
                );

                // Insert or update transport tracking data
                if (currentLocation || lastHub || roadCondition || terrain) {
                    await dbPool.execute(`
                        INSERT INTO transport_tracking (
                            application_id, 
                            current_lat, 
                            current_lng, 
                            last_hub, 
                            road_condition, 
                            terrain, 
                            updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
                        ON DUPLICATE KEY UPDATE
                        current_lat = VALUES(current_lat),
                        current_lng = VALUES(current_lng),
                        last_hub = VALUES(last_hub),
                        road_condition = VALUES(road_condition),
                        terrain = VALUES(terrain),
                        updated_at = VALUES(updated_at)
                    `, [
                        dbId,
                        currentLocation?.lat || null,
                        currentLocation?.lng || null,
                        lastHub || null,
                        roadCondition || null,
                        terrain || null
                    ]);
                }

                console.log("[TransporterSubmit] Database updated with geospatial data");
            } catch (dbError: any) {
                console.error("[TransporterSubmit] Database error:", dbError.message);
                // Continue even if database fails
            }
        }

        return NextResponse.json({
            success: true,
            transactionHash: receipt.hash,
            newStage: Stage.TransporterReady,
            locationData: {
                currentLocation,
                lastHub,
                roadCondition,
                terrain
            }
        });

    } catch (error: any) {
        console.error("[TransporterSubmit] Error:", error.message);
        return NextResponse.json({ 
            error: error.message || "Transporter submission failed"
        }, { status: 500 });
    }
}
