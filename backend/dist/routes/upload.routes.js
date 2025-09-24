"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_1 = require("../middleware/upload");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// File upload endpoint
router.post('/', auth_1.authenticateToken, upload_1.uploadFiles.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'signature', maxCount: 1 }
]), (req, res) => {
    try {
        const files = req.files;
        const uploadedFiles = {};
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
    }
    catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({
            error: 'Failed to upload files',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
