interface AutenticarEmpleadoResult {
  readonly status:
    'authenticated' | 'invalid_password' | 'password_unavailable' | 'employee_unavailable';
}

export default AutenticarEmpleadoResult;
