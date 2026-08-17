import { supabase } from '../lib/supabase';

/**
 * Serviço de Notificações (Email + WhatsApp)
 * Centraliza o envio de notificações do sistema
 */

interface NotificationPayload {
  to: string;
  subject?: string;
  message: string;
  type: 'email' | 'whatsapp' | 'both';
  template?: 'activation' | 'overdue' | 'welcome' | 'custom';
  variables?: Record<string, string>;
}

export const notificationService = {
  /**
   * Envia notificação de ativação de campanha
   */
  async sendActivationNotification(
    orgId: string,
    candidateName: string,
    paymentInfo: { billingType: string; value: number },
    adminContacts: Array<{ email?: string; phone?: string; name?: string }>
  ) {
    const activationMessage = this.buildActivationMessage(candidateName, paymentInfo);
    const emailHtml = this.buildActivationEmail(candidateName, paymentInfo);

    const results = {
      whatsapp: [] as Array<{ to: string; success: boolean }>,
      email: [] as Array<{ to: string; success: boolean }>
    };

    for (const contact of adminContacts) {
      // Enviar WhatsApp
      if (contact.phone) {
        const whatsappResult = await this.sendWhatsApp(contact.phone, activationMessage);
        results.whatsapp.push({ to: contact.phone, success: whatsappResult.success });
      }

      // Enviar Email
      if (contact.email) {
        const emailResult = await this.sendEmail(
          contact.email,
          `✅ Campanha "${candidateName}" Ativada - Gestão Eleitoral`,
          emailHtml
        );
        results.email.push({ to: contact.email, success: emailResult.success });
      }
    }

    return results;
  },

  /**
   * Envia notificação de pagamento vencido
   */
  async sendOverdueNotification(
    orgId: string,
    candidateName: string,
    adminContacts: Array<{ email?: string; phone?: string; name?: string }>
  ) {
    const overdueMessage = `⚠️ *PAGAMENTO VENCIDO - CAMPANHA EM RISCO*\n\n` +
      `Olá! O pagamento da campanha *${candidateName}* está em atraso.\n\n` +
      `📅 *Data de vencimento:* ${new Date().toLocaleDateString('pt-BR')}\n` +
      `🔴 *Status:* Assinatura suspensa\n\n` +
      `Para reativar sua campanha imediatamente:\n` +
      `1. Acesse a plataforma\n` +
      `2. Clique em "Regularizar Pagamento"\n` +
      `3. Escolha PIX para ativação instantânea\n\n` +
      `🤖 Sistema de Gestão Eleitoral`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #E53E3E; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">⚠️ Pagamento Vencido</h1>
        </div>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
          <p>Olá,</p>
          <p>O pagamento da campanha <strong>${candidateName}</strong> está em atraso e sua assinatura foi suspensa.</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #E53E3E;">
            <p style="margin: 5px 0;"><strong>Data de vencimento:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> Suspensa</p>
          </div>
          <p>Para reativar imediatamente, acesse a plataforma e regularize o pagamento via PIX.</p>
          <a href="${process.env.SITE_URL || 'https://seu-dominio.com'}" style="display: inline-block; background: #E53E3E; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Regularizar Agora</a>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">Sistema de Gestão Eleitoral Inteligente</p>
        </div>
      </div>
    `;

    const results = {
      whatsapp: [] as Array<{ to: string; success: boolean }>,
      email: [] as Array<{ to: string; success: boolean }>
    };

    for (const contact of adminContacts) {
      if (contact.phone) {
        const whatsappResult = await this.sendWhatsApp(contact.phone, overdueMessage);
        results.whatsapp.push({ to: contact.phone, success: whatsappResult.success });
      }

      if (contact.email) {
        const emailResult = await this.sendEmail(
          contact.email,
          `⚠️ Pagamento Vencido - Campanha "${candidateName}"`,
          emailHtml
        );
        results.email.push({ to: contact.email, success: emailResult.success });
      }
    }

    return results;
  },

  /**
   * Constrói mensagem de WhatsApp para ativação
   */
  buildActivationMessage(candidateName: string, paymentInfo: { billingType: string; value: number }): string {
    return `✅ *CAMPANHA ATIVADA AUTOMATICAMENTE*\n\n` +
      `🎉 Olá! Sua campanha *${candidateName}* foi ativada com sucesso!\n\n` +
      `📅 *Data de ativação:* ${new Date().toLocaleString('pt-BR')}\n` +
      `💳 *Pagamento confirmado:* ${paymentInfo.billingType || 'Não informado'} - R$ ${paymentInfo.value?.toFixed(2).replace('.', ',') || '0,00'}\n\n` +
      `🚀 *Próximos passos:*\n` +
      `1. Acesse sua plataforma: ${process.env.SITE_URL || 'https://seu-dominio.com'}\n` +
      `2. Configure sua equipe de coordenadores\n` +
      `3. Comece a cadastrar eleitores\n\n` +
      `💡 *Dica:* Use o PIX para pagamentos futuros e tenha ativação instantânea!\n\n` +
      `🤖 *Sistema de Gestão Eleitoral Inteligente*`;
  },

  /**
   * Constrói HTML de email para ativação
   */
  buildActivationEmail(candidateName: string, paymentInfo: { billingType: string; value: number }): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #003366; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">✅ Campanha Ativada!</h1>
        </div>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
          <p>Olá,</p>
          <p>Sua campanha <strong>${candidateName}</strong> foi ativada automaticamente após a confirmação do pagamento.</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #E6A100;">
            <p style="margin: 5px 0;"><strong>Data de ativação:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            <p style="margin: 5px 0;"><strong>Pagamento:</strong> ${paymentInfo.billingType || 'Não informado'} - R$ ${paymentInfo.value?.toFixed(2).replace('.', ',') || '0,00'}</p>
          </div>
          <p>Agora você pode acessar a plataforma completa e começar a gerenciar sua campanha eleitoral.</p>
          <a href="${process.env.SITE_URL || 'https://seu-dominio.com'}" style="display: inline-block; background: #003366; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Acessar Plataforma</a>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">Sistema de Gestão Eleitoral Inteligente</p>
        </div>
      </div>
    `;
  },

  /**
   * Envia mensagem via WhatsApp (integração com provedor externo)
   * NOTA: Implementar com seu provedor (Twilio, Z-API, WPPConnect, etc.)
   */
  async sendWhatsApp(phone: string, message: string): Promise<{ success: boolean; error?: any }> {
    try {
      // Normalizar telefone para formato internacional
      const cleanPhone = phone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

      console.log(`[WhatsApp] Enviando para ${formattedPhone}: ${message.substring(0, 100)}...`);

      // INTEGRAÇÃO REAL - Descomente e configure seu provedor:
      /*
      // Exemplo com Z-API:
      const response = await fetch(`https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formattedPhone,
          message,
          delayMessage: 1000
        })
      });

      if (!response.ok) throw new Error('Falha no envio WhatsApp');
      */

      // Exemplo com Twilio:
      /*
      const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          To: `whatsapp:+${formattedPhone}`,
          Body: message
        })
      });

      if (!twilioResponse.ok) throw new Error('Falha no envio Twilio');
      */

      // Simulação de sucesso para desenvolvimento
      return { success: true };
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      return { success: false, error };
    }
  },

  /**
   * Envia email (integração com provedor externo)
   * NOTA: Implementar com seu provedor (SendGrid, Mailgun, AWS SES, etc.)
   */
  async sendEmail(email: string, subject: string, htmlContent: string): Promise<{ success: boolean; error?: any }> {
    try {
      console.log(`[Email] Enviando para ${email}: ${subject}`);

      // INTEGRAÇÃO REAL - Descomente e configure seu provedor:
      /*
      // Exemplo com SendGrid:
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }], subject }],
          from: { email: process.env.FROM_EMAIL || 'noreply@gestaoeleitoral.com', name: 'Gestão Eleitoral' },
          content: [{ type: 'text/html', value: htmlContent }]
        })
      });

      if (!response.ok) throw new Error('Falha no envio SendGrid');
      */

      // Exemplo com Mailgun:
      /*
      const formData = new FormData();
      formData.append('from', `Gestão Eleitoral <${process.env.MAILGUN_FROM}>`);
      formData.append('to', email);
      formData.append('subject', subject);
      formData.append('html', htmlContent);

      const response = await fetch(`https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Falha no envio Mailgun');
      */

      // Simulação de sucesso para desenvolvimento
      return { success: true };
    } catch (error) {
      console.error('Erro ao enviar Email:', error);
      return { success: false, error };
    }
  },

  /**
   * Envia notificação de ativação para o usuário que criou a campanha
   */
  async sendUserActivationNotification(
    orgId: string,
    candidateName: string,
    userEmail?: string,
    userPhone?: string,
    paymentInfo?: { billingType: string; value: number }
  ) {
    const activationMessage = this.buildUserActivationMessage(candidateName, paymentInfo);
    const emailHtml = this.buildUserActivationEmail(candidateName, paymentInfo);

    const results = {
      whatsapp: false,
      email: false
    };

    // Enviar WhatsApp se tiver telefone
    if (userPhone) {
      const whatsappResult = await this.sendWhatsApp(userPhone, activationMessage);
      results.whatsapp = whatsappResult.success;
    }

    // Enviar Email se tiver email
    if (userEmail) {
      const emailResult = await this.sendEmail(
        userEmail,
        `✅ Sua Campanha "${candidateName}" Foi Ativada!`,
        emailHtml
      );
      results.email = emailResult.success;
    }

    console.log(`[Notificação Usuário] Org: ${orgId}, WhatsApp: ${results.whatsapp}, Email: ${results.email}`);
    return results;
  },

  /**
   * Constrói mensagem de WhatsApp para ativação (para o usuário)
   */
  buildUserActivationMessage(candidateName: string, paymentInfo?: { billingType: string; value: number }): string {
    return `✅ *SUA CAMPANHA FOI ATIVADA!*\n\n` +
      `🎉 Parabéns! Sua campanha *${candidateName}* está ativa e pronta para uso!\n\n` +
      `📅 *Data de ativação:* ${new Date().toLocaleString('pt-BR')}\n` +
      `${paymentInfo ? `💳 *Pagamento:* ${paymentInfo.billingType || 'Confirmado'} - R$ ${paymentInfo.value?.toFixed(2).replace('.', ',') || '0,00'}\n\n` : '\n'}` +
      `🚀 *Próximos passos:*\n` +
      `1. Acesse sua plataforma: ${process.env.SITE_URL || 'https://seu-dominio.com'}\n` +
      `2. Configure sua equipe de coordenadores\n` +
      `3. Comece a cadastrar eleitores\n` +
      `4. Use a Inteligência Artificial para estratégias\n\n` +
      `💡 *Suporte:* Precisando de ajuda? Fale com nosso consultor!\n\n` +
      `🤖 *Sistema de Gestão Eleitoral Inteligente*`;
  },

  /**
   * Constrói HTML de email para ativação (para o usuário)
   */
  buildUserActivationEmail(candidateName: string, paymentInfo?: { billingType: string; value: number }): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #003366, #004080); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">✅ Campanha Ativada!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Sua campanha está pronta para vencer</p>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; line-height: 1.6;">Olá,</p>
          <p style="font-size: 16px; line-height: 1.6;">Temos ótimas notícias! Sua campanha <strong>${candidateName}</strong> foi ativada com sucesso e já está pronta para uso.</p>
          
          ${paymentInfo ? `
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #E6A100; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <p style="margin: 8px 0; font-size: 14px;"><strong>Data de ativação:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            <p style="margin: 8px 0; font-size: 14px;"><strong>Pagamento confirmado:</strong> ${paymentInfo.billingType || 'Não informado'} - R$ ${paymentInfo.value?.toFixed(2).replace('.', ',') || '0,00'}</p>
          </div>
          ` : ''}
          
          <p style="font-size: 16px; line-height: 1.6;">Agora você pode acessar a plataforma completa e começar a gerenciar sua campanha eleitoral com todas as funcionalidades:</p>
          
          <ul style="margin: 20px 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
            <li>✅ Gestão completa de eleitores</li>
            <li>✅ Inteligência Artificial integrada</li>
            <li>✅ Automação de WhatsApp</li>
            <li>✅ Relatórios em PDF e Excel</li>
            <li>✅ Monitoramento em tempo real</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.SITE_URL || 'https://seu-dominio.com'}" style="display: inline-block; background: linear-gradient(135deg, #D4AF37, #F0D060); color: #0a0f1e; padding: 15px 35px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(212,175,55,0.3);">Acessar Plataforma Agora</a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            Precisando de ajuda? Fale com nosso consultor pelo WhatsApp: <a href="https://wa.me/5591993837093" style="color: #003366;">(91) 99383-7093</a>
          </p>
          
          <p style="margin-top: 20px; font-size: 12px; color: #999;">Sistema de Gestão Eleitoral Inteligente</p>
        </div>
      </div>
    `;
  },

  /**
   * Busca contatos admin de uma organização
   */
  async getAdminContacts(orgId: string): Promise<Array<{ email?: string; phone?: string; name?: string }>> {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, phone, full_name')
      .eq('organization_id', orgId)
      .in('role', ['super_admin', 'candidate', 'general_coordination']);

    if (error) {
      console.error('Erro ao buscar contatos admin:', error);
      return [];
    }

    return data || [];
  },



  /**
   * Testa envio de notificações (para desenvolvimento)
   */
  async testNotifications(contact: { email?: string; phone?: string }) {
    const testMessage = `🧪 *TESTE DE NOTIFICAÇÃO*\n\nEste é um teste do sistema de notificações da Gestão Eleitoral Inteligente.\n\nSe você recebeu esta mensagem, a integração está funcionando! ✅\n\n🤖 Sistema de Testes`;
    const testEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #003366; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">🧪 Teste de Notificação</h1>
        </div>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
          <p>Este é um teste do sistema de notificações da Gestão Eleitoral Inteligente.</p>
          <p>Se você recebeu este email, a integração está funcionando! ✅</p>
        </div>
      </div>
    `;

    const results = { whatsapp: false, email: false };

    if (contact.phone) {
      const whatsappResult = await this.sendWhatsApp(contact.phone, testMessage);
      results.whatsapp = whatsappResult.success;
    }

    if (contact.email) {
      const emailResult = await this.sendEmail(contact.email, '🧪 Teste - Gestão Eleitoral', testEmailHtml);
      results.email = emailResult.success;
    }

    return results;
  }
};

export default notificationService;