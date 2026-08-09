import type ApplicationPaths from '@backend/contracts/system/application-paths.interface';

export default interface ApplicationPathsProvider {
  getPaths(): ApplicationPaths;
}
