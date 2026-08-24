import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';

import { adminAuthRoutes } from './routes/auth/AuthRoutes';
import { adminCategoryRoutes } from './routes/product/CategoryRoutes';
import { adminProductRoutes } from './routes/product/ProductRoutes';
import { adminProductColorRoutes } from './routes/product/ProductColorRoutes';
import { adminProductSkuRoutes } from './routes/product/ProductSkuRoutes';
import { adminOrderRoutes } from './routes/orders/OrderRoutes';
import { adminCouponRoutes } from './routes/orders/CouponRoutes';
import { adminShippingRoutes } from './routes/tracking/ShippingRoutes';
import { adminHeroSlideRoutes } from './routes/hero/HeroSlideRoutes';
import { adminSiteSettingsRoutes } from './routes/settings/SiteSettings';
import { adminUploadRoutes } from './routes/upload/UploadRouter';
import { adminBlingRoutes } from './routes/integrations/BlingRoutes';

const app = express();

app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
  : ['http://localhost:3001', 'http://localhost:5173'];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/categories', adminCategoryRoutes);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin/colors', adminProductColorRoutes);
app.use('/api/admin/products/:productId/skus', adminProductSkuRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/coupons', adminCouponRoutes);
app.use('/api/admin/orders/:orderId/shipping', adminShippingRoutes);
app.use('/api/admin/settings', adminSiteSettingsRoutes);
app.use('/api/admin/hero-slides', adminHeroSlideRoutes);
app.use('/api/admin/upload', adminUploadRoutes);
app.use('/api/admin/bling', adminBlingRoutes);


app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = Number(process.env.PORT) || 3334;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});

export default app;