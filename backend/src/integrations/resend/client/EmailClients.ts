import { env } from '../../../config/env';

export async function sendEmail(
    input: {
        to: string;
        subject: string;
        html: string
    }) {

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.resend.apiKey}`,
        },
        body: JSON.stringify({
            from: env.resend.mailFrom,
            to: input.to,
            subject: input.subject,
            html: input.html,
        }),
    });

    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`RESEND_ERROR ${response.status}: ${detail}`);
    }
    return response.json();
}
