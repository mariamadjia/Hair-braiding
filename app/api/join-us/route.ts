import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const yearsOfExperience = formData.get('yearsOfExperience') as string;
    const photos = formData.getAll('photos') as File[];

    if (!firstName || !lastName || !yearsOfExperience) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'applications');
    await mkdir(uploadDir, { recursive: true });

    const photoUrls: string[] = [];
    
    if (photos && photos.length > 0) {
      for (const photo of photos) {
        if (photo instanceof File && photo.size > 0) {
          const bytes = await photo.arrayBuffer();
          const buffer = Buffer.from(bytes);
          
          const timestamp = Date.now();
          const sanitizedFileName = photo.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const fileName = `${timestamp}_${sanitizedFileName}`;
          const filePath = path.join(uploadDir, fileName);
          
          await writeFile(filePath, buffer);
          photoUrls.push(`/uploads/applications/${fileName}`);
        }
      }
    }

    const applicationData = {
      firstName,
      lastName,
      yearsOfExperience,
      photos: photoUrls,
      submittedAt: new Date().toISOString(),
    };

    console.log('New braider application received:', applicationData);

    return NextResponse.json(
      { 
        message: 'Application submitted successfully',
        data: applicationData 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing application:', error);
    return NextResponse.json(
      { error: 'Failed to process application' },
      { status: 500 }
    );
  }
}
