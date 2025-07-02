// lib/fileUpload.ts
import fs from 'fs/promises';
import path from 'path';
import { Buffer } from 'buffer';

const CWD = (typeof process !== 'undefined' && typeof (process as any).cwd === 'function') ? (process as any).cwd() : '.'; 

export const UPLOAD_DIR_BASE = path.join(CWD, 'public', 'uploads');

export interface UploadedFile {
  fileName: string; 
  filePath: string; 
  publicUrl: string; 
  mimeType: string;
  size: number;
}

export async function handleFileUpload(
  file: File,
  entityType: string, 
  entityId?: string 
): Promise<UploadedFile> {
  if (!file) {
    throw new Error('No file provided.');
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'image/webp']; 
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Allowed: ${allowedTypes.join(', ')}`);
  }
  if (file.size > maxSize) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max: ${maxSize / 1024 / 1024}MB`);
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const sanitizedOriginalName = file.name.replace(/[^a-z0-9_.-]/gi, '_');
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E6)}`;
  const fileExtension = path.extname(sanitizedOriginalName) || `.${file.type.split('/')[1]}`; 
  const baseFileName = path.basename(sanitizedOriginalName, fileExtension);
  const newFileName = `${baseFileName}-${uniqueSuffix}${fileExtension}`;
  
  const entitySpecificDir = entityId ? path.join(entityType, entityId) : entityType;
  const fullUploadDir = path.join(UPLOAD_DIR_BASE, entitySpecificDir);
  
  await fs.mkdir(fullUploadDir, { recursive: true });
  
  const filePathOnDisk = path.join(fullUploadDir, newFileName);
  await fs.writeFile(filePathOnDisk, buffer);

  const relativeFilePath = path.join(entitySpecificDir, newFileName);
  const publicUrl = `/uploads/${relativeFilePath.replace(/\\/g, '/')}`; 

  return {
    fileName: file.name, // Keep original file name for reference if needed by UI
    filePath: relativeFilePath, // Path relative to UPLOAD_DIR_BASE for DB storage
    publicUrl, // URL for client access
    mimeType: file.type,
    size: file.size,
  };
}

/**
 * Deletes an uploaded file and attempts to remove its containing directory
 * if the directory becomes empty. Also tries to remove the parent entity-specific
 * directory if that also becomes empty.
 * @param relativeFilePath Path of the file relative to UPLOAD_DIR_BASE.
 */
export async function deleteUploadedFileByRelativePath(relativeFilePath: string): Promise<void> {
  try {
    const fullPath = path.join(UPLOAD_DIR_BASE, relativeFilePath);
    await fs.unlink(fullPath);
    console.log(`Deleted file: ${fullPath}`);

    // Attempt to remove the immediate directory if empty
    const dirPath = path.dirname(fullPath);
    const filesInDir = await fs.readdir(dirPath);
    if (filesInDir.length === 0) {
      await fs.rmdir(dirPath);
      console.log(`Removed empty directory: ${dirPath}`);
      
      // Attempt to remove the parent (entity-specific) directory if it's also empty
      // and it's not one of the base entity type directories (e.g. /uploads/invoices)
      const parentDirPath = path.dirname(dirPath);
      // List of base directories that should not be removed even if empty (e.g. /uploads/invoices)
      const baseEntityTypeDirs = ['cage_audits', 'invoices', 'duc_reports', 'waves', 'scan_logs', 'lost_prevention_reports']; // Add other base entity types
      
      // Check if parentDirPath is not the UPLOAD_DIR_BASE itself and not one of the direct base entity folders
      if (parentDirPath !== UPLOAD_DIR_BASE && !baseEntityTypeDirs.includes(path.basename(parentDirPath))) {
        const filesInParentDir = await fs.readdir(parentDirPath);
        if (filesInParentDir.length === 0) {
          await fs.rmdir(parentDirPath);
          console.log(`Removed empty parent directory: ${parentDirPath}`);
        }
      }
    }

  } catch (error: any) {
    if (error.code === 'ENOENT') {
        // File already deleted or path incorrect, log warning but don't throw
        console.warn(`File not found, cannot delete: ${relativeFilePath}`);
    } else {
        // Other errors, log and potentially re-throw or handle as needed
        console.error(`Error deleting file ${relativeFilePath}:`, error);
    }
  }
}