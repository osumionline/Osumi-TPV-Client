export default interface InventarioCsvFileSaver {
  save(defaultFileName: string, content: string): Promise<boolean>;
}
