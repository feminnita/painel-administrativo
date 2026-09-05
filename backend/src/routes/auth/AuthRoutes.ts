import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as AuthController from '../../controllers/auth/AuthController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';


const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Muitas tentativas, aguarde por 15 munitos'
    }
});


export const adminAuthRoutes = Router();

adminAuthRoutes.post('/login', loginLimiter, AuthController.login);
adminAuthRoutes.post('/logout', AuthController.logout);
adminAuthRoutes.get('/me', loginLimiter, requireAdminAuth, AuthController.me);
adminAuthRoutes.post('/forgot-password', loginLimiter, AuthController.forgotPassword);
adminAuthRoutes.post('/reset-password', loginLimiter, AuthController.resetPassword);