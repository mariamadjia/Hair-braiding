import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const index = formData.get('index') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const welcomeDir = path.join(process.cwd(), 'public', 'welcome');
    await mkdir(welcomeDir, { recursive: true });

    const ext = path.extname(file.name);
    const filename = `video${index}${ext}`;
    const filepath = path.join(welcomeDir, filename);

    await writeFile(filepath, buffer);

    return NextResponse.json({
      success: true,
      path: `/welcome/${filename}`,
    });
  } catch (error) {
    console.error('Video upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
