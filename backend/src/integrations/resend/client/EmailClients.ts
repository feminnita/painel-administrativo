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
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
            from: process.env.MAIL_FROM,
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

