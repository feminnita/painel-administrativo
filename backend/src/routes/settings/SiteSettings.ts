import { Router } from "express";
import * as SiteSettings from '../../controllers/settings/SiteSettings';
import { requireAdminAuth } from "../../middleware/AuthMiddleware";

export const adminSiteSettingsRoutes = Router();
adminSiteSettingsRoutes.use(requireAdminAuth);

adminSiteSettingsRoutes.get('/', SiteSettings.list);
adminSiteSettingsRoutes.put('/:key', SiteSettings.save)


