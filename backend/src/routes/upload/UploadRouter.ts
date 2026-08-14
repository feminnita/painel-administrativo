import { Router } from 'express';
import multer from 'multer';
import * as UploadController from '../../controllers/upload/uploadController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024, files: 10 },
});

export const adminUploadRoutes = Router();
adminUploadRoutes.use(requireAdminAuth);

adminUploadRoutes.post('/', upload.array('files', 10), UploadController.uploadImages);
