import ClienteFacturaPdfHtmlBuilder from '@backend/application/clientes/cliente-factura-pdf-html.builder';
import type ClienteFacturaPdfStorage from '@backend/contracts/clientes/cliente-factura-pdf-storage.interface';
import type A4DocumentRenderer from '@backend/contracts/printing/a4-document-renderer.interface';
import type {
  ClienteFacturaDocumentoConsulta,
  ClienteFacturaDocumentoInterface,
} from '@desktop-contracts/clientes/cliente-factura-documento.interface';

interface ClienteFacturaDocumentoProvider {
  /**
   * Recupera el modelo documental completo de una factura.
   */
  getDocumento(
    consulta: ClienteFacturaDocumentoConsulta,
  ): Promise<ClienteFacturaDocumentoInterface>;
}

export default class ClienteFacturaPdfService {
  private readonly pendingRequests: Map<string, Promise<Uint8Array>> = new Map<
    string,
    Promise<Uint8Array>
  >();

  constructor(
    private readonly documentosService: ClienteFacturaDocumentoProvider,
    private readonly htmlBuilder: ClienteFacturaPdfHtmlBuilder,
    private readonly documentRenderer: A4DocumentRenderer,
    private readonly pdfStorage: ClienteFacturaPdfStorage,
  ) {}

  /**
   * Devuelve los bytes definitivos ya almacenados o
   * materializa una única vez el PDF que todavía falta.
   */
  async getOrCreatePdf(consulta: ClienteFacturaDocumentoConsulta): Promise<Uint8Array> {
    const normalizedConsulta: ClienteFacturaDocumentoConsulta = this.normalizeConsulta(consulta);
    const requestKey: string = this.getRequestKey(normalizedConsulta);

    const pendingRequest: Promise<Uint8Array> | undefined = this.pendingRequests.get(requestKey);

    if (pendingRequest !== undefined) {
      return pendingRequest;
    }

    const request: Promise<Uint8Array> = this.resolvePdf(normalizedConsulta);

    this.pendingRequests.set(requestKey, request);

    try {
      return await request;
    } finally {
      if (this.pendingRequests.get(requestKey) === request) {
        this.pendingRequests.delete(requestKey);
      }
    }
  }

  /**
   * Intenta materializar el PDF después del COMMIT sin
   * permitir que un fallo documental invalide la emisión.
   */
  async materializeAfterEmit(consulta: ClienteFacturaDocumentoConsulta): Promise<void> {
    try {
      await this.getOrCreatePdf(consulta);
    } catch (error: unknown) {
      console.error('No se ha podido materializar el PDF definitivo de la factura:', error);
    }
  }

  /**
   * Resuelve el documento físico respetando siempre los
   * primeros bytes que hayan quedado almacenados.
   */
  private async resolvePdf(consulta: ClienteFacturaDocumentoConsulta): Promise<Uint8Array> {
    const existingPdf: Uint8Array | null = await this.pdfStorage.read(consulta.facturaPublicId);

    if (existingPdf !== null) {
      return existingPdf;
    }

    const documento: ClienteFacturaDocumentoInterface =
      await this.documentosService.getDocumento(consulta);

    if (documento.facturaPublicId !== consulta.facturaPublicId) {
      throw new Error('El documento recuperado no corresponde a la factura solicitada.');
    }

    const documentHtml: string = this.htmlBuilder.build(documento);

    const renderedPdf: Uint8Array = await this.documentRenderer.renderLandscapePdf(documentHtml);

    await this.pdfStorage.save(documento.facturaPublicId, renderedPdf);

    /*
     * Volvemos a leer en lugar de devolver renderedPdf:
     * si otra operación ganó una carrera de filesystem,
     * estos son los bytes canónicos e inmutables.
     */
    const persistedPdf: Uint8Array | null = await this.pdfStorage.read(documento.facturaPublicId);

    if (persistedPdf === null) {
      throw new Error('El PDF definitivo de la factura no ha quedado materializado.');
    }

    return persistedPdf;
  }

  /**
   * Normaliza los identificadores antes de utilizarlos
   * para coordinar peticiones concurrentes.
   */
  private normalizeConsulta(
    consulta: ClienteFacturaDocumentoConsulta,
  ): ClienteFacturaDocumentoConsulta {
    if (typeof consulta !== 'object' || consulta === null) {
      throw new Error('La consulta del PDF de factura no es válida.');
    }

    return {
      clientePublicId: this.requirePublicId(consulta.clientePublicId, 'cliente'),
      facturaPublicId: this.requirePublicId(consulta.facturaPublicId, 'factura'),
    };
  }

  /**
   * Construye una clave inequívoca para deduplicar
   * materializaciones de la misma factura.
   */
  private getRequestKey(consulta: ClienteFacturaDocumentoConsulta): string {
    return JSON.stringify([consulta.clientePublicId, consulta.facturaPublicId]);
  }

  /**
   * Normaliza un identificador público obligatorio.
   */
  private requirePublicId(value: string, entity: 'cliente' | 'factura'): string {
    if (typeof value !== 'string') {
      throw new Error(`El identificador de ${entity} no es válido.`);
    }

    const normalizedValue: string = value.trim();

    if (normalizedValue.length === 0) {
      throw new Error(`El identificador de ${entity} no es válido.`);
    }

    return normalizedValue;
  }
}
