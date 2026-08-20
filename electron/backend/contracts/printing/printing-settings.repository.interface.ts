import type PrintingSettings from '@desktop-contracts/printing/printing-settings.interface';

export default interface PrintingSettingsRepository {
  load(): Promise<PrintingSettings>;

  save(settings: PrintingSettings): Promise<void>;
}
