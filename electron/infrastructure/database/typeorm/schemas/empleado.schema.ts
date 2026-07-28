import type Empleado from '@backend/domain/empleados/empleado.interface';
import { EntitySchema } from 'typeorm';

const empleadoSchema: EntitySchema<Empleado> = new EntitySchema<Empleado>({
  name: 'Empleado',
  tableName: 'empleado',

  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true,
    },

    nombre: {
      type: String,
      length: 100,
      unique: true,
      collation: 'NOCASE',
    },

    passwordHash: {
      name: 'password_hash',
      type: String,
      length: 255,
    },

    color: {
      type: String,
      length: 6,
    },

    admin: {
      type: Boolean,
      default: false,
    },

    activo: {
      type: Boolean,
      default: true,
    },

    createdAt: {
      name: 'created_at',
      type: Date,
      createDate: true,
    },

    updatedAt: {
      name: 'updated_at',
      type: Date,
      updateDate: true,
    },

    deletedAt: {
      name: 'deleted_at',
      type: Date,
      nullable: true,
      deleteDate: true,
    },
  },
});

export default empleadoSchema;
