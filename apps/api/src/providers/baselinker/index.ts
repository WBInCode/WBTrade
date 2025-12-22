/**
 * Baselinker Provider Exports
 */

export * from './baselinker-provider.interface';
export * from './baselinker.provider';

import { BaselinkerProvider, BaselinkerApiError } from './baselinker.provider';
import { BaselinkerProviderConfig } from './baselinker-provider.interface';

/**
 * Create a new Baselinker provider instance
 */
export function createBaselinkerProvider(
  config: BaselinkerProviderConfig
): BaselinkerProvider {
  return new BaselinkerProvider(config);
}

export { BaselinkerProvider, BaselinkerApiError };
