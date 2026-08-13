import 'dotenv/config';
import { db } from '../../../config/db';
import { adminUsers } from '../schema';
import { hashPassword } from '../../../lib/security/password';

async function main() {
    const [, , email, password, name] = process.argv;

    if (!email || !password) {
        console.error('Uso: npm run db:seed-admin -- <email> < password> [name]');
        process.exit(1);
    }

    const passwordHash = await hashPassword(password);
    const [admin] = await db.insert(adminUsers).values({
        name: name ?? 'Admin', email, passwordHash, role: 'owner'
    }).returning();

    console.log('Admin criado:', admin.email);
    process.exit(0);
}
main();