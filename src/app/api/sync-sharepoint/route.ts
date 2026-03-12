import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateExcel } from '@/lib/excel';
import { ensureFolder, uploadFile, isGraphConfigured } from '@/lib/microsoft-graph';
import { sanitizeForPath } from '@/lib/sharepoint';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper to map snake_case rows to camelCase
function toCamel(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
      v,
    ])
  );
}

export async function POST(request: NextRequest) {
  // Silently skip if SharePoint not configured
  if (!isGraphConfigured()) {
    return NextResponse.json({ skipped: true });
  }

  try {
    const { projectId } = await request.json();
    if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });

    // Fetch project
    const { data: projRow } = await supabase.from('projects').select('*').eq('id', projectId).single();
    if (!projRow) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    const project = toCamel(projRow) as never;

    // Fetch client (for folder path)
    const { data: clientRow } = await supabase.from('clients').select('*').eq('id', projRow.client_id).single();
    const libraryName = clientRow?.library_name || 'Event Recap';

    // Fetch template
    const { data: tmplRow } = await supabase.from('templates').select('*').eq('id', projRow.template_id).single();
    if (!tmplRow) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    const template = toCamel(tmplRow) as never;

    // Fetch events
    const { data: eventRows } = await supabase.from('events').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
    const events = (eventRows || []).map(e => toCamel(e)) as never[];

    // Generate Excel
    const buffer = await generateExcel({ project, template, events });

    // Upload to SharePoint: {libraryName}/{projectName}/Event_Tracker.xlsx
    const folderPath = `${sanitizeForPath(libraryName)}/${sanitizeForPath(projRow.name)}`;
    await ensureFolder(folderPath);
    const uploaded = await uploadFile(folderPath, 'Event_Tracker.xlsx', Buffer.from(buffer));

    return NextResponse.json({ url: uploaded.webUrl });
  } catch (err) {
    console.error('sync-sharepoint error:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
