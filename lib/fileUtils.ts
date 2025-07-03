// lib/fileUtils.ts
import fs from 'fs/promises';
import path from 'path';

export async function deleteUploadedFileByRelativePath(relativePath: string): Promise<void> {
  try {
    const fullPath = path.join(process.cwd(), 'public/uploads', relativePath);
    await fs.unlink(fullPath);
    console.log(`Deleted file: ${relativePath}`);
  } catch (error) {
    console.error(`Error deleting file ${relativePath}:`, error);
    // Don't throw - file might not exist, which is fine
  }
}

export async function handleFileUpload(
  file: File, 
  folder: string, 
  identifier: string
): Promise<{ 
  publicUrl: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
}> {
  if (!file) {
    throw new Error('No file provided');
  }

  // Validate file type (adjust as needed)
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF files are allowed.');
  }

  // Validate file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 5MB.');
  }

  // Create filename
  const fileExtension = path.extname(file.name);
  const timestamp = Date.now();
  const filename = `${identifier}_${timestamp}${fileExtension}`;
  
  // Create directory if it doesn't exist
  const uploadDir = path.join(process.cwd(), 'public/uploads', folder);
  await fs.mkdir(uploadDir, { recursive: true });
  
  // Save file
  const filePath = path.join(uploadDir, filename);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(filePath, buffer);
  
  // Return all required properties
  const publicUrl = `/uploads/${folder}/${filename}`;
  return { 
    publicUrl,
    fileName: filename,
    filePath: filePath,
    mimeType: file.type,
    size: file.size
  };
}