import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IStorageService } from './storage.interface';

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadsDir: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.uploadsDir = this.config.get<string>('UPLOADS_DIR', './uploads');
    const port = this.config.get<number>('PORT', 3001);
    this.baseUrl = `http://localhost:${port}`;
  }

  async saveFile(file: Express.Multer.File): Promise<string> {
    // Multer disk storage already wrote the file; just return the public URL.
    const relativePath = path.relative(
      path.resolve(this.uploadsDir),
      file.path,
    );
    return `${this.baseUrl}/uploads/${relativePath.replace(/\\/g, '/')}`;
  }

  async deleteFile(url: string): Promise<void> {
    try {
      const urlPath = new URL(url).pathname; // e.g. /uploads/filename.jpg
      const filePath = path.join(
        path.resolve(this.uploadsDir),
        urlPath.replace(/^\/uploads\//, ''),
      );
      await fs.unlink(filePath);
    } catch (err) {
      this.logger.warn(`No se pudo eliminar el archivo: ${url}`, err);
    }
  }
}
