import { NextRequest, NextResponse } from 'next/server';
import { generateExcel } from '@/lib/excel';
import { Project, FormTemplate, EventEntry } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project, template, events } = body as {
      project: Project;
      template: FormTemplate;
      events: EventEntry[];
    };

    if (!project || !template || !events) {
      return NextResponse.json(
        { error: 'Missing project, template, or events data' },
        { status: 400 }
      );
    }

    const buffer = await generateExcel({ project, template, events });
    const uint8Array = new Uint8Array(buffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, '_')}_Event_Tracker.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate Excel file' },
      { status: 500 }
    );
  }
}
