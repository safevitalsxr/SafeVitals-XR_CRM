import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class StorageService {
  private supabase: SupabaseClient | null = null;
  private readonly logger = new Logger(StorageService.name);

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });
    } else {
      this.logger.warn('Supabase URL or Service Role Key not configured. Storage uploads will be disabled.');
    }
  }

  sanitizeFilename(originalName: string): string {
    const cleanName = originalName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.'); // Prevent directory traversal
    return cleanName || 'attachment';
  }

  validateFile(file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Empty or invalid file payload');
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(`File "${file.originalname}" exceeds maximum allowed size of 10MB`);
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`File type "${file.mimetype}" is not permitted. Allowed types: PDF, PNG, JPEG, WEBP`);
    }
  }

  async uploadFile(bucket: string, path: string, fileBuffer: Buffer, contentType: string) {
    if (!this.supabase) {
      throw new Error('Supabase Storage is not configured on this server');
    }

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      this.logger.error(`Storage upload failed: ${error.message}`);
      throw error;
    }

    // Generate signed URL (expires in 1 hour) instead of exposing public URL
    const { data: signedData, error: signError } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600);

    if (signError || !signedData?.signedUrl) {
      this.logger.error(`Storage signed URL generation failed for "${path}": ${signError?.message || 'No URL returned'}`);
      throw new Error(`Failed to generate secure signed URL for ${path}`);
    }

    return { path: data.path, publicUrl: signedData.signedUrl };
  }

  async deleteFile(bucket: string, path: string) {
    if (!this.supabase) return false;

    try {
      const { error } = await this.supabase.storage.from(bucket).remove([path]);
      if (error) {
        this.logger.warn(`Storage delete error for path "${path}": ${error.message}`);
        return false;
      }
      return true;
    } catch (err: any) {
      this.logger.warn(`Storage delete failed for path "${path}": ${err.message}`);
      return false;
    }
  }
}

