"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    if (err instanceof Error) {
        res.status(500).json({
            message: 'Internal Server Error',
            error: err.message
        });
        return;
    }
    res.status(500).json({
        message: 'Internal Server Error',
        error: 'An unknown error occurred'
    });
};
exports.errorHandler = errorHandler;
