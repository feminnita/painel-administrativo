import { Router } from "express";
import * as HeroSlideController from "../../controllers/hero/HeroSlideController";
import { requireAdminAuth } from "../../middleware/AuthMiddleware";

export const adminHeroSlideRoutes = Router();
adminHeroSlideRoutes.use(requireAdminAuth);

adminHeroSlideRoutes.get('/', HeroSlideController.list);
adminHeroSlideRoutes.post('/', HeroSlideController.create);
adminHeroSlideRoutes.put('/reorder', HeroSlideController.reorder);
adminHeroSlideRoutes.put('/:id', HeroSlideController.update);
adminHeroSlideRoutes.delete('/:id', HeroSlideController.remove);