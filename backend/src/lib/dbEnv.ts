// Deriva o RÓTULO do ambiente a partir da conexão REAL (process.env.DATABASE_URL).
// NUNCA retorna a connection string nem a senha — só o rótulo e o "ep-id".
// Mapa: ep-holy-term => producao ; ep-rapid-sun => teste ; resto => desconhecido.

export type DbEnvLabel = 'producao' | 'teste' | 'desconhecido';

export interface DbEnvInfo {
    env: DbEnvLabel;
    endpoint: string;
}

// Extrai só o id do endpoint Neon (ex.: "ep-holy-term-a1b2c3d4") do host.
// Nunca expõe usuario/senha: parseia o host e descarta o resto.
function extractEndpoint(url: string | undefined): string {
    if (!url) return '';
    try {
        const host = new URL(url).hostname; // ep-xxxx-...-pooler.regiao.aws.neon.tech
        const first = host.split('.')[0]; // ep-xxxx-...-pooler
        return first.replace(/-pooler$/, '');
    } catch {
        const match = url.match(/ep-[a-z0-9]+(?:-[a-z0-9]+)*/i);
        return match ? match[0].replace(/-pooler$/, '') : '';
    }
}

export function deriveDbEnv(url: string | undefined): DbEnvInfo {
    const endpoint = extractEndpoint(url);
    let env: DbEnvLabel = 'desconhecido';
    if (endpoint.includes('ep-holy-term')) env = 'producao';
    else if (endpoint.includes('ep-rapid-sun')) env = 'teste';
    return { env, endpoint };
}
