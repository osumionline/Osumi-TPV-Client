import { createHash } from 'node:crypto';

export default class LegacyImportPublicIdFactory {
  create(sourceHash: string, entity: string, legacyId: number): string {
    const hash: string = createHash('sha256')
      .update([sourceHash, entity, legacyId].join(':'))
      .digest('hex')
      .slice(0, 32);

    const versionedHash: string = [hash.slice(0, 12), '5', hash.slice(13)].join('');

    const variantValue: number = (Number.parseInt(versionedHash[16] ?? '0', 16) & 0x3) | 0x8;

    const finalHash: string = [
      versionedHash.slice(0, 16),
      variantValue.toString(16),
      versionedHash.slice(17),
    ].join('');

    return [
      finalHash.slice(0, 8),
      finalHash.slice(8, 12),
      finalHash.slice(12, 16),
      finalHash.slice(16, 20),
      finalHash.slice(20, 32),
    ].join('-');
  }
}
