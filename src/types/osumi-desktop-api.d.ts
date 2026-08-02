import type OsumiDesktopApi from '@desktop-contracts/desktop-api';

export {};

declare global {
  interface Window {
    readonly osumiDesktop: OsumiDesktopApi;
  }
}
