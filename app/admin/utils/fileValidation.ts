/**
 * File validation utilities for admin panel uploads
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];

export interface FileValidationError {
  valid: false;
  error: string;
}

export interface FileValidationSuccess {
  valid: true;
}

export type FileValidationResult = FileValidationError | FileValidationSuccess;

/**
 * Validate file size
 */
export function validateFileSize(file: File): FileValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 10MB limit. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`
    };
  }
  return { valid: true };
}

/**
 * Validate file type
 */
export function validateFileType(file: File): FileValidationResult {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_FILE_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`
    };
  }
  return { valid: true };
}

/**
 * Validate file extension
 */
export function validateFileExtension(file: File): FileValidationResult {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`
    };
  }
  return { valid: true };
}

/**
 * Comprehensive file validation
 */
export function validateFile(file: File): FileValidationResult {
  const sizeResult = validateFileSize(file);
  if (!sizeResult.valid) return sizeResult;

  const typeResult = validateFileType(file);
  if (!typeResult.valid) return typeResult;

  const extensionResult = validateFileExtension(file);
  if (!extensionResult.valid) return extensionResult;

  return { valid: true };
}

/**
 * Validate multiple files
 */
export function validateFiles(files: File[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  files.forEach((file, index) => {
    const result = validateFile(file);
    if (!result.valid) {
      errors.push(`File ${index + 1} (${file.name}): ${result.error}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
