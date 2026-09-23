import type CajaService from '@backend/application/caja/caja.service';
import type InformeSimpleService from '@backend/application/caja/informes/informe-simple.service';
import type AbrirCajaCommand from '@desktop-contracts/caja/abrir-caja-command.interface';
import type CajaAbiertaInterface from '@desktop-contracts/caja/caja-abierta.interface';
import {
  type CajaCierreInterface,
  CajaCierreConsulta,
} from '@desktop-contracts/caja/caja-cierre.interface';
import type { CerrarCajaCommand } from '@desktop-contracts/caja/cerrar-caja-command.interface';
import type {
  InformeSimpleConsulta,
  InformeSimpleResultado,
} from '@desktop-contracts/caja/informes/informe-simple.interface';
import type {
  ActualizarSalidaCajaCommand,
  CrearSalidaCajaCommand,
  EliminarSalidaCajaCommand,
} from '@desktop-contracts/caja/salida-caja-command.interface';
import type {
  SalidaCajaConsulta,
  SalidaCajaInterface,
} from '@desktop-contracts/caja/salida-caja.interface';
import type { MainWindowProvider } from '@ipc/assert-trusted-sender';
import { assertTrustedSender } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

/**
 * Registra los canales IPC relacionados con las operaciones de caja.
 */
export default function registerCajaIpc(
  getMainWindow: MainWindowProvider,
  cajaService: CajaService,
  informeSimpleService: InformeSimpleService,
): void {
  ipcMain.handle(
    IPC_CHANNELS.cajaOpen,
    async (event, command: AbrirCajaCommand): Promise<CajaAbiertaInterface> => {
      assertTrustedSender(event, getMainWindow);

      return cajaService.open(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.cajaGetSalidas,
    async (event, consulta: SalidaCajaConsulta): Promise<readonly SalidaCajaInterface[]> => {
      assertTrustedSender(event, getMainWindow);

      return cajaService.findSalidas(consulta);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.cajaCreateSalida,
    async (event, command: CrearSalidaCajaCommand): Promise<SalidaCajaInterface> => {
      assertTrustedSender(event, getMainWindow);

      return cajaService.createSalida(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.cajaUpdateSalida,
    async (event, command: ActualizarSalidaCajaCommand): Promise<SalidaCajaInterface> => {
      assertTrustedSender(event, getMainWindow);

      return cajaService.updateSalida(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.cajaDeleteSalida,
    async (event, command: EliminarSalidaCajaCommand): Promise<void> => {
      assertTrustedSender(event, getMainWindow);

      await cajaService.deleteSalida(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.cajaGetCierre,
    async (event, consulta: CajaCierreConsulta): Promise<CajaCierreInterface> => {
      assertTrustedSender(event, getMainWindow);

      return cajaService.getCierre(consulta);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.cajaClose,
    async (event, command: CerrarCajaCommand): Promise<void> => {
      assertTrustedSender(event, getMainWindow);

      await cajaService.close(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.cajaGetInformeSimple,
    async (event, consulta: InformeSimpleConsulta): Promise<InformeSimpleResultado> => {
      assertTrustedSender(event, getMainWindow);

      return informeSimpleService.getInforme(consulta);
    },
  );
}
