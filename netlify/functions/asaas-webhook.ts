import type { Handler } from "@netlify/functions";
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Função para enviar notificação via WhatsApp (integração com serviço externo)
async function sendWhatsAppNotification(phone: string, message: string) {
  try {
    // Aqui você integraria com seu provedor de WhatsApp (Twilio, Z-API, WPPConnect, etc.)
    // Por enquanto, logamos a tentativa
    console.log(`[WhatsApp] Enviando para ${phone}: ${message}`);

    // Exemplo de integração com Z-API ou similar:
    // const response = await fetch(`https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-text`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ phone, message })
    // });

    return { success: true };
  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error);
    return { success: false, error };
  }
}

// Função para enviar notificação via Email
async function sendEmailNotification(email: string, subject: string, htmlContent: string) {
  try {
    // Aqui você integraria com seu provedor de email (SendGrid, Mailgun, AWS SES, etc.)
    console.log(`[Email] Enviando para ${email}: ${subject}`);

    // Exemplo com SendGrid:
    // await fetch('https://api.sendgrid.com/v3/mail/send', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${SENDGRID_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     personalizations: [{ to: [{ email }], subject }],
    //     from: { email: 'noreply@gestaoeleitoral.com', name: 'Gestão Eleitoral' },
    //     content: [{ type: 'text/html', value: htmlContent }]
    //   })
    // });

    return { success: true };
  } catch (error) {
    console.error('Erro ao enviar Email:', error);
    return { success: false, error };
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { event: asaasEvent, payment } = body;

    console.log(`Webhook Asaas recebido: ${asaasEvent}`, payment.id);

    // Eventos de sucesso no pagamento
    const successEvents = [
      'PAYMENT_RECEIVED',
      'PAYMENT_CONFIRMED',
      'PAYMENT_CREDITED'
    ];

    if (successEvents.includes(asaasEvent)) {
      const orgId = payment.externalReference;

      if (orgId) {
        console.log(`Atualizando status da organização ${orgId} para 'active'`);

        // 1. Atualizar status da organização
        const { error: updateError, data: orgData } = await supabase
          .from('organizations')
          .update({
            subscription_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', orgId)
          .select()
          .single();

        if (updateError) {
          console.error('Erro ao atualizar Supabase:', updateError);
          return { statusCode: 500, body: 'Erro ao atualizar banco de dados' };
        }

        console.log(`Organização ${orgId} ativada com sucesso!`);

        // 2. Buscar dados da organização para notificações
        if (orgData) {
          // Buscar perfil do admin/master para enviar notificações
          const { data: profiles } = await supabase
            .from('profiles')
            .select('email, full_name, phone')
            .eq('organization_id', orgId)
            .eq('role', 'super_admin');

          // Preparar mensagens de ativação
          const candidateName = orgData.candidate_name || 'Sua Campanha';
          const activationMessage = `✅ *CAMPANHA ATIVADA AUTOMATICAMENTE*\n\n` +
            `🎉 Olá! Sua campanha *${candidateName}* foi ativada com sucesso!\n\n` +
            `📅 *Data de ativação:* ${new Date().toLocaleString('pt-BR')}\n` +
            `💳 *Pagamento confirmado:* ${payment.billingType || 'Não informado'} - R$ ${payment.value || '0,00'}\n\n` +
            `🚀 *Próximos passos:*\n` +
            `1. Acesse sua plataforma: ${process.env.SITE_URL || 'https://seu-dominio.com'}\n` +
            `2. Configure sua equipe de coordenadores\n` +
            `3. Comece a cadastrar eleitores\n\n` +
            `💡 *Dica:* Use o PIX para pagamentos futuros e tenha ativação instantânea!\n\n` +
            `🤖 *Sistema de Gestão Eleitoral Inteligente*`;

          const emailSubject = `✅ Campanha "${candidateName}" Ativada - Gestão Eleitoral`;
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: #003366; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0;">✅ Campanha Ativada!</h1>
              </div>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
                <p>Olá,</p>
                <p>Sua campanha <strong>${candidateName}</strong> foi ativada automaticamente após a confirmação do pagamento.</p>
                <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #E6A100;">
                  <p style="margin: 5px 0;"><strong>Data de ativação:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                  <p style="margin: 5px 0;"><strong>Pagamento:</strong> ${payment.billingType || 'Não informado'} - R$ ${payment.value || '0,00'}</p>
                </div>
                <p>Agora você pode acessar a plataforma completa e começar a gerenciar sua campanha eleitoral.</p>
                <a href="${process.env.SITE_URL || 'https://seu-dominio.com'}" style="display: inline-block; background: #003366; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Acessar Plataforma</a>
                <p style="margin-top: 20px; font-size: 12px; color: #666;">Sistema de Gestão Eleitoral Inteligente</p>
              </div>
            </div>
          `;

          // 3. Enviar notificações para todos os admins da organização
          if (profiles && profiles.length > 0) {
            for (const profile of profiles) {
              // Enviar WhatsApp se tiver telefone
              if (profile.phone) {
                await sendWhatsAppNotification(profile.phone, activationMessage);
              }

              // Enviar Email se tiver email
              if (profile.email) {
                await sendEmailNotification(profile.email, emailSubject, emailHtml);
              }
            }
          }

          // 4. Se não houver perfis, tentar notificar via dados do pagamento
          if ((!profiles || profiles.length === 0) && payment.email) {
            await sendEmailNotification(payment.email, emailSubject, emailHtml);
          }
        }
      } else {
        console.warn('Pagamento recebido sem externalReference (orgId)');
      }
    }

    // Eventos de pagamento vencido/suspenso
    const overdueEvents = ['PAYMENT_OVERDUE', 'PAYMENT_DELETED', 'SUBSCRIPTION_CANCELLED'];
    if (overdueEvents.includes(asaasEvent)) {
      const orgId = payment.externalReference;

      if (orgId) {
        await supabase
          .from('organizations')
          .update({
            subscription_status: 'overdue'
          })
          .eq('id', orgId);

        console.log(`Organização ${orgId} marcada como 'overdue'`);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (err: any) {
    console.error('Erro no Webhook:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
