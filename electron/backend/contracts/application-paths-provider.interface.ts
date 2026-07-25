import type ApplicationPaths from '@backend/contracts/application-paths.interface';

export default interface ApplicationPathsProvider {
  getPaths(): ApplicationPaths;
}
