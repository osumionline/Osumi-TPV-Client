import type AppData from '@desktop-contracts/configuration/app-data.interface';

export default interface AppDataRepository {
  exists(): Promise<boolean>;
  load(): Promise<AppData | null>;
  save(appData: AppData): Promise<void>;
  delete(): Promise<void>;
}
