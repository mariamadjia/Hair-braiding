/**
 * Image compression utilities for admin panel uploads
 */
import { normalizeImageForUpload } from "@/lib/utils/imageUpload";

export interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'image/jpeg' | 'image/png' | 'image/webp';
}

const DEFAULT_OPTIONS: CompressionOptions = {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.85,
    format: 'image/webp'
};

/**
 * Compress an image file before upload
 */
export async function compressImage(
    file: File,
    options: CompressionOptions = DEFAULT_OPTIONS
): Promise<File> {
    const normalizedFile = await normalizeImageForUpload(file);
    file = normalizedFile;

    const {
        maxWidth = 1920,
        maxHeight = 1920,
        quality = 0.85,
        format = 'image/webp'
    } = options;

    // Skip compression for very small files
    if (file.size < 100 * 1024) { // Less than 100KB
        return file;
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
        }

        img.onload = () => {
            let { width, height } = img;

            // Calculate new dimensions while maintaining aspect ratio
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            canvas.width = width;
            canvas.height = height;

            // Draw image on canvas
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to blob with compression
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Failed to compress image'));
                        return;
                    }

                    // Create new File from compressed blob
                    const compressedFile = new File(
                        [blob],
                        file.name.replace(/\.[^/.]+$/, '.webp'),
                        { type: format }
                    );

                    // Only use compressed version if it's actually smaller
                    if (compressedFile.size < file.size) {
                        resolve(compressedFile);
                    } else {
                        resolve(file);
                    }
                },
                format,
                quality
            );
        };

        img.onerror = () => {
            reject(new Error('Failed to load image for compression'));
        };

        // Load image from file
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };
        reader.onerror = () => {
            reject(new Error('Failed to read file for compression'));
        };
        reader.readAsDataURL(file);
    });
}

/**
 * Compress multiple images
 */
export async function compressImages(
    files: File[],
    options?: CompressionOptions
): Promise<File[]> {
    return Promise.all(
        files.map(file => compressImage(file, options))
    );
}

/**
 * Get image dimensions without loading the full image
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
            reject(new Error('Failed to get image dimensions'));
        };
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
}
