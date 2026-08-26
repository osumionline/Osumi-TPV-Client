export const DEFAULT_TICKET_EMAIL_SUBJECT_TEMPLATE: string =
  '{nombreNegocio} - Ticket {referencia}';

export const DEFAULT_TICKET_EMAIL_BODY_TEMPLATE: string = [
  'Adjuntamos el ticket correspondiente a su compra.',
  'Gracias por su confianza.',
].join('\n');

export const TICKET_EMAIL_TEMPLATE_VARIABLES: readonly string[] = [
  '{nombreNegocio}',
  '{referencia}',
];

export interface TicketEmailConfig {
  readonly subjectTemplate: string;
  readonly bodyTemplate: string;
}
