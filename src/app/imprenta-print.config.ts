import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

const imprentaPrintConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners()],
};

export default imprentaPrintConfig;
