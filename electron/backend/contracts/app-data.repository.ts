export interface AppDataRepository {
  exists(): Promise<boolean>;
}
