import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const index = formData.get('index') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Get auth token from request headers
    const authHeader = request.headers.get('authorization');
    
    // Forward the file upload to the backend
    const backendFormData = new FormData();
    backendFormData.append('file', file);
    if (index) {
      backendFormData.append('index', index);
    }
    
    const uploadResponse = await fetch(`${API_BASE_URL}/api/upload/welcome-video`, {
      method: 'POST',
      headers: authHeader ? { 'Authorization': authHeader } : {},
      body: backendFormData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Backend upload failed:', errorText);
      return NextResponse.json({ 
        error: 'Upload to backend failed',
        details: errorText 
      }, { status: uploadResponse.status });
    }

    const result = await uploadResponse.json();

    return NextResponse.json({
      success: true,
      path: result.path || result.url || result.videoPath,
    });
  } catch (error) {
    console.error('Video upload error:', error);
    return NextResponse.json({ 
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
