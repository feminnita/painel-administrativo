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
import { startBlingAutoPush } from './integrations/bling/BlingAutoPush';
import { melhorEnvioRoutes } from './routes/integrations/MelhorEnvioRoutes';
import { startMeTokenRefreshJob } from './integrations/melhorEnvio/RefreshJob';
import { adminCartRoutes } from './routes/carts/CartRouter';
import { adminReportRoutes } from './routes/reports/ReportRoutes';
import { adminCustomerRoutes } from './routes/customers/CustomersRoutes';

const app = express();

app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
  : ['http://localhost:3001', 'http://localhost:5173'];

// Domínios de PREVIEW da Vercel deste time (produção + branch previews) mudam a
// cada branch — sem isto, todo preview barra o login no navegador por CORS
// (curl passa porque ignora CORS). Regex restrito ao time, não abre pra qualquer origem.
const vercelPreviewOrigin =
  /^https:\/\/painel-administrat[a-z0-9-]*-christiane-piller-jesuss-projects\.vercel\.app$/;

function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true; // sem Origin (curl, healthcheck, same-origin)
  if (allowedOrigins.includes(origin)) return true;
  return vercelPreviewOrigin.test(origin);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      callback(new Error('Origin não permitida pelo CORS'));
    },
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
app.use('/api/melhor-envio', melhorEnvioRoutes);
app.use('/api/admin/carts', adminCartRoutes);
app.use('/api/admin/reports', adminReportRoutes);
app.use('/api/admin/customers', adminCustomerRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = Number(process.env.PORT) || 3334;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  startBlingAutoPush();
  startMeTokenRefreshJob();
});

export default app;