import { Router, Request, Response } from 'express';
import { uploadFiles } from '../middleware/upload';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// File upload endpoint
router.post('/', authenticateToken, uploadFiles.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'signature', maxCount: 1 }
]), (req: Request, res: Response) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const uploadedFiles: { photo?: string; signature?: string } = {};

    if (files.photo && files.photo[0]) {
      // Generate URL for photo
      uploadedFiles.photo = `/uploads/photos/${files.photo[0].filename}`;
    }

    if (files.signature && files.signature[0]) {
      // Generate URL for signature
      uploadedFiles.signature = `/uploads/signatures/${files.signature[0].filename}`;
    }

    res.json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      error: 'Failed to upload files',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
