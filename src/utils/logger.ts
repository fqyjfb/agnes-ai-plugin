const LOG_PREFIX = '[Agnes AI Plugin]';

export function log(message: string, data?: any): void {
  console.log(`${LOG_PREFIX} ${message}`, data ?? '');
}

export function warn(message: string, data?: any): void {
  console.warn(`${LOG_PREFIX} ${message}`, data ?? '');
}

export function error(message: string, error?: any): void {
  console.error(`${LOG_PREFIX} ${message}`, error ?? '');
}