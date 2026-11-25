import TiendaOnlineArticuloResolver from '@backend/application/tienda-online/tienda-online-articulo-resolver';
import { TiendaOnlineImportacionService } from '@backend/application/tienda-online/tienda-online-importacion.service';
import TiendaOnlineLineasMapper from '@backend/application/tienda-online/tienda-online-lineas.mapper';
import TiendaOnlinePedidosPendientesParser from '@backend/application/tienda-online/tienda-online-pedidos-pendientes.parser';
import { TiendaOnlinePedidosService } from '@backend/application/tienda-online/tienda-online-pedidos.service';
import {
  TiendaOnlineSincronizacionService,
  type TiendaOnlineSincronizacionResultado,
} from '@backend/application/tienda-online/tienda-online-sincronizacion.service';
import { TiendaOnlineVentaCommandBuilder } from '@backend/application/tienda-online/tienda-online-venta-command.builder';
import type VentasTicketBaiService from '@backend/application/ventas/ventas-ticket-bai.service';
import type ApplicationStateReader from '@backend/contracts/application/application-state-reader.interface';
import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
import type TiendaOnlineArticulosRepository from '@backend/contracts/tienda-online/tienda-online-articulos.repository.interface';
import type TipoPagoRepository from '@backend/contracts/tipos-pago/tipo-pago.repository.interface';
import type VentasPersistenciaRepository from '@backend/contracts/ventas/ventas-persistencia.repository.interface';
import type VentasTicketBaiRepository from '@backend/contracts/ventas/ventas-ticket-bai.repository.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type { InstallationSecretsData } from '@desktop-contracts/configuration/installation-command.interface';
import {
  isTiendaOnlineSyncConfig,
  type TiendaOnlineSyncConfig,
} from '@desktop-contracts/configuration/tienda-online-sync-config';
import HttpTiendaOnlinePedidosClient from '@infrastructure/tienda-online/http-tienda-online-pedidos.client';

/**
 * Dependencias operativas necesarias para componer
 * una ejecución de sincronización.
 */
export interface TiendaOnlineEjecucionDependencies {
  readonly applicationStateReader: ApplicationStateReader;
  readonly appDataRepository: Pick<AppDataRepository, 'load'>;
  readonly secretStorage: Pick<SecretStorage, 'load'>;
  readonly articulosRepository: TiendaOnlineArticulosRepository;
  readonly tiposPagoRepository: Pick<TipoPagoRepository, 'findAll'>;
  readonly ventasRepository: Pick<VentasPersistenciaRepository, 'saveOnline'>;
  readonly fiscalRepository: Pick<VentasTicketBaiRepository, 'findByVentaId'>;
  readonly fiscalService: Pick<VentasTicketBaiService, 'processInitial' | 'reconcile'>;
}

/**
 * Situaciones en las que no se inicia una sincronización.
 */
export type TiendaOnlineEjecucionOmitida =
  'busy' | 'not-installed' | 'not-ready' | 'disabled' | 'not-configured';

/**
 * Resultado de solicitar una ejecución operativa.
 *
 * completed indica que la pasada ha finalizado,
 * no que todos sus pedidos hayan recibido ACK.
 */
export type TiendaOnlineEjecucionResultado =
  | {
      readonly outcome: TiendaOnlineEjecucionOmitida;
      readonly result: null;
    }
  | {
      readonly outcome: 'completed';
      readonly result: TiendaOnlineSincronizacionResultado;
    };

/**
 * Compone y ejecuta los servicios de sincronización
 * utilizando la configuración actual de la instalación.
 *
 * No programa ejecuciones periódicas ni mantiene
 * clientes HTTP con credenciales antiguas.
 */
export class TiendaOnlineEjecucionService {
  private running: boolean = false;

  constructor(
    private readonly dependencies: TiendaOnlineEjecucionDependencies,
    private readonly fetchImplementation: typeof globalThis.fetch = globalThis.fetch,
  ) {}

  /**
   * Ejecuta una pasada completa de sincronización.
   *
   * expectedTestUrl permite proteger una ejecución
   * manual de desarrollo frente a una configuración
   * de tienda distinta de la esperada.
   *
   * Los estados normales de omisión se devuelven
   * como resultado. Los errores técnicos se propagan.
   *
   * @param expectedTestUrl URL esperada en una prueba manual.
   * @returns Resultado de la ejecución solicitada.
   */
  async execute(expectedTestUrl?: string): Promise<TiendaOnlineEjecucionResultado> {
    if (this.running) {
      return this.skipped('busy');
    }

    this.running = true;

    try {
      const appData: AppData | null = await this.dependencies.appDataRepository.load();

      if (appData === null) {
        return this.skipped('not-installed');
      }

      if (!appData.ventaOnline) {
        return this.skipped('disabled');
      }

      const profile: TiendaOnlineSyncConfig | null = appData.tiendaOnlineSync ?? null;

      if (profile === null) {
        return this.skipped('not-configured');
      }

      if (!isTiendaOnlineSyncConfig(profile)) {
        throw new Error('El perfil de sincronización de tienda online no es válido.');
      }

      if (expectedTestUrl !== undefined) {
        this.validateTestConfiguration(appData, expectedTestUrl);
      }

      const applicationState = await this.dependencies.applicationStateReader.getState();

      if (applicationState.state !== 'ready') {
        return this.skipped('not-ready');
      }

      const secrets: InstallationSecretsData | null = await this.dependencies.secretStorage.load();

      const client: HttpTiendaOnlinePedidosClient = HttpTiendaOnlinePedidosClient.fromConfiguration(
        appData,
        secrets,
        this.fetchImplementation,
      );

      const articuloResolver = new TiendaOnlineArticuloResolver(
        this.dependencies.articulosRepository,
      );

      const lineasMapper = new TiendaOnlineLineasMapper(articuloResolver);

      const parser = new TiendaOnlinePedidosPendientesParser();

      const pedidosService = new TiendaOnlinePedidosService(client, parser, lineasMapper);

      const commandBuilder = new TiendaOnlineVentaCommandBuilder(
        this.dependencies.tiposPagoRepository,
        {
          fuenteId: profile.fuenteId,
          zonaHoraria: profile.zonaHoraria,
          metodosPago: profile.metodosPago,
        },
      );

      const importacionService = new TiendaOnlineImportacionService(
        pedidosService,
        commandBuilder,
        this.dependencies.ventasRepository,
        this.dependencies.fiscalService,
      );

      const sincronizacionService = new TiendaOnlineSincronizacionService(
        importacionService,
        this.dependencies.fiscalRepository,
        this.dependencies.fiscalService,
        client,
        profile.politicaAck,
      );

      const result: TiendaOnlineSincronizacionResultado = await sincronizacionService.runOnce();

      return {
        outcome: 'completed',
        result,
      };
    } finally {
      this.running = false;
    }
  }

  /**
   * Construye un resultado de omisión sin efectos
   * comerciales ni peticiones remotas.
   */
  private skipped(outcome: TiendaOnlineEjecucionOmitida): TiendaOnlineEjecucionResultado {
    return {
      outcome,
      result: null,
    };
  }

  /**
   * Protege el arranque manual de pruebas.
   *
   * No permite utilizar una URL distinta de la
   * indicada expresamente ni un entorno fiscal
   * de producción.
   */
  private validateTestConfiguration(appData: AppData, expectedTestUrl: string): void {
    if (expectedTestUrl.length === 0 || appData.urlApi !== expectedTestUrl) {
      throw new Error('La URL configurada no coincide con la tienda online de pruebas.');
    }

    if (appData.ticketBai?.environment === 'production') {
      throw new Error('La sincronización manual de pruebas no admite TicketBAI de producción.');
    }
  }
}
