import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const handler: Handler = async (event, context) => {
  // Apenas aceita POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' };
  }

  try {
    const tseUrl = "https://resultados.tse.jus.br/oficial/ele2022/544/dados-simplificados/df/df-c0001-e000544-r.json";
    
    console.log('🔄 Sincronizando via Netlify Function...');
    const response = await axios.get(tseUrl);
    const dados = response.data;

    if (!dados.cand) {
      throw new Error('Formato de JSON do TSE inválido.');
    }

    const insertData = dados.cand.map((cand: any) => ({
      city: 'BRASÍLIA',
      zone: '001',
      section: '0001',
      candidate_name: cand.nm,
      votes: parseInt(cand.vap) || 0,
      election_year: 2026
    }));

    const { error } = await supabase
      .from('electoral_results')
      .upsert(insertData, { 
        onConflict: 'city,zone,section,candidate_name,election_year',
        ignoreDuplicates: true 
      });

    if (error) throw error;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: `${insertData.length} registros processados online!` })
    };
  } catch (err: any) {
    console.error('Erro na função:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};

export { handler };
