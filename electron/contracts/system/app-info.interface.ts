export default interface AppInfo {
  readonly name: string;

  readonly version: string;

  readonly platform: string;

  readonly arch: string;

  readonly electronVersion: string;

  readonly chromeVersion: string;

  readonly nodeVersion: string;

  readonly isPackaged: boolean;
}
