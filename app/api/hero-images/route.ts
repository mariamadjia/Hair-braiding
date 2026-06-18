import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const heroDirectory = path.join(process.cwd(), 'public', 'hero');
    const files = fs.readdirSync(heroDirectory);
    
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
    );
    
    const imagePaths = imageFiles.map(file => `/hero/${file}`);
    
    return NextResponse.json({ images: imagePaths });
  } catch (error) {
    console.error('Error reading hero images:', error);
    return NextResponse.json({ images: [] }, { status: 500 });
  }
}
