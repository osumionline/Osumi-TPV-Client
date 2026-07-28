import type EmpleadoPermiso from '@backend/domain/empleados/empleado-permiso.interface';
import { EntitySchema } from 'typeorm';

const empleadoPermisoSchema: EntitySchema<EmpleadoPermiso> = new EntitySchema<EmpleadoPermiso>({
  name: 'EmpleadoPermiso',
  tableName: 'empleado_permiso',

  columns: {
    idEmpleado: {
      name: 'id_empleado',
      type: Number,
      primary: true,
    },

    idPermiso: {
      name: 'id_permiso',
      type: Number,
      primary: true,
    },

    createdAt: {
      name: 'created_at',
      type: Date,
      createDate: true,
    },
  },
});

export default empleadoPermisoSchema;
