export type EmpleadoDataFormMode = 'create' | 'edit';

export interface EmpleadoDataFormModel {
  mode: EmpleadoDataFormMode;
  nombre: string;
  password: string;
  confirmPassword: string;
  color: string;
}
