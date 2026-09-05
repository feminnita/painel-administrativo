import * as EmailClient from '../client/EmailClients';
import type { OrderEmailData } from '../types';

function formatBRL(value: string): string {
    return `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export async function sendAdminPasswordReset(data: { to: string; resetUrl: string }) {
    await EmailClient.sendEmail({
        to: data.to,
        subject: 'Redefinição de senha - Painel Feminnita',
        html: `
        <h2>Redefinição de senha</h2>
        <p>Recebemos um pedido para redefinir a senha do seu acesso ao painel administrativo da Feminnita.</p>
        <p>Clique no link abaixo para cadastrar uma nova senha. Ele é válido por <strong>30 minutos</strong> e pode ser usado uma única vez.</p>
        <p><a href="${escapeHtml(data.resetUrl)}" style="display:inline-block;padding:12px 20px;background:#8C2F39;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;">Redefinir minha senha</a></p>
        <p style="font-size:12px;color:#666;">Se o botão não funcionar, copie e cole este endereço no navegador:<br>${escapeHtml(data.resetUrl)}</p>
        <p>Se não foi você que solicitou, ignore este e-mail — sua senha continua a mesma.</p>
        <p>— Equipe Feminnita</p>
      `,
    });
}

export async function sendOrderReceived(data: OrderEmailData) {
    try {
        await EmailClient.sendEmail({
            to: data.customerEmail,
            subject: `Recebemos seu pedido ${data.orderNumber}`,
            html: `<h2>Oi, ${escapeHtml(data.customerName)}!</h2>
        <p>Seu pedido <strong>${data.orderNumber}</strong> foi recebido e está aguardando o pagamento.</p>
        <p>Total: <strong>${formatBRL(data.total)}</strong></p>
        <p>Assim que o pagamento for confirmado, te avisamos por aqui.</p>
        <p>— Equipe Feminnita</p>
            `,
        })
    } catch (error) {
        console.error(`E-mail "pedido recebido" falhou (${data.orderNumber}): `, error)
    }
}

export async function sendPaymentConfirmed(data: OrderEmailData) {
    try {
        await EmailClient.sendEmail({
            to: data.customerEmail,
            subject: `Pagamento confirmado - ${data.orderNumber}`,
            html: `<h2>Oba, ${escapeHtml(data.customerName)}! </h2> 
            <p> O pagamento do pedido <strong>${data.orderNumber} </strong> foi confirmado.</p>
                <p>Total: <strong>${formatBRL(data.total)} </strong></p >
                <p>Já estamos preparando tudo para o envio — você recebe o código de rastreio assim que despachar.</p>
                <p>— Equipe Feminnita </p>

            `,
        });
    } catch (error) {
        console.error(`E-mail "pagamento confirmado" falhou (${data.orderNumber}):`, error);
    }
}

export async function sendOrderShipped(data: OrderEmailData & { trackingCode?: string | null }) {
    try {
        await EmailClient.sendEmail({
            to: data.customerEmail,
            subject: `Seu pedido ${data.orderNumber} está a caminho`,
            html: `
        <h2>Boa notícia, ${escapeHtml(data.customerName)}!</h2>
        <p>Seu pedido <strong>${data.orderNumber}</strong> foi despachado.</p>
        ${data.trackingCode ? `<p>Código de rastreio: <strong>${escapeHtml(data.trackingCode)}</strong></p>` : ''}
        <p>Acompanhe a entrega na sua conta no site da Feminnita.</p>
        <p>— Equipe Feminnita</p>
      `,
        });
    } catch (error) {
        console.error(`E-mail "pedido a caminho" falhou (${data.orderNumber}):`, error);
    }
}
