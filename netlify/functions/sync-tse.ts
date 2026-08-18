import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const handler: Handler = async (event, context) => {
  // Apenas aceita POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' };
  }

  try {
    // URL do TSE para 2026 (atualizada)
    const tseUrl = process.env.TSE_API_URL || "https://dados.tse.jus.br/eleicoes/2026/resultados/";

    console.log('🔄 Sincronizando via Netlify Function...');
    const response = await axios.get(tseUrl, { timeout: 30000 });
    const dados = response.data;

    // Estrutura genérica para dados do TSE
    let candidates: any[] = [];
    if (dados.cand) {
      candidates = dados.cand;
    } else if (Array.isArray(dados)) {
      candidates = dados;
    } else if (dados.candidatos) {
      candidates = dados.candidatos;
    }

    if (candidates.length === 0) {
      throw new Error('Nenhum candidato encontrado no retorno do TSE.');
    }

    const insertData = candidates.map((cand: any) => ({
      city: cand.municipio || 'BRASÍLIA',
      zone: String(cand.zona || cand.NR_ZONA || '001'),
      section: String(cand.secao || cand.NR_SECAO || '0001'),
      candidate_name: cand.nm || cand.NM_VOTAVEL || cand.nome || 'CANDIDATO',
      votes: parseInt(cand.vap || cand.QT_VOTOS || cand.votos || '0') || 0,
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
