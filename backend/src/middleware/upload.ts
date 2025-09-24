import multer from 'multer';
import path from 'path';
import { Request } from 'express';

// Storage configuration for customer photos
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/photos/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `photo-${uniqueSuffix}${extension}`);
  }
});

// Storage configuration for customer signatures
const signatureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/signatures/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `signature-${uniqueSuffix}${extension}`);
  }
});

// File filter for images
const imageFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

// Photo upload configuration
export const uploadPhoto = multer({
  storage: photoStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
});

// Signature upload configuration
export const uploadSignature = multer({
  storage: signatureStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 1 * 1024 * 1024, // 1MB limit
  },
});

// Combined upload for both photo and signature
export const uploadFiles = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {      if (file.fieldname === 'photo') {
        cb(null, 'uploads/photos/');
      } else if (file.fieldname === 'signature') {
        cb(null, 'uploads/signatures/');
      } else {
        cb(new Error('Invalid field name'), '');
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      const prefix = file.fieldname === 'photo' ? 'photo' : 'signature';
      cb(null, `${prefix}-${uniqueSuffix}${extension}`);
    }
  }),
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
});
