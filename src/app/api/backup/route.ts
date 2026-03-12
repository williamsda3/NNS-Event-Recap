import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { createClient } from '@supabase/supabase-js';
import { ensureFolder, uploadFile, isGraphConfigured } from '@/lib/microsoft-graph';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST() {
  if (!isGraphConfigured()) {
    return NextResponse.json(
      { error: 'SharePoint is not configured. Add Azure/SharePoint env vars to enable backup.' },
      { status: 503 }
    );
  }

  try {
    // ── Fetch all data from Supabase ──────────────────────────────────────
    const [{ data: clients }, { data: projects }, { data: events }] = await Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: true }),
      supabase.from('projects').select('*').order('created_at', { ascending: true }),
      supabase.from('events').select('*').order('created_at', { ascending: true }),
    ]);

    // ── Build Excel workbook ──────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Event Recap Builder';
    workbook.created = new Date();

    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' },
    };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

    const addHeaderRow = (sheet: ExcelJS.Worksheet, columns: string[]) => {
      const row = sheet.addRow(columns);
      row.eachCell(cell => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      });
      row.height = 20;
    }

    // Sheet 1: Clients
    const clientSheet = workbook.addWorksheet('Clients');
    clientSheet.columns = [
      { header: '', key: 'id', width: 38 },
      { header: '', key: 'name', width: 30 },
      { header: '', key: 'library_name', width: 30 },
      { header: '', key: 'created_at', width: 28 },
    ];
    addHeaderRow(clientSheet, ['ID', 'Name', 'Library Name', 'Created At']);
    (clients || []).forEach(c => clientSheet.addRow([c.id, c.name, c.library_name, c.created_at]));

    // Sheet 2: Projects
    const projectSheet = workbook.addWorksheet('Projects');
    projectSheet.columns = [
      { header: '', key: 'id', width: 38 },
      { header: '', key: 'name', width: 30 },
      { header: '', key: 'client_id', width: 38 },
      { header: '', key: 'template_id', width: 28 },
      { header: '', key: 'date_range', width: 22 },
      { header: '', key: 'starred', width: 10 },
      { header: '', key: 'share_token', width: 38 },
      { header: '', key: 'notify_emails', width: 40 },
      { header: '', key: 'created_at', width: 28 },
      { header: '', key: 'updated_at', width: 28 },
    ];
    addHeaderRow(projectSheet, ['ID', 'Name', 'Client ID', 'Template ID', 'Date Range', 'Starred', 'Share Token', 'Notify Emails', 'Created At', 'Updated At']);
    (projects || []).forEach(p => projectSheet.addRow([
      p.id, p.name, p.client_id, p.template_id, p.date_range,
      p.starred ? 'Yes' : 'No', p.share_token,
      Array.isArray(p.notify_emails) ? p.notify_emails.join(', ') : '',
      p.created_at, p.updated_at,
    ]));

    // Sheet 3: Events
    const eventSheet = workbook.addWorksheet('Events');
    eventSheet.columns = [
      { header: '', key: 'id', width: 38 },
      { header: '', key: 'project_id', width: 38 },
      { header: '', key: 'event_name', width: 30 },
      { header: '', key: 'event_date', width: 28 },
      { header: '', key: 'status', width: 14 },
      { header: '', key: 'share_token', width: 38 },
      { header: '', key: 'edit_deadline', width: 28 },
      { header: '', key: 'responses', width: 80 },
      { header: '', key: 'created_at', width: 28 },
      { header: '', key: 'updated_at', width: 28 },
    ];
    addHeaderRow(eventSheet, ['ID', 'Project ID', 'Event Name', 'Event Date', 'Status', 'Share Token', 'Edit Deadline', 'Responses (JSON)', 'Created At', 'Updated At']);
    (events || []).forEach(e => eventSheet.addRow([
      e.id, e.project_id, e.event_name, e.event_date, e.status,
      e.share_token, e.edit_deadline,
      JSON.stringify(e.responses || {}),
      e.created_at, e.updated_at,
    ]));

    // Zebra stripe all sheets
    for (const sheet of [clientSheet, projectSheet, eventSheet]) {
      sheet.eachRow((row, rowNum) => {
        if (rowNum > 1 && rowNum % 2 === 0) {
          row.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          });
        }
      });
    }

    // ── Write buffer ──────────────────────────────────────────────────────
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);

    // ── Upload to SharePoint ──────────────────────────────────────────────
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `backup-${timestamp}.xlsx`;

    const folder = await ensureFolder('Backups');
    const uploaded = await uploadFile('Backups', fileName, buffer);

    return NextResponse.json({
      url: uploaded.webUrl,
      fileName,
      folderUrl: folder.webUrl,
      timestamp: now.toISOString(),
      counts: {
        clients: (clients || []).length,
        projects: (projects || []).length,
        events: (events || []).length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Backup failed';
    console.error('Backup error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
