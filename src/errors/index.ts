export class TamerlaneError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor); // Captures the correct stack trace
    }
}

export class TamerlaneValidationError extends TamerlaneError {
    constructor(message = 'Invalid input data') {
        super(message);
    }
}

export class TamerlaneResourceError extends TamerlaneError {
    constructor(message = 'Error accessing resource') {
        super(message);
    }
}


export class TamerlaneNetworkError extends TamerlaneError {
    constructor(message = 'Network error occurred') {
        super(message);
    }
}

export class TamerlaneNotFoundError extends TamerlaneError {
    constructor(message = 'Resource not found') {
        super(message);
    }
}

export class TamerlaneParseError extends TamerlaneError {
    constructor(message = 'Error parsing data') {
        super(message);
    }
}