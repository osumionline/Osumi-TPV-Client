import type { AppDataRepository } from '@backend/contracts/app-data.repository';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';

export class JsonAppDataRepository implements AppDataRepository {
  constructor(private readonly filePath: string) {}

  async exists(): Promise<boolean> {
    try {
      await access(this.filePath, constants.F_OK);

      return true;
    } catch {
      return false;
    }
  }
}
