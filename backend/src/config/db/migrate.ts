import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

async function runMigrations() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('sslmode=require')
            ? { rejectUnauthorized: false }
            : false,
    });

    const db = drizzle(pool);

    console.log('⏳ Executando migrations...');

    try {
        await migrate(db, {
            migrationsFolder: './src/config/db/migrations',
        });
        console.log('✅ Migrations aplicadas com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao aplicar migrations:', error);
        process.exit(1);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

runMigrations();