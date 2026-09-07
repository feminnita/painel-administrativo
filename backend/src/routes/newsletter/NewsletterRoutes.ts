import { Router } from 'express';
import * as NewsletterController from '../../controllers/newsletter/NewsletterController';
import { requireAdminAuth } from '../../middleware/AuthMiddleware';

// Só leitura e exportação: quem entra e quem sai da lista se decide na loja
// (pop-up e link de descadastro), nunca por dentro do painel.
export const adminNewsletterRoutes = Router();

adminNewsletterRoutes.get('/', requireAdminAuth, NewsletterController.list);
adminNewsletterRoutes.get('/export', requireAdminAuth, NewsletterController.exportCsv);
