import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import {
  ApplicationConfig,
  inject,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatFormFieldDefaultOptions,
} from '@angular/material/form-field';
import { MatPaginatorIntl } from '@angular/material/paginator';
import {
  InMemoryScrollingOptions,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import routes from '@app/app.routes';
import type ApplicationStateResult from '@desktop-contracts/application/application-state-result.interface';
import ApplicationStateService from '@services/application-state.service';
import SpanishPaginatorIntlService from '@services/spanish-paginator-intl.service';

registerLocaleData(localeEs);

const appearance: MatFormFieldDefaultOptions = {
  appearance: 'outline',
};
const scrollConfig: InMemoryScrollingOptions = {
  scrollPositionRestoration: 'top',
  anchorScrolling: 'enabled',
};

const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer((): Promise<ApplicationStateResult> =>
      inject(ApplicationStateService).load(),
    ),
    { provide: LOCALE_ID, useValue: 'es-ES' },
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' },
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: appearance },
    {
      provide: MatPaginatorIntl,
      useClass: SpanishPaginatorIntlService,
    },
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withViewTransitions(),
      withInMemoryScrolling(scrollConfig),
      withComponentInputBinding(),
    ),
  ],
};

export default appConfig;
