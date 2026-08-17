import type { Handler } from "@netlify/functions";

const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';
const ASAAS_BASE_URL = 'https://api.asaas.com/v3'; // Produção

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { name, email, cpfCnpj, phone, paymentMethod, orgId, plan } = body;

    if (!name || !email || !cpfCnpj) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Nome, e-mail e CPF/CNPJ são obrigatórios.' }),
      };
    }

    let amount = 299.00;
    let planDescription = 'Assinatura Mensal - Plataforma Eleitoral de Elite (Full)';
    if (plan === 'premium') {
      amount = 499.00;
      planDescription = 'Assinatura Mensal - Plataforma Eleitoral de Elite (Premium)';
    } else if (plan === 'starter') {
      amount = 599.00;
      planDescription = 'Assinatura Mensal - Plataforma Eleitoral de Elite (Starter)';
    }

    const billingType = paymentMethod === 'pix' ? 'PIX' : paymentMethod === 'card' ? 'CREDIT_CARD' : 'BOLETO';

    // 1. Criar ou buscar cliente
    const customerRes = await fetch(`${ASAAS_BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'access_token': ASAAS_API_KEY,
        'User-Agent': 'SistemaGestaoEleitoral/1.0.0',
      },
      body: JSON.stringify({ name, email, cpfCnpj, mobilePhone: phone }),
    });

    const customer = await customerRes.json();
    if (!customerRes.ok || customer.errors) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: customer.errors?.[0]?.description || 'Erro ao criar cliente no Asaas.' }),
      };
    }

    // 2. Criar Assinatura (Recorrência)
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 3); // primeira cobrança vence em 3 dias
    const nextDueDateStr = nextDueDate.toISOString().split('T')[0];

    const subRes = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'access_token': ASAAS_API_KEY,
        'User-Agent': 'SistemaGestaoEleitoral/1.0.0',
      },
      body: JSON.stringify({
        customer: customer.id,
        billingType,
        value: amount,
        nextDueDate: nextDueDateStr,
        cycle: 'MONTHLY', // Assinatura Mensal
        description: planDescription,
        externalReference: orgId || null,
      }),
    });

    const subscription = await subRes.json();
    if (!subRes.ok || subscription.errors) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: subscription.errors?.[0]?.description || 'Erro ao criar assinatura no Asaas.' }),
      };
    }

    // 3. Retornar dados da cobrança
    // Buscamos a primeira cobrança da assinatura com tentativas (retry loop) caso o Asaas crie de forma assíncrona
    let charge: any = {};
    for (let i = 0; i < 4; i++) {
      const paymentsRes = await fetch(`${ASAAS_BASE_URL}/subscriptions/${subscription.id}/payments`, {
        headers: { 'access_token': ASAAS_API_KEY }
      });
      if (paymentsRes.ok) {
        const payments = await paymentsRes.json();
        if (payments.data && payments.data.length > 0) {
          charge = payments.data[0];
          break;
        }
      }
      // Aguarda 1 segundo antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Se mesmo após as tentativas não retornou a cobrança da assinatura, criamos uma cobrança avulsa de entrada como fallback garantido
    if (!charge.id) {
      const fallbackRes = await fetch(`${ASAAS_BASE_URL}/payments`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'access_token': ASAAS_API_KEY,
          'User-Agent': 'SistemaGestaoEleitoral/1.0.0',
        },
        body: JSON.stringify({
          customer: customer.id,
          billingType,
          value: amount,
          dueDate: nextDueDateStr,
          description: planDescription + ' (Entrada)',
          externalReference: orgId || null,
        }),
      });
      if (fallbackRes.ok) {
        charge = await fallbackRes.json();
      }
    }

    // 4. Se for PIX, buscar o QR Code no endpoint específico do Asaas
    let pixQrCode = null;
    let pixQrCodeImage = null;

    if (charge.id && billingType === 'PIX') {
      const pixRes = await fetch(`${ASAAS_BASE_URL}/payments/${charge.id}/pixQrCode`, {
        headers: { 'access_token': ASAAS_API_KEY }
      });
      if (pixRes.ok) {
        const pixData = await pixRes.json();
        pixQrCode = pixData.payload;
        pixQrCodeImage = pixData.encodedImage;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        subscriptionId: subscription.id,
        chargeId: charge.id,
        status: charge.status || 'PENDING',
        invoiceUrl: charge.invoiceUrl || charge.bankSlipUrl || subscription.invoiceUrl,
        pixQrCode,
        pixQrCodeImage,
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Erro interno no servidor ao processar Asaas.' }),
    };
  }
};

