import 'dotenv/config';
import { eq } from 'drizzle-orm';
import * as readline from 'node:readline';
import { db } from '../../../config/db';
import { adminUsers } from '../schema';
import { hashPassword } from '../../../lib/security/password';

// Redefine a senha de um admin JÁ EXISTENTE, lendo a nova senha por entrada
// OCULTA (sem eco). O valor nunca aparece na tela, nem em argv, env, log ou
// histórico — só quem digita sabe. Feito pra rodar no Render Shell do serviço
// (tem DATABASE_URL na env). Roda com `node dist/...` (não depende de tsx).
function askHidden(question: string): Promise<string> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        // Suprime o eco dos caracteres digitados (senha não aparece na tela).
        (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = () => {};
        process.stdout.write(question);
        rl.question('', (answer) => {
            rl.close();
            process.stdout.write('\n');
            resolve(answer.trim());
        });
    });
}

async function main() {
    const email = (process.argv[2] || 'feminnita@gmail.com').trim();
    const senha = await askHidden(`Nova senha para ${email} (digite oculto e ENTER): `);

    if (!senha || senha.length < 8) {
        console.error('Senha muito curta (mínimo 8 caracteres). Nada foi alterado.');
        process.exit(1);
    }

    const passwordHash = await hashPassword(senha);
    const [updated] = await db
        .update(adminUsers)
        .set({ passwordHash })
        .where(eq(adminUsers.email, email))
        .returning();

    if (!updated) {
        console.error(`Conta não encontrada: ${email}. Nada foi alterado.`);
        process.exit(1);
    }

    console.log(`Senha atualizada para ${updated.email}. Já pode entrar no painel.`);
    process.exit(0);
}

main().catch((e) => {
    console.error('Falha ao redefinir senha:', e instanceof Error ? e.message : e);
    process.exit(1);
});
