import { extractLanguagesFromAnnotations } from './iiifLangUtils';
import { IIIFAnnotation } from '../types';

describe('extractLanguagesFromAnnotations', () => {
    it('should extract unique languages from annotations', () => {
        const annotations = [
            { body: { language: 'en' } },
            { body: { language: 'la' } },
            { body: { language: 'en' } }, // Duplicate
        ] as IIIFAnnotation[];

        const languages = extractLanguagesFromAnnotations(annotations);

        expect(languages).toHaveLength(2);
        expect(languages).toEqual([
            { code: 'en', name: 'English' },
            { code: 'la', name: 'Latin' },
        ]);
    });

    it('should return an empty array if no annotations have a language', () => {
        const annotations = [
            { body: {} },
            { body: {} },
        ] as IIIFAnnotation[];

        const languages = extractLanguagesFromAnnotations(annotations);
        expect(languages).toEqual([]);
    });
});
