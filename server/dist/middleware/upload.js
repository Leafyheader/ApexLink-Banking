"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFiles = exports.uploadSignature = exports.uploadPhoto = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
// Storage configuration for customer photos
const photoStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/photos/');
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp and random string
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path_1.default.extname(file.originalname);
        cb(null, `photo-${uniqueSuffix}${extension}`);
    }
});
// Storage configuration for customer signatures
const signatureStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/signatures/');
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp and random string
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path_1.default.extname(file.originalname);
        cb(null, `signature-${uniqueSuffix}${extension}`);
    }
});
// File filter for images
const imageFileFilter = (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    }
    else {
        cb(new Error('Only image files are allowed'));
    }
};
// Photo upload configuration
exports.uploadPhoto = (0, multer_1.default)({
    storage: photoStorage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB limit
    },
});
// Signature upload configuration
exports.uploadSignature = (0, multer_1.default)({
    storage: signatureStorage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 1 * 1024 * 1024, // 1MB limit
    },
});
// Combined upload for both photo and signature
exports.uploadFiles = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            if (file.fieldname === 'photo') {
                cb(null, 'uploads/photos/');
            }
            else if (file.fieldname === 'signature') {
                cb(null, 'uploads/signatures/');
            }
            else {
                cb(new Error('Invalid field name'), '');
            }
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const extension = path_1.default.extname(file.originalname);
            const prefix = file.fieldname === 'photo' ? 'photo' : 'signature';
            cb(null, `${prefix}-${uniqueSuffix}${extension}`);
        }
    }),
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB limit
    },
});
