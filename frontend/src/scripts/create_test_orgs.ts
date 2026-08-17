import { createClient } from '@supabase/supabase-js'

// OBS: Para este script funcionar fora do navegador com permissão total, 
// ele precisaria da SERVICE_ROLE_KEY. 
// Mas vou tentar usar a lógica de inserção master.

const supabaseUrl = 'SUA_URL_AQUI'
const supabaseKey = 'SUA_KEY_AQUI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTests() {
  const testOrgs = [
    { candidate_name: 'CANDIDATO TESTE ALPHA', subscription_status: 'active' },
    { candidate_name: 'CAMPANHA VITORIOSA 2026', subscription_status: 'active' },
    { candidate_name: 'PARTIDO DA LIBERDADE', subscription_status: 'pending' }
  ];

  console.log('Criando candidatos de teste...');
  
  for (const org of testOrgs) {
    const { data, error } = await supabase.from('organizations').insert([org]);
    if (error) {
      console.error(`Erro ao criar ${org.candidate_name}:`, error.message);
    } else {
      console.log(`Sucesso: ${org.candidate_name} criado!`);
    }
  }
}

// createTests();
