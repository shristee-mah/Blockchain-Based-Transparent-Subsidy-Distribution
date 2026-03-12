import { NextResponse } from 'next/server';
import dbPool from '@/app/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const status = searchParams.get('status');
    const role = searchParams.get('role');
    const dateRange = searchParams.get('dateRange');

    // Build dynamic query based on filters
    let query = `
      SELECT 
        a.application_id,
        a.status,
        a.current_stage,
        a.created_at,
        a.blockchain_itemId,
        u.name,
        u.email,
        u.phone,
        nd.node_role,
        COUNT(nd.id) as document_count,
        GROUP_CONCAT(nd.document_type) as document_types
      FROM applications a
      LEFT JOIN users u ON a.user_id = u.user_id
      LEFT JOIN node_documents nd ON a.application_id = nd.node_id
    `;

    const conditions = [];
    const params: any[] = [];

    if (status && status !== 'all') {
      conditions.push('a.status = ?');
      params.push(status);
    }

    if (role && role !== 'all') {
      conditions.push('nd.node_role = ?');
      params.push(role);
    }

    if (dateRange && dateRange !== 'all') {
      const today = new Date();
      let startDate: Date;
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          break;
        case 'week':
          startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }
      
      conditions.push('a.created_at >= ?');
      params.push(startDate.toISOString().split('T')[0]);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += `
      GROUP BY a.application_id
      ORDER BY a.created_at DESC
    `;

    const [rows] = await dbPool.execute(query, params);

    if (format === 'csv') {
      // Convert to CSV
      const csvHeaders = [
        'Application ID', 'Status', 'Current Stage', 'Created At', 
        'Blockchain ID', 'Name', 'Email', 'Phone', 'Role', 
        'Document Count', 'Document Types'
      ];
      
      const csvRows = (rows as any[]).map(row => [
        row.application_id,
        row.status,
        row.current_stage,
        new Date(row.created_at).toLocaleString(),
        row.blockchain_itemId || 'N/A',
        row.name || 'N/A',
        row.email || 'N/A',
        row.phone || 'N/A',
        row.node_role || 'N/A',
        row.document_count,
        row.document_types || 'N/A'
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="subsidy_data_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // Default JSON format
    return NextResponse.json({
      data: rows,
      exportedAt: new Date().toISOString(),
      totalRecords: (rows as any[]).length,
      filters: { format, status, role, dateRange }
    });

  } catch (error) {
    console.error('Export API Error:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
