// utils/ensureHttps.ts
export function ensureHttps(url: string): string {
    if (url.startsWith('http://')) {
        console.warn(`⚠️ Upgrading insecure image URL to HTTPS: ${url}`);
        return url.replace(/^http:\/\//i, 'https://');
    }
    return url;
}

