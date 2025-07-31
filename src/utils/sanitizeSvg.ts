import DOMPurify from 'dompurify';

/**
 * Sanitizes an SVG string to remove scripts and unsafe attributes,
 * and validates size and content before returning.
 *
 * @param svgString The raw SVG string to sanitize.
 * @param options Optional configuration:
 *   - maxLength: Maximum allowed SVG string length (default 100,000 chars).
 *   - disallowedTags: Tags that should cause rejection if present.
 * @returns A sanitized SVG string safe for insertion.
 * @throws Error if the SVG is too large or contains disallowed elements.
 */
export function sanitizeSvg(
    svgString: string,
    options: {
        maxLength?: number;
        disallowedTags?: string[];
    } = {}
): string {
    const { maxLength = 100_000, disallowedTags = ['script', 'iframe'] } = options;

    // 1. Check for oversized SVGs
    if (svgString.length > maxLength) {
        throw new Error(`SVG exceeds max length of ${maxLength} characters`);
    }

    // 2. Parse into a temporary DOM fragment to inspect
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = svgString.trim();

    // 3. Reject disallowed tags
    for (const tag of disallowedTags) {
        if (tempDiv.querySelector(tag)) {
            throw new Error(`SVG contains disallowed <${tag}> element`);
        }
    }

    // 4. Sanitize using DOMPurify with SVG-safe profile
    return DOMPurify.sanitize(svgString, { USE_PROFILES: { svg: true } });
}
