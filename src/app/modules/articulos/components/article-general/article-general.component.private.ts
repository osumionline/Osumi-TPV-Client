export type ArticleIntegerField = 'stock' | 'stockMin' | 'stockMax' | 'loteOptimo';

export type ArticlePriceField =
  'precioAlbaran' | 'puc' | 'margen' | 'pvp' | 'margenDescuento' | 'pvpDescuento';

export type ArticleDecimalField = ArticlePriceField | 'descuento';

export interface ArticleFiscalOption {
  readonly key: string;
  readonly ivaBps: number;
  readonly reBps: number;
}
