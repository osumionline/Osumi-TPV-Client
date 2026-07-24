import type { OsumiDesktopApi } from '../../electron/contracts/desktop-api';

export {};

declare global {
  interface Window {
    readonly osumiDesktop?: OsumiDesktopApi;
  }
}
