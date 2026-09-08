import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

const caducidadReportConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners()],
};

export default caducidadReportConfig;
