import { supabase } from '../lib/supabase';
import notificationService from './notifications';
import { Organization } from '../types';

/**
 * Automação de Faturamento (SaaS)
 * Esta lógica seria executada em uma Edge Function (Supabase) ou Netlify Function
 * para processar avisos de pagamento do Asaas.
 *
 * NOTA: A implementação real está em netlify/functions/asaas-webhook.ts
 * Este arquivo serve como referência/documentação da lógica.
 */
export const billingAutomation = {
  /**
   * Processa webhook do Asaas - Lógica real está na Netlify Function
   * Esta função é mantida para compatibilidade e documentação
   */
  processWebhook: async (asaasCustomerId: string, eventType: 'PAYMENT_CONFIRMED' | 'PAYMENT_OVERDUE') => {
    console.log(`[Billing] Processando evento ${eventType} para cliente ${asaasCustomerId}`);

    if (eventType === 'PAYMENT_CONFIRMED') {
      // Buscar organização antes de atualizar
      const org = await billingAutomation.getOrgByAsaasCustomerId(asaasCustomerId);
      if (!org) throw new Error('Organização não encontrada');
      
      const { error } = await supabase
        .from('organizations')
        .update({
          subscription_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('asaas_customer_id', asaasCustomerId);

      if (error) throw error;

      // Enviar notificação de ativação para os admins da organização
      const adminContacts = await notificationService.getAdminContacts(org.id);
      for (const contact of adminContacts) {
        await notificationService.sendUserActivationNotification(
          org.id,
          org.candidate_name,
          contact.email,
          contact.phone
        );
      }

      return { success: true, message: 'Assinatura Ativada!' };
    }

    if (eventType === 'PAYMENT_OVERDUE') {
      // Buscar organização antes de atualizar
      const org = await billingAutomation.getOrgByAsaasCustomerId(asaasCustomerId);
      if (!org) throw new Error('Organização não encontrada');
      
      const { error } = await supabase
        .from('organizations')
        .update({
          subscription_status: 'overdue'
        })
        .eq('asaas_customer_id', asaasCustomerId);

      if (error) throw error;

      // Enviar notificação de pagamento vencido para os admins da organização
      const adminContacts = await notificationService.getAdminContacts(org.id);
      await notificationService.sendOverdueNotification(org.id, org.candidate_name, adminContacts);

      return { success: true, message: 'Assinatura Suspensa!' };
    }
  },

  /**
   * Busca organização por ID do cliente Asaas
   * Lança erro se não encontrar
   */
  getOrgByAsaasCustomerId: async (asaasCustomerId: string): Promise<Organization> => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('asaas_customer_id', asaasCustomerId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Organização não encontrada para o cliente Asaas');
    return data as Organization;
  },

  /**
   * Atualiza status de assinatura manualmente (admin)
   */
  updateSubscriptionStatus: async (orgId: string, status: 'active' | 'overdue' | 'pending') => {
    const { error } = await supabase
      .from('organizations')
      .update({
        subscription_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orgId);

    if (error) throw error;
    return { success: true };
  }
};
