import { NextResponse } from 'next/server';
import dbPool from '@/app/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Keep track of connected clients
const connectedClients = new Set<any>();

// Function to broadcast updates to all connected clients
async function broadcastUpdate(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  
  for (const writer of connectedClients) {
    try {
      await writer.write(new TextEncoder().encode(message));
    } catch (error) {
      // Client disconnected, remove from set
      connectedClients.delete(writer);
    }
  }
}

// Poll database for changes every 2 seconds
setInterval(async () => {
  try {
    // Get latest statistics
    const [applications] = await dbPool.execute(`
      SELECT 
        status,
        current_stage,
        COUNT(*) as count,
        DATE(created_at) as date
      FROM applications 
      GROUP BY status, current_stage, DATE(created_at)
      ORDER BY date DESC
    `);

    const [recentActivity] = await dbPool.execute(`
      SELECT 
        a.application_id,
        a.status,
        a.current_stage,
        a.created_at,
        a.blockchain_itemId,
        nd.node_role
      FROM applications a
      LEFT JOIN node_documents nd ON a.application_id = nd.node_id
      ORDER BY a.created_at DESC
      LIMIT 5
    `);

    const updateData = {
      type: 'statistics_update',
      timestamp: new Date().toISOString(),
      data: {
        applications,
        recentActivity,
        totalApplications: (applications as any[]).reduce((sum, app: any) => sum + app.count, 0),
        pendingApplications: (applications as any[]).filter((app: any) => ['pending', 'submitted'].includes(app.status)).reduce((sum, app: any) => sum + app.count, 0),
        processedApplications: (applications as any[]).filter((app: any) => ['processed', 'transported', 'distributed', 'approved'].includes(app.status)).reduce((sum, app: any) => sum + app.count, 0),
      }
    };

    await broadcastUpdate(updateData);
  } catch (error) {
    console.error('Error broadcasting update:', error);
  }
}, 2000);

export async function GET() {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      const writer = encoder.encode.bind(encoder);
      connectedClients.add(controller);

      // Send initial data
      const initialData = {
        type: 'initial_connection',
        timestamp: new Date().toISOString(),
        message: 'Connected to real-time updates'
      };
      
      controller.enqueue(writer(`data: ${JSON.stringify(initialData)}\n\n`));

      // Set up heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(writer(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`));
        } catch (error) {
          clearInterval(heartbeat);
          connectedClients.delete(controller);
        }
      }, 30000); // Send heartbeat every 30 seconds
    },
    cancel() {
      // Clean up when stream is cancelled
      connectedClients.delete(this);
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}
