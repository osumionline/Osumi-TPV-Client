import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

const facturaPreviewConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners()],
};

export default facturaPreviewConfig;
