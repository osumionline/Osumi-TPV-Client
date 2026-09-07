import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

const inventarioPrintConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners()],
};

export default inventarioPrintConfig;
