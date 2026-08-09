export default interface EmpleadoInterface {
  readonly id: number;
  readonly publicId: string;
  readonly nombre: string;
  readonly hasPassword: boolean;
  readonly color: string;
  readonly admin: boolean;
  readonly permisos: readonly number[];
}
