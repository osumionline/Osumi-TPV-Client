import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

const cajaInformePrintConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners()],
};

export default cajaInformePrintConfig;
