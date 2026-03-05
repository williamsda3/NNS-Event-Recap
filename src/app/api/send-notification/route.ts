import { NextRequest, NextResponse } from 'next/server';
import { isEmailConfigured, sendEmail } from '@/lib/microsoft-graph';
import { FormField } from '@/types';

export async function POST(request: NextRequest) {
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: 'Email notifications are not configured' },
      { status: 503 }
    );
  }

  try {
    const { projectName, eventName, eventDate, responses, emails, templateFields } = await request.json() as {
      projectName: string;
      eventName: string;
      eventDate: string;
      responses: Record<string, string | number>;
      emails: string[];
      templateFields: FormField[];
    };

    if (!emails?.length) {
      return NextResponse.json({ error: 'No recipient emails provided' }, { status: 400 });
    }

    // Build HTML email with event recap preview
    const metricRows = templateFields
      .filter(f => f.type === 'number' && responses[f.id] !== undefined)
      .map(f => `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;">${f.label}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;">${responses[f.id]}</td></tr>`)
      .join('');

    const commentRows = templateFields
      .filter(f => f.type === 'longtext' && responses[f.id])
      .map(f => `<div style="margin-bottom:12px;"><strong style="color:#666;">${f.label}:</strong><p style="margin:4px 0 0;white-space:pre-wrap;">${responses[f.id]}</p></div>`)
      .join('');

    const photoUrl = responses['photo_album'] as string;

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#4f46e5;color:white;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h2 style="margin:0;font-size:18px;">New Event Recap Submitted</h2>
          <p style="margin:4px 0 0;opacity:0.9;font-size:14px;">${projectName}</p>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px;">
          <div style="margin-bottom:20px;">
            <h3 style="margin:0 0 4px;color:#111;">${eventName}</h3>
            <p style="margin:0;color:#666;font-size:14px;">${eventDate}</p>
          </div>
          ${metricRows ? `
            <h4 style="margin:0 0 8px;color:#333;font-size:14px;">Metrics</h4>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
              ${metricRows}
            </table>
          ` : ''}
          ${photoUrl ? `
            <p style="margin:0 0 16px;"><a href="${photoUrl}" style="color:#4f46e5;text-decoration:none;">View Photo Album</a></p>
          ` : ''}
          ${commentRows ? `
            <h4 style="margin:0 0 8px;color:#333;font-size:14px;">Comments</h4>
            ${commentRows}
          ` : ''}
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
          <p style="margin:0;font-size:12px;color:#999;">This is an automated notification from Event Recap Builder.</p>
        </div>
      </div>
    `;

    await sendEmail(
      emails,
      `Event Recap: ${eventName} — ${projectName}`,
      html
    );

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error('Send notification error:', err);
    const message = err instanceof Error ? err.message : 'Failed to send email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
