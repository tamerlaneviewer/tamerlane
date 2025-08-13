// utils/ensureHttps.ts
import { logger } from './logger.ts';
import { networkConfig } from '../config/appConfig.ts';

export function ensureHttps(url: string): string {
    if (networkConfig.forceHttps && url.startsWith('http://')) {
        logger.warn(`Upgrading insecure image URL to HTTPS: ${url}`);
        return url.replace(/^http:\/\//i, 'https://');
    }
    return url;
}
