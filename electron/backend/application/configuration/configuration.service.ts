import type { AppDataRepository } from '@backend/contracts/app-data.repository';

export class ConfigurationService {
  constructor(private readonly appDataRepository: AppDataRepository) {}

  isConfigured(): Promise<boolean> {
    return this.appDataRepository.exists();
  }
}
