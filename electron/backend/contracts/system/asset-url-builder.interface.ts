export default interface AssetUrlBuilder {
  build(relativePath: string | null): string | null;
}
