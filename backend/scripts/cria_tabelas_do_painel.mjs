/**
 * Cria as 4 tabelas que so o painel usa e que nenhuma migracao cria.
 *
 * Elas nunca entraram nas migracoes — foram feitas direto no banco ao longo do
 * tempo. Num banco novo, montado a partir das migracoes, elas simplesmente nao
 * nascem: o `drizzle-kit push` da loja, que so conhece o schema da loja, ainda
 * derruba as que existirem. Por isso este arquivo, rodado DEPOIS dos pushes.
 *
 * O DDL saiu das definicoes drizzle do painel (schema/product/*, schema/users/*)
 * e da migracao 0002 do Melhor Envio.
 *
 * Idempotente: tudo com IF NOT EXISTS.
 *
 * Uso: DATABASE_URL_DESTINO=... node scripts/cria_tabelas_do_painel.mjs
 */
import pg from 'pg';

const DESTINO = process.env.DATABASE_URL_DESTINO;
if (!DESTINO) {
    console.error('ERRO: defina DATABASE_URL_DESTINO.');
    process.exit(1);
}

const COMANDOS = [
    ['me_tokens', `
        CREATE TABLE IF NOT EXISTS "me_tokens" (
            "id" text PRIMARY KEY NOT NULL,
            "access_token" text NOT NULL,
            "refresh_token" text NOT NULL,
            "expires_at" timestamp with time zone NOT NULL,
            "scope" text,
            "updated_at" timestamp with time zone DEFAULT now()
        )`],

    ['product_categories', `
        CREATE TABLE IF NOT EXISTS "product_categories" (
            "product_id" uuid NOT NULL REFERENCES "products"("id"),
            "category_id" uuid NOT NULL REFERENCES "categories"("id"),
            "created_at" timestamp with time zone DEFAULT now(),
            PRIMARY KEY ("product_id", "category_id")
        )`],

    ['admin_password_reset_tokens', `
        CREATE TABLE IF NOT EXISTS "admin_password_reset_tokens" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "admin_id" uuid NOT NULL REFERENCES "admin_users"("id"),
            "token_hash" text NOT NULL,
            "expires_at" timestamp with time zone NOT NULL,
            "used_at" timestamp with time zone,
            "created_at" timestamp with time zone DEFAULT now()
        )`],

    ['product_deleted_variations', `
        CREATE TABLE IF NOT EXISTS "product_deleted_variations" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
            "color_key" text NOT NULL,
            "size_key" text NOT NULL,
            "color_name" text,
            "size_name" text,
            "deleted_at" timestamp with time zone DEFAULT now() NOT NULL
        )`],

    ['deleted_variations_unica (indice)', `
        CREATE UNIQUE INDEX IF NOT EXISTS "deleted_variations_unica"
            ON "product_deleted_variations" ("product_id", "color_key", "size_key")`],
];

const cliente = new pg.Client({ connectionString: DESTINO, ssl: { rejectUnauthorized: false } });

try {
    await cliente.connect();
    let erros = 0;
    for (const [nome, sql] of COMANDOS) {
        try {
            await cliente.query(sql);
            console.log(`  ok   ${nome}`);
        } catch (e) {
            erros += 1;
            console.log(`  ERRO ${nome}: ${e.message}`);
        }
    }
    const { rows } = await cliente.query(
        `select count(*)::int n from pg_tables where schemaname = 'public'`,
    );
    console.log(`\ntabelas no banco: ${rows[0].n}`);
    process.exitCode = erros ? 1 : 0;
} catch (e) {
    console.error('ERRO:', e.message);
    process.exitCode = 1;
} finally {
    await cliente.end().catch(() => {});
}
