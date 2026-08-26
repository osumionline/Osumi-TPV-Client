import type LegacyImportPackageConfigurationReader from '@backend/contracts/legacy-import/legacy-import-package-configuration-reader.interface';
import type LegacyImportFileInventoryItem from '@backend/domain/legacy-import/legacy-import-file-inventory-item.interface';
import type LegacyImportPackageConfiguration from '@backend/domain/legacy-import/legacy-import-package-configuration.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type EmailSmtpConfig from '@desktop-contracts/configuration/email-smtp-config.interface';
import type {
  InstallationLogoData,
  InstallationSecretsData,
} from '@desktop-contracts/configuration/installation-command.interface';
import type TicketBaiConfig from '@desktop-contracts/configuration/ticket-bai-config.interface';
import {
  DEFAULT_TICKET_EMAIL_BODY_TEMPLATE,
  DEFAULT_TICKET_EMAIL_SUBJECT_TEMPLATE,
} from '@desktop-contracts/configuration/ticket-email-config.interface';
import type TipoIva from '@desktop-contracts/tipo-iva.type';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { basename, isAbsolute } from 'node:path';
import type { Readable } from 'node:stream';
import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Entry, Options, ZipFile } from 'yauzl';
import { open } from 'yauzl';

const APP_DATA_ENTRY_NAME: string = 'app_data.json';
const PLUGIN_CONFIG_ENTRY_NAME: string = 'plugin_config.json';

const LOGO_LOGICAL_CATEGORY: string = 'logo';

const MAXIMUM_APP_DATA_SIZE: number = 1024 * 1024;
const MAXIMUM_PLUGIN_CONFIG_SIZE: number = 1024 * 1024;

const MAXIMUM_LOGO_SIZE: number = 5 * 1024 * 1024;

interface LegacyPluginConfiguration {
  readonly emailSmtp: EmailSmtpConfig | null;
  readonly emailSmtpPass: string | null;
  readonly ticketBai: TicketBaiConfig | null;
  readonly ticketBaiToken: string | null;
}

export default class YauzlLegacyImportPackageConfigurationReader implements LegacyImportPackageConfigurationReader {
  async read(
    packagePath: string,
    expectedPackageHash: string,
    fileInventory: readonly LegacyImportFileInventoryItem[],
    installedAt: string,
  ): Promise<LegacyImportPackageConfiguration> {
    await this.assertPackageHash(packagePath, expectedPackageHash);

    const zipFile: ZipFile = await this.openArchive(packagePath);

    try {
      const entries: ReadonlyMap<string, Entry> = await this.readEntryMap(zipFile);

      const appDataEntry: Entry = this.getRequiredEntry(entries, APP_DATA_ENTRY_NAME);

      const appDataBuffer: Buffer = await this.readEntryBuffer(
        zipFile,
        appDataEntry,
        MAXIMUM_APP_DATA_SIZE,
      );

      const legacyAppData: Record<string, unknown> = this.parseJsonObject(
        appDataBuffer,
        APP_DATA_ENTRY_NAME,
      );

      const pluginConfigEntry: Entry = this.getRequiredEntry(entries, PLUGIN_CONFIG_ENTRY_NAME);

      const pluginConfigBuffer: Buffer = await this.readEntryBuffer(
        zipFile,
        pluginConfigEntry,
        MAXIMUM_PLUGIN_CONFIG_SIZE,
      );

      const legacyPluginConfig: Record<string, unknown> = this.parseJsonObject(
        pluginConfigBuffer,
        PLUGIN_CONFIG_ENTRY_NAME,
      );

      const pluginConfiguration: LegacyPluginConfiguration =
        this.createPluginConfiguration(legacyPluginConfig);

      const logoInventoryItem: LegacyImportFileInventoryItem =
        this.getLogoInventoryItem(fileInventory);

      const logoPackagePath: string = this.getRequiredPackagePath(logoInventoryItem);

      this.assertSafePackagePath(logoPackagePath);

      const logoEntry: Entry = this.getRequiredEntry(entries, logoPackagePath);

      const expectedLogoSize: number = this.getRequiredSize(logoInventoryItem);

      if (logoEntry.uncompressedSize !== expectedLogoSize) {
        throw new Error(
          ['El tamaño del logo dentro del paquete', 'no coincide con el inventario.'].join(' '),
        );
      }

      const logoBuffer: Buffer = await this.readEntryBuffer(zipFile, logoEntry, MAXIMUM_LOGO_SIZE);

      this.assertBufferIntegrity(logoBuffer, logoInventoryItem);

      return this.createConfiguration(
        legacyAppData,
        pluginConfiguration,
        logoInventoryItem,
        logoPackagePath,
        logoBuffer,
        installedAt,
      );
    } finally {
      zipFile.close();
    }
  }

  private createPluginConfiguration(source: Record<string, unknown>): LegacyPluginConfiguration {
    const emailSmtpSource: Record<string, unknown> | null = this.getNullableRecord(
      source,
      'email_smtp',
      PLUGIN_CONFIG_ENTRY_NAME,
    );

    const ticketBaiSource: Record<string, unknown> | null = this.getNullableRecord(
      source,
      'ticketbai',
      PLUGIN_CONFIG_ENTRY_NAME,
    );

    const emailSmtp: EmailSmtpConfig | null =
      emailSmtpSource === null
        ? null
        : {
            host: this.getNullableString(emailSmtpSource, 'host', 'plugin_config.json.email_smtp'),
            port: this.getNullablePort(emailSmtpSource, 'port', 'plugin_config.json.email_smtp'),
            secure: this.getNullableString(
              emailSmtpSource,
              'secure',
              'plugin_config.json.email_smtp',
            ),
            user: this.getNullableString(emailSmtpSource, 'user', 'plugin_config.json.email_smtp'),
          };

    const ticketBai: TicketBaiConfig | null =
      ticketBaiSource === null
        ? null
        : {
            nif: this.getNullableString(ticketBaiSource, 'nif', 'plugin_config.json.ticketbai'),
          };

    return {
      emailSmtp,
      emailSmtpPass:
        emailSmtpSource === null
          ? null
          : this.getNullableString(emailSmtpSource, 'pass', 'plugin_config.json.email_smtp'),
      ticketBai,
      ticketBaiToken:
        ticketBaiSource === null
          ? null
          : this.getNullableString(ticketBaiSource, 'token', 'plugin_config.json.ticketbai'),
    };
  }

  private createConfiguration(
    source: Record<string, unknown>,
    pluginConfiguration: LegacyPluginConfiguration,
    logoItem: LegacyImportFileInventoryItem,
    logoPackagePath: string,
    logoBuffer: Buffer,
    installedAt: string,
  ): LegacyImportPackageConfiguration {
    const appData: AppData = {
      schemaVersion: 1,
      installedAt,
      nombre: this.getRequiredDecodedString(source, 'nombre'),
      nombreComercial: this.getRequiredDecodedString(source, 'nombreComercial'),
      cif: this.getRequiredDecodedString(source, 'cif'),
      telefono: this.getDecodedString(source, 'telefono'),
      direccion: this.getDecodedString(source, 'direccion'),
      poblacion: this.getDecodedString(source, 'poblacion'),
      email: this.getDecodedString(source, 'email'),
      twitter: this.getDecodedString(source, 'twitter'),
      facebook: this.getDecodedString(source, 'facebook'),
      instagram: this.getDecodedString(source, 'instagram'),
      web: this.getDecodedString(source, 'web'),
      frasesTicket: [],
      ticketEmail: {
        subjectTemplate: DEFAULT_TICKET_EMAIL_SUBJECT_TEMPLATE,
        bodyTemplate: DEFAULT_TICKET_EMAIL_BODY_TEMPLATE,
      },
      tipoIva: this.getTaxType(source),
      ivaList: this.getNumberArray(source, 'ivaList', true),
      reList: this.getNumberArray(source, 'reList', false),
      marginList: this.getNumberArray(source, 'marginList', false),
      ventaOnline: this.getBoolean(source, 'ventaOnline'),
      urlApi: this.getDecodedString(source, 'urlApi'),
      emailSmtp: pluginConfiguration.emailSmtp,
      ticketBai: pluginConfiguration.ticketBai,
      fechaCad: this.getBoolean(source, 'fechaCad'),
      empleados: this.getBoolean(source, 'empleados'),
    };

    const secrets: InstallationSecretsData = {
      secretApi: this.getDecodedString(source, 'secretApi'),
      backupApiKey: this.getDecodedString(source, 'backupApiKey'),
      emailSmtpPass: pluginConfiguration.emailSmtpPass,
      ticketBaiToken: pluginConfiguration.ticketBaiToken,
    };

    const mimeType: string = this.getRequiredLogoMimeType(logoItem);

    const logo: InstallationLogoData = {
      fileName: this.getLogoFileName(logoItem, logoPackagePath),
      mimeType,
      dataUrl: [`data:${mimeType};base64,`, logoBuffer.toString('base64')].join(''),
    };

    return {
      appData,
      logo,
      secrets,
      initialSaleNumber: this.getPositiveInteger(source, 'ticketInicial'),
      initialInvoiceNumber: this.getPositiveInteger(source, 'facturaInicial'),
    };
  }

  private getLogoInventoryItem(
    inventory: readonly LegacyImportFileInventoryItem[],
  ): LegacyImportFileInventoryItem {
    const includedLogos: readonly LegacyImportFileInventoryItem[] = inventory.filter(
      (item: LegacyImportFileInventoryItem): boolean =>
        item.logicalCategory === LOGO_LOGICAL_CATEGORY &&
        (item.status === 'included' || item.status === 'included_reference'),
    );

    if (includedLogos.length !== 1) {
      throw new Error(
        ['El paquete debe contener exactamente', 'un logo incluido en su inventario.'].join(' '),
      );
    }

    const logo: LegacyImportFileInventoryItem | undefined = includedLogos[0];

    if (logo === undefined) {
      throw new Error('No se ha encontrado el logo obligatorio.');
    }

    return logo;
  }

  private getLogoFileName(item: LegacyImportFileInventoryItem, packagePath: string): string {
    const sourceName: string = item.originalName ?? item.storedName ?? packagePath;

    const fileName: string = basename(sourceName).trim();

    return fileName.length > 0 ? fileName : 'logo';
  }

  private getRequiredLogoMimeType(item: LegacyImportFileInventoryItem): string {
    if (item.mimeType === null) {
      throw new Error('El logo no tiene un MIME type declarado.');
    }

    const mimeType: string = item.mimeType.trim().toLocaleLowerCase('en-US');

    switch (mimeType) {
      case 'image/jpeg':
      case 'image/png':
      case 'image/webp':
      case 'image/gif':
        return mimeType;

      default:
        throw new Error(`El tipo de imagen del logo no está admitido: ${mimeType}.`);
    }
  }

  private assertBufferIntegrity(buffer: Buffer, item: LegacyImportFileInventoryItem): void {
    const expectedSize: number = this.getRequiredSize(item);

    if (buffer.length !== expectedSize) {
      throw new Error('El tamaño extraído del logo no coincide con el inventario.');
    }

    const expectedHash: string = this.getRequiredSha256(item);

    const actualHash: string = createHash('sha256').update(buffer).digest('hex');

    if (actualHash !== expectedHash) {
      throw new Error('El hash extraído del logo no coincide con el inventario.');
    }
  }

  private parseJsonObject(buffer: Buffer, sourceName: string): Record<string, unknown> {
    let parsed: unknown;

    try {
      parsed = JSON.parse(buffer.toString('utf8')) as unknown;
    } catch (error: unknown) {
      throw new Error(`${sourceName} no contiene un JSON válido.`, {
        cause: error,
      });
    }

    if (!this.isRecord(parsed)) {
      throw new Error(`${sourceName} no contiene un objeto JSON.`);
    }

    return parsed;
  }

  private getNullableRecord(
    source: Record<string, unknown>,
    property: string,
    sourceName: string,
  ): Record<string, unknown> | null {
    const value: unknown = source[property];

    if (value === null) {
      return null;
    }

    if (!this.isRecord(value)) {
      throw new Error(`La propiedad ${property} de ${sourceName} no es un objeto o null.`);
    }

    return value;
  }

  private getNullableString(
    source: Record<string, unknown>,
    property: string,
    sourceName: string,
  ): string | null {
    const value: unknown = source[property];

    if (value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new Error(`La propiedad ${property} de ${sourceName} no es una cadena o null.`);
    }

    return value;
  }

  private getNullablePort(
    source: Record<string, unknown>,
    property: string,
    sourceName: string,
  ): number | null {
    const value: unknown = source[property];

    if (value === null) {
      return null;
    }

    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0 || value > 65_535) {
      throw new Error(`La propiedad ${property} de ${sourceName} no es un puerto válido o null.`);
    }

    return value;
  }

  private getRequiredDecodedString(source: Record<string, unknown>, property: string): string {
    const value: string = this.getDecodedString(source, property);

    if (value.length === 0) {
      throw new Error(`La propiedad ${property} de app_data.json está vacía.`);
    }

    return value;
  }

  private getDecodedString(source: Record<string, unknown>, property: string): string {
    const encodedValue: string = this.getString(source, property);

    try {
      return decodeURIComponent(encodedValue.replaceAll('+', ' ')).trim();
    } catch (error: unknown) {
      throw new Error(`La propiedad ${property} no contiene un valor URL-encoded válido.`, {
        cause: error,
      });
    }
  }

  private getString(source: Record<string, unknown>, property: string): string {
    const value: unknown = source[property];

    if (typeof value !== 'string') {
      throw new Error(`La propiedad ${property} de app_data.json no es una cadena.`);
    }

    return value;
  }

  private getBoolean(source: Record<string, unknown>, property: string): boolean {
    const value: unknown = source[property];

    if (typeof value !== 'boolean') {
      throw new Error(`La propiedad ${property} de app_data.json no es booleana.`);
    }

    return value;
  }

  private getPositiveInteger(source: Record<string, unknown>, property: string): number {
    const value: unknown = source[property];

    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
      throw new Error(`La propiedad ${property} no es un entero positivo válido.`);
    }

    return value;
  }

  private getTaxType(source: Record<string, unknown>): TipoIva {
    const value: string = this.getString(source, 'tipoIva').trim().toLocaleLowerCase('es-ES');

    if (value !== 'iva' && value !== 're') {
      throw new Error(`El tipo de IVA legacy no es válido: ${value}.`);
    }

    return value;
  }

  private getNumberArray(
    source: Record<string, unknown>,
    property: string,
    required: boolean,
  ): readonly number[] {
    const value: unknown = source[property];

    if (!Array.isArray(value)) {
      throw new Error(`La propiedad ${property} de app_data.json no es una lista.`);
    }

    const result: number[] = [];

    for (const item of value) {
      if (typeof item !== 'number' || !Number.isFinite(item)) {
        throw new Error(`La propiedad ${property} contiene un valor no numérico.`);
      }

      result.push(item);
    }

    if (required && result.length === 0) {
      throw new Error(`La propiedad ${property} no puede estar vacía.`);
    }

    return result;
  }

  private getRequiredPackagePath(item: LegacyImportFileInventoryItem): string {
    if (item.packagePath === null || item.packagePath.trim().length === 0) {
      throw new Error('El logo no tiene una ruta válida dentro del paquete.');
    }

    return item.packagePath;
  }

  private getRequiredSize(item: LegacyImportFileInventoryItem): number {
    if (
      item.size === null ||
      !Number.isSafeInteger(item.size) ||
      item.size <= 0 ||
      item.size > MAXIMUM_LOGO_SIZE
    ) {
      throw new Error('El tamaño declarado del logo no es válido.');
    }

    return item.size;
  }

  private getRequiredSha256(item: LegacyImportFileInventoryItem): string {
    if (item.sha256 === null || !/^[0-9a-fA-F]{64}$/.test(item.sha256)) {
      throw new Error('El SHA-256 declarado del logo no es válido.');
    }

    return item.sha256.toLocaleLowerCase('en-US');
  }

  private getRequiredEntry(entries: ReadonlyMap<string, Entry>, entryName: string): Entry {
    const entry: Entry | undefined = entries.get(entryName);

    if (entry === undefined) {
      throw new Error(`El paquete no contiene ${entryName}.`);
    }

    return entry;
  }

  private assertSafePackagePath(packagePath: string): void {
    const normalized: string = packagePath.replaceAll('\\', '/');

    if (
      normalized.length === 0 ||
      isAbsolute(normalized) ||
      normalized.startsWith('/') ||
      normalized.includes('../') ||
      normalized.includes('/..') ||
      /^[a-zA-Z]:/.test(normalized)
    ) {
      throw new Error(`La ruta ${packagePath} no es segura.`);
    }
  }

  private async assertPackageHash(packagePath: string, expectedHash: string): Promise<void> {
    const hash: ReturnType<typeof createHash> = createHash('sha256');

    const hasher: Writable = new Writable({
      write(
        chunk: Buffer,
        _encoding: BufferEncoding,
        callback: (error?: Error | null) => void,
      ): void {
        hash.update(chunk);

        callback();
      },
    });

    await pipeline(createReadStream(packagePath), hasher);

    const actualHash: string = hash.digest('hex');

    if (actualHash !== expectedHash.toLocaleLowerCase('en-US')) {
      throw new Error(['El paquete .otpv ha cambiado', 'desde que fue analizado.'].join(' '));
    }
  }

  private async readEntryBuffer(
    zipFile: ZipFile,
    entry: Entry,
    maximumSize: number,
  ): Promise<Buffer> {
    if (entry.uncompressedSize > maximumSize) {
      throw new Error(`El archivo ${entry.fileName} supera el tamaño permitido.`);
    }

    const stream: Readable = await this.openEntryStream(zipFile, entry);

    const chunks: Buffer[] = [];

    let totalSize: number = 0;

    const collector: Writable = new Writable({
      write(
        chunk: Buffer,
        _encoding: BufferEncoding,
        callback: (error?: Error | null) => void,
      ): void {
        totalSize += chunk.length;

        if (totalSize > maximumSize) {
          callback(new Error(`El archivo ${entry.fileName} supera el tamaño permitido.`));

          return;
        }

        chunks.push(chunk);

        callback();
      },
    });

    await pipeline(stream, collector);

    return Buffer.concat(chunks, totalSize);
  }

  private openArchive(packagePath: string): Promise<ZipFile> {
    const options: Options = {
      lazyEntries: true,
      autoClose: false,
      decodeStrings: true,
      validateEntrySizes: true,
      strictFileNames: true,
    };

    return new Promise<ZipFile>((resolve, reject): void => {
      open(packagePath, options, (error: Error | null, zipFile?: ZipFile): void => {
        if (error !== null) {
          reject(error);

          return;
        }

        if (zipFile === undefined) {
          reject(new Error('No se ha podido abrir el paquete .otpv.'));

          return;
        }

        resolve(zipFile);
      });
    });
  }

  private readEntryMap(zipFile: ZipFile): Promise<ReadonlyMap<string, Entry>> {
    return new Promise<ReadonlyMap<string, Entry>>((resolve, reject): void => {
      const entries: Map<string, Entry> = new Map<string, Entry>();

      const cleanup = (): void => {
        zipFile.removeListener('entry', onEntry);
        zipFile.removeListener('end', onEnd);
        zipFile.removeListener('error', onError);
      };

      const onEntry = (entry: Entry): void => {
        if (!entry.fileName.endsWith('/')) {
          entries.set(entry.fileName, entry);
        }

        zipFile.readEntry();
      };

      const onEnd = (): void => {
        cleanup();
        resolve(entries);
      };

      const onError = (error: Error): void => {
        cleanup();
        reject(error);
      };

      zipFile.on('entry', onEntry);
      zipFile.once('end', onEnd);
      zipFile.once('error', onError);
      zipFile.readEntry();
    });
  }

  private openEntryStream(zipFile: ZipFile, entry: Entry): Promise<Readable> {
    return new Promise<Readable>((resolve, reject): void => {
      zipFile.openReadStream(entry, (error: Error | null, stream?: Readable): void => {
        if (error !== null) {
          reject(error);

          return;
        }

        if (stream === undefined) {
          reject(new Error(`No se puede leer ${entry.fileName}.`));

          return;
        }

        resolve(stream);
      });
    });
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
