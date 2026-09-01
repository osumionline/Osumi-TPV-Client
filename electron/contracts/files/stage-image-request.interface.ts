export default interface StageImageRequest {
  readonly originalName: string | null;
  readonly bytes: Uint8Array;
}
