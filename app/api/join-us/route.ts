import { NextRequest, NextResponse } from 'next/server';
import nodemailer, { type Transporter } from 'nodemailer';

export const runtime = 'nodejs';

const MAX_FILES = 3;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

declare global {
  // eslint-disable-next-line no-var
  var applicationTransporter: Transporter | undefined;
}

function transporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !port || !user || !pass) throw new Error('Application email delivery is not configured.');
  if (!globalThis.applicationTransporter) {
    globalThis.applicationTransporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
    });
  }
  return globalThis.applicationTransporter;
}

const value = (form: FormData, key: string, max = 300) =>
  String(form.get(key) || '').trim().slice(0, max);

const escapeHtml = (input: string) =>
  input.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] || character);

const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    if (value(form, 'website')) return NextResponse.json({ success: true });

    const application = {
      firstName: value(form, 'firstName', 80),
      lastName: value(form, 'lastName', 80),
      email: value(form, 'email', 160),
      phone: value(form, 'phone', 30),
      yearsOfExperience: value(form, 'yearsOfExperience', 40),
      specialties: value(form, 'specialties', 300),
      availability: value(form, 'availability', 80),
      portfolio: value(form, 'portfolio', 300),
    };

    if (!application.firstName || !application.lastName || !application.email || !application.phone || !application.yearsOfExperience || !application.specialties || !application.availability) {
      return NextResponse.json({ error: 'Please complete every required field.' }, { status: 400 });
    }
    if (!validEmail(application.email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }

    const photos = form.getAll('photos').filter((item): item is File => item instanceof File && item.size > 0);
    if (photos.length > MAX_FILES) return NextResponse.json({ error: `Upload no more than ${MAX_FILES} photos.` }, { status: 400 });
    if (photos.some((photo) => !ACCEPTED_TYPES.has(photo.type))) return NextResponse.json({ error: 'Use JPG, PNG, or WebP photos only.' }, { status: 400 });
    if (photos.some((photo) => photo.size > MAX_FILE_BYTES)) return NextResponse.json({ error: 'Each photo must be 2 MB or smaller.' }, { status: 400 });
    if (photos.reduce((total, photo) => total + photo.size, 0) > MAX_TOTAL_BYTES) return NextResponse.json({ error: 'All photos together must be 4 MB or smaller.' }, { status: 400 });

    const attachments = await Promise.all(photos.map(async (photo, index) => ({
      filename: `portfolio-${index + 1}-${photo.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
      content: Buffer.from(await photo.arrayBuffer()),
      contentType: photo.type,
      cid: `portfolio-photo-${index + 1}@ahbraiding`,
      contentDisposition: 'inline' as const,
    })));

    const fullName = `${application.firstName} ${application.lastName}`;
    const recipient = process.env.APPLICATION_RECIPIENT_EMAIL || process.env.CONTACT_RECIPIENT_EMAIL || 'adjiashairbraiding@gmail.com';
    const fromAddress = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    await transporter().sendMail({
      from: { name: 'AH Braiding Careers', address: fromAddress! },
      replyTo: { name: fullName, address: application.email },
      to: recipient,
      subject: `Braider application — ${fullName}`,
      text: [
        `Applicant: ${fullName}`,
        `Email: ${application.email}`,
        `Phone: ${application.phone}`,
        `Experience: ${application.yearsOfExperience}`,
        `Specialties: ${application.specialties}`,
        `Availability: ${application.availability}`,
        `Portfolio: ${application.portfolio || 'Not provided'}`,
        `Photos attached: ${attachments.length}`,
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#2C1810">
          <h1 style="font-family:Georgia,serif;font-weight:normal">New Braider Application</h1>
          <table style="width:100%;border-collapse:collapse">
            ${Object.entries({
              Applicant: fullName,
              Email: application.email,
              Phone: application.phone,
              Experience: application.yearsOfExperience,
              Specialties: application.specialties,
              Availability: application.availability,
              Portfolio: application.portfolio || 'Not provided',
              'Photos attached': String(attachments.length),
            }).map(([label, content]) => `<tr><th style="padding:10px;border-bottom:1px solid #eadfd5;text-align:left;vertical-align:top">${escapeHtml(label)}</th><td style="padding:10px;border-bottom:1px solid #eadfd5">${escapeHtml(content)}</td></tr>`).join('')}
          </table>
          ${attachments.length ? `
            <div style="margin-top:24px">
              <h2 style="font-family:Georgia,serif;font-weight:normal;font-size:22px;margin:0 0 12px">Uploaded work photos</h2>
              ${attachments.map((attachment, index) => `
                <div style="margin:0 0 16px">
                  <p style="margin:0 0 6px;font-size:12px;color:#777">Photo ${index + 1}: ${escapeHtml(attachment.filename)}</p>
                  <img src="cid:${attachment.cid}" alt="${escapeHtml(fullName)} portfolio photo ${index + 1}" style="display:block;max-width:100%;height:auto;border-radius:8px;border:1px solid #eadfd5" />
                </div>`).join('')}
            </div>` : '<p style="margin-top:20px;color:#777">No work photos were uploaded.</p>'}
          <p style="color:#777;font-size:12px">Reply to this email to contact the applicant.</p>
        </div>`,
      attachments,
    });

    return NextResponse.json({ success: true, message: 'Application delivered.', photosDelivered: attachments.length });
  } catch (error) {
    console.error('Failed to deliver braider application:', error);
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'production' ? 'Your application could not be delivered. Please try again later.' : error instanceof Error ? error.message : 'Application delivery failed.' },
      { status: 500 },
    );
  }
}
