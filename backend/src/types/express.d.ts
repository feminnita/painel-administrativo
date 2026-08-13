import { InferSelectModel, interfaceSelextModel } from 'drizzle-orm';
import { customers } from '../db/schema';
import { adminUsers } from '../db/schema';

declare global {
    namespace Express {
        interface Request {
            customer?: Pick<InferSelectModel<typeof customers>, 'id' | 'name' | 'email'>;
            admin?: Pick<InferSelectModel<typeof adminUsers>, 'id' | 'name' | 'email' | 'role'>;
        }
    }
}
export { };