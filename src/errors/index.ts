export class IIIFResourceError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'IIIFResourceError';
    }
}

export class IIIFCollectionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'IIIFCollectionError';
    }
}