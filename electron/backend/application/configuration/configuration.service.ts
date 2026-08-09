import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type AppData from '@desktop-contracts/configuration/app-data.interface';

export default class ConfigurationService {
  constructor(private readonly appDataRepository: AppDataRepository) {}

  async isConfigured(): Promise<boolean> {
    const appData: AppData | null = await this.appDataRepository.load();

    return appData !== null;
  }

  load(): Promise<AppData | null> {
    return this.appDataRepository.load();
  }
}
