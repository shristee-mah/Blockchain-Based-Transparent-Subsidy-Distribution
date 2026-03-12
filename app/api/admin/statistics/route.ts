import { NextResponse } from 'next/server';
import dbPool from '@/app/lib/db';
import cache from '@/app/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Data validation helper
function validateDatabaseData(data: any): boolean {
  if (!Array.isArray(data)) return false;
  return data.every(item => 
    typeof item === 'object' && 
    item !== null &&
    (typeof item.count === 'number' || typeof item.count === 'string')
  );
}

// Safe number conversion
function safeNumber(value: any, defaultValue: number = 0): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

export async function GET() {
  const cacheKey = 'admin_statistics';
  
  try {
    // Try to get from cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log('[Statistics] Serving from cache');
      return NextResponse.json({
        ...cachedData,
        fromCache: true,
        cacheStats: cache.getStats()
      });
    }

    console.log('[Statistics] Fetching fresh data from database');

    // Get comprehensive statistics from database with error handling
    let applications: any[] = [];
    let roleStats: any[] = [];
    let recentActivity: any[] = [];
    let stageDistribution: any[] = [];

    try {
      const [appResult] = await dbPool.execute(`
        SELECT 
          status,
          current_stage,
          COUNT(*) as count,
          DATE(created_at) as date
        FROM applications 
        GROUP BY status, current_stage, DATE(created_at)
        ORDER BY date DESC
      `);
      
      if (validateDatabaseData(appResult)) {
        applications = appResult as any[];
      }
    } catch (dbError) {
      console.error('Database query error for applications:', dbError);
      applications = [];
    }

    try {
      const [roleResult] = await dbPool.execute(`
        SELECT 
          node_role,
          COUNT(*) as document_count,
          COUNT(DISTINCT node_id) as unique_nodes
        FROM node_documents 
        GROUP BY node_role
      `);
      
      if (validateDatabaseData(roleResult)) {
        roleStats = roleResult as any[];
      }
    } catch (dbError) {
      console.error('Database query error for role stats:', dbError);
      roleStats = [];
    }

    try {
      const [activityResult] = await dbPool.execute(`
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
        LIMIT 10
      `);
      
      recentActivity = activityResult as any[];
    } catch (dbError) {
      console.error('Database query error for recent activity:', dbError);
      recentActivity = [];
    }

    try {
      const [stageResult] = await dbPool.execute(`
        SELECT 
          current_stage,
          COUNT(*) as count,
          status
        FROM applications 
        GROUP BY current_stage, status
        ORDER BY current_stage
      `);
      
      if (validateDatabaseData(stageResult)) {
        stageDistribution = stageResult as any[];
      }
    } catch (dbError) {
      console.error('Database query error for stage distribution:', dbError);
      stageDistribution = [];
    }

    // Calculate overall metrics with safe calculations
    const totalApplications = applications.reduce((sum, app) => sum + safeNumber(app.count), 0);
    const pendingApplications = applications
      .filter((app) => ['pending', 'submitted'].includes(app.status))
      .reduce((sum, app) => sum + safeNumber(app.count), 0);
    const processedApplications = applications
      .filter((app) => ['processed', 'transported', 'distributed', 'approved'].includes(app.status))
      .reduce((sum, app) => sum + safeNumber(app.count), 0);
    const blockchainSynced = applications
      .filter((app) => app.blockchain_itemId !== null)
      .reduce((sum, app) => sum + safeNumber(app.count), 0);

    const statistics = {
      overview: {
        totalApplications,
        pendingApplications,
        processedApplications,
        blockchainSynced,
        approvalRate: totalApplications > 0 ? ((processedApplications / totalApplications) * 100).toFixed(1) : '0',
        blockchainSyncRate: totalApplications > 0 ? ((blockchainSynced / totalApplications) * 100).toFixed(1) : '0'
      },
      roleStatistics: roleStats.map(role => ({
        ...role,
        document_count: safeNumber(role.document_count),
        unique_nodes: safeNumber(role.unique_nodes)
      })),
      stageDistribution: stageDistribution.map(stage => ({
        ...stage,
        count: safeNumber(stage.count),
        current_stage: safeNumber(stage.current_stage)
      })),
      recentActivity: recentActivity.map(activity => ({
        ...activity,
        application_id: safeNumber(activity.application_id),
        current_stage: safeNumber(activity.current_stage),
        blockchain_itemId: activity.blockchain_itemId ? safeNumber(activity.blockchain_itemId) : null
      })),
      timelineData: applications.map(app => ({
        ...app,
        count: safeNumber(app.count),
        current_stage: safeNumber(app.current_stage)
      })),
      lastUpdated: new Date().toISOString(),
      dataValidation: {
        totalRecords: applications.length,
        hasErrors: applications.length === 0,
        lastChecked: new Date().toISOString()
      },
      fromCache: false,
      cacheStats: cache.getStats()
    };

    // Cache the result for 30 seconds
    cache.set(cacheKey, statistics, 30000);

    return NextResponse.json(statistics);
  } catch (error) {
    console.error('Statistics API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch statistics',
      fallback: {
        overview: {
          totalApplications: 0,
          pendingApplications: 0,
          processedApplications: 0,
          blockchainSynced: 0,
          approvalRate: '0',
          blockchainSyncRate: '0'
        },
        roleStatistics: [],
        stageDistribution: [],
        recentActivity: [],
        timelineData: [],
        lastUpdated: new Date().toISOString(),
        dataValidation: {
          totalRecords: 0,
          hasErrors: true,
          lastChecked: new Date().toISOString()
        },
        fromCache: false,
        cacheStats: cache.getStats()
      }
    }, { status: 500 });
  }
}
