export interface IStorageService {
  /**
   * Persists a file and returns its public URL.
   */
  saveFile(file: Express.Multer.File): Promise<string>;

  /**
   * Removes a previously saved file by its public URL.
   */
  deleteFile(url: string): Promise<void>;
}

export const STORAGE_SERVICE = Symbol('IStorageService');
