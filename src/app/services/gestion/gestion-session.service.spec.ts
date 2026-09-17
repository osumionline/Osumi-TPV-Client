import GestionSessionService from '@services/gestion/gestion-session.service';

describe('GestionSessionService', (): void => {
  const AUTHENTICATED_AT: number = 1_700_000_000_000;
  const SESSION_DURATION_MS: number = 10 * 60 * 1000;
  const EMPLEADO_ID: number = 7;

  afterEach((): void => {
    vi.restoreAllMocks();
  });

  it('debe comenzar sin una sesión activa', (): void => {
    const service: GestionSessionService = new GestionSessionService();

    expect(service.empleadoId()).toBeNull();
    expect(service.authenticatedAt()).toBeNull();
    expect(service.expiresAt()).toBeNull();
    expect(service.isActive()).toBe(false);
  });

  it('debe crear una sesión con una duración exacta de diez minutos', (): void => {
    vi.spyOn(Date, 'now').mockReturnValue(AUTHENTICATED_AT);

    const service: GestionSessionService = new GestionSessionService();

    service.login(EMPLEADO_ID);

    expect(service.empleadoId()).toBe(EMPLEADO_ID);
    expect(service.authenticatedAt()).toBe(AUTHENTICATED_AT);
    expect(service.expiresAt()).toBe(AUTHENTICATED_AT + SESSION_DURATION_MS);
    expect(service.isActive()).toBe(true);
  });

  it('debe mantener activa la sesión antes de su vencimiento sin renovarla', (): void => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(AUTHENTICATED_AT);

    const service: GestionSessionService = new GestionSessionService();

    service.login(EMPLEADO_ID);

    const expiresAt: number | null = service.expiresAt();

    nowSpy.mockReturnValue(AUTHENTICATED_AT + SESSION_DURATION_MS - 1);

    expect(service.isActive()).toBe(true);
    expect(service.expiresAt()).toBe(expiresAt);
  });

  it('debe considerar expirada la sesión exactamente a los diez minutos sin eliminar sus datos', (): void => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(AUTHENTICATED_AT);

    const service: GestionSessionService = new GestionSessionService();

    service.login(EMPLEADO_ID);

    const expiresAt: number | null = service.expiresAt();

    nowSpy.mockReturnValue(AUTHENTICATED_AT + SESSION_DURATION_MS);

    expect(service.isActive()).toBe(false);

    expect(service.empleadoId()).toBe(EMPLEADO_ID);
    expect(service.authenticatedAt()).toBe(AUTHENTICATED_AT);
    expect(service.expiresAt()).toBe(expiresAt);
  });

  it('debe eliminar la sesión al cerrar sesión explícitamente', (): void => {
    vi.spyOn(Date, 'now').mockReturnValue(AUTHENTICATED_AT);

    const service: GestionSessionService = new GestionSessionService();

    service.login(EMPLEADO_ID);
    service.logout();

    expect(service.empleadoId()).toBeNull();
    expect(service.authenticatedAt()).toBeNull();
    expect(service.expiresAt()).toBeNull();
    expect(service.isActive()).toBe(false);
  });
});
