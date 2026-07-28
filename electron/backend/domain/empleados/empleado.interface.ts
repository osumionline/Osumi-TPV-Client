export default interface Empleado {
  id: number;
  nombre: string;
  passwordHash: string;
  color: string;
  admin: boolean;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
