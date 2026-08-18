import { Handler } from '@netlify/functions';

const handler: Handler = async (event, context) => {
  // CORS Headers for preflight options and cross-origin security
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  try {
    const { recipients, subject, body, fromOverride, themeColor, ctaText, ctaUrl, bannerText } = JSON.parse(event.body || '{}');

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nenhum destinatário fornecido.' }) };
    }

    if (!subject || !body) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Assunto e corpo do e-mail são obrigatórios.' }) };
    }

    const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY || '';
    const fromEmail = fromOverride || process.env.EMAIL_FROM || process.env.VITE_EMAIL_FROM || 'Campanha Eleitoral <onboarding@resend.dev>';
    if (!resendApiKey) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Chave de API do Resend (RESEND_API_KEY) não está configurada no seu arquivo .env. Por favor, crie uma conta gratuita em resend.com e adicione a chave ao arquivo.'
        })
      };
    }

    // Cores e Configurações Visuais
    const primaryColor = themeColor || '#0c4a6e'; // Padrão: Azul Cívico
    const headerBanner = bannerText || 'CONEXÃO ESTRATÉGICA 2026';

    console.log(`✉️ Iniciando disparo em massa de ${recipients.length} e-mails via Resend...`);

    const results = [];
    
    // Dispara sequencialmente com um pequeno delay para evitar hitting rate-limits do plano gratuito do Resend
    for (const recipient of recipients) {
      const email = recipient.email?.trim();
      const name = recipient.name?.trim() || 'Apoiador';

      if (!email || !email.includes('@')) {
        results.push({ email, name, status: 'error', reason: 'E-mail inválido' });
        continue;
      }

      // Personaliza o Assunto e o Corpo do E-mail para cada destinatário
      const personalizedSubject = subject.replace(/{nome}/g, name).replace(/{nome_eleitor}/g, name);
      const personalizedBody = body.replace(/{nome}/g, name).replace(/{nome_eleitor}/g, name);

      // Bloco HTML do Botão Call to Action se configurado
      let ctaHtml = '';
      if (ctaText && ctaUrl) {
        ctaHtml = `
          <div style="margin-top: 32px; margin-bottom: 24px; text-align: center;">
            <a href="${ctaUrl}" target="_blank" style="background-color: ${primaryColor}; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; display: inline-block; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.12);">
              ${ctaText}
            </a>
          </div>
        `;
      }

      // Template HTML Premium da Campanha
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${personalizedSubject}</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 0;">
            <tr>
              <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 6px 12px -2px rgba(0, 0, 0, 0.08);">
                  <!-- Banner Decorativo Superior -->
                  <tr>
                    <td style="background-color: ${primaryColor}; padding: 28px 24px; text-align: center; border-bottom: 5px solid #eab308;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 19px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">${headerBanner}</h1>
                    </td>
                  </tr>
                  <!-- Conteúdo -->
                  <tr>
                    <td style="padding: 40px 36px; background-color: #ffffff;">
                      <h2 style="color: #0f172a; font-size: 18px; font-weight: 800; margin-top: 0; margin-bottom: 20px; letter-spacing: -0.5px;">Olá, ${name}!</h2>
                      <div style="font-size: 14px; line-height: 1.8; color: #334155; margin-bottom: 12px; font-weight: 500; white-space: pre-wrap;">${personalizedBody.replace(/\n/g, '<br/>')}</div>
                      ${ctaHtml}
                    </td>
                  </tr>
                  <!-- Rodapé -->
                  <tr>
                    <td style="background-color: #f1f5f9; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">Esta é uma mensagem oficial de mobilização da campanha eleitoral 2026.</p>
                      <p style="margin: 8px 0 0 0; font-size: 9px; color: #94a3b8; font-weight: 500; text-transform: uppercase;">Para garantir que nossos e-mails cheguem, adicione este endereço à sua lista de contatos seguros.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromEmail,
            to: email,
            subject: personalizedSubject,
            html: emailHtml
          })
        });

        const resData = await response.json() as any;

        if (response.ok) {
          results.push({ email, name, status: 'success', id: resData.id });
        } else {
          console.error(`Falha no envio para ${email}:`, resData);
          results.push({ email, name, status: 'error', reason: resData.message || 'Erro do provedor Resend' });
        }
      } catch (err: any) {
        console.error(`Erro ao disparar para ${email}:`, err);
        results.push({ email, name, status: 'error', reason: err.message || 'Falha de rede' });
      }

      // Pequeno delay de 120ms para respeitar a taxa limite da API gratuita do Resend
      await new Promise(resolve => setTimeout(resolve, 120));
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failCount = results.length - successCount;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Disparo finalizado!',
        results,
        summary: {
          total: recipients.length,
          success: successCount,
          failed: failCount
        }
      })
    };
  } catch (err: any) {
    console.error('Erro na função send-bulk-email:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Erro interno no servidor' })
    };
  }
};

export { handler };
