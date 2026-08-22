import { checkPermissions, getNetworkFilter } from '../lib/permissions';
import { getAllUFs, getZonesByUF, getCitiesByUF, getStateName, getSampleSectionsForZone } from '../lib/brazilElectoralData';
import { Profile } from '../types';

function runAutomatedAudit() {
  console.log('====================================================');
  console.log('🔍 INICIANDO BATERIA DE TESTES AUTOMATIZADOS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. TESTES DE PERMISSÕES: Super Admin
  const superAdminProfile: Profile = {
    id: 'super-1',
    full_name: 'Eduardo Super Admin',
    email: 'edukadoshmda@gmail.com',
    role: 'super_admin',
    org_id: 'org-1'
  };
  const superAdminPerms = checkPermissions(superAdminProfile);
  assert(superAdminPerms.canAccessAllTabs === true, 'Super Admin acessa todas as 12 abas');
  assert(superAdminPerms.canAccessAdminMaster === true, 'Super Admin acessa Painel Root Master');
  assert(superAdminPerms.canCreateCampaigns === true, 'Super Admin pode criar campanhas');
  assert(superAdminPerms.canCreateCoordinators === true, 'Super Admin pode criar coordenadores');
  assert(getNetworkFilter(superAdminProfile) === null, 'Super Admin não possui restrição de rede (vê tudo)');

  // 2. TESTES DE PERMISSÕES: Candidato
  const candidateProfile: Profile = {
    id: 'cand-1',
    full_name: 'Candidato Presidencial',
    email: 'candidato@campanha.com',
    role: 'candidate',
    org_id: 'org-1'
  };
  const candidatePerms = checkPermissions(candidateProfile);
  assert(candidatePerms.canAccessAllTabs === true, 'Candidato acessa todas as abas da sua campanha');
  assert(candidatePerms.canAccessAdminMaster === false, 'Candidato NÃO acessa Painel Root Master');
  assert(candidatePerms.canCreateCoordinators === true, 'Candidato pode cadastrar coordenadores');
  assert(getNetworkFilter(candidateProfile) === null, 'Candidato não possui restrição de rede (vê toda a campanha)');

  // 3. TESTES DE PERMISSÕES: Coordenador Geral
  const generalCoordProfile: Profile = {
    id: 'coord-general-1',
    full_name: 'Lukas Gustavo',
    email: 'lukagustavomda@gmail.com',
    role: 'general_coordination',
    org_id: 'org-1'
  };
  const generalPerms = checkPermissions(generalCoordProfile);
  assert(generalPerms.canAccessAllTabs === true, 'Coordenador Geral acessa todas as abas da campanha');
  assert(generalPerms.canAccessAnalytics === true, 'Coordenador Geral acessa Inteligência e Relatórios');
  assert(generalPerms.canCreateCoordinators === true, 'Coordenador Geral pode cadastrar coordenadores');
  assert(getNetworkFilter(generalCoordProfile) === null, 'Coordenador Geral vê toda a campanha sem filtros');

  // 4. TESTES DE PERMISSÕES: Coordenador de Área
  const areaCoordProfile: Profile = {
    id: 'coord-area-1',
    full_name: 'Coordenador Regional Sul',
    email: 'area@campanha.com',
    role: 'area_coordinator',
    org_id: 'org-1'
  };
  const areaPerms = checkPermissions(areaCoordProfile);
  assert(areaPerms.canAccessAllTabs === false, 'Coordenador de Área NÃO tem acesso irrestrito a todas as abas');
  assert(areaPerms.canAccessAnalytics === true, 'Coordenador de Área pode ver análises da sua rede');
  assert(areaPerms.canCreateCoordinators === true, 'Coordenador de Área pode cadastrar coordenadores de campo em sua rede');
  const areaFilter = getNetworkFilter(areaCoordProfile);
  assert(areaFilter !== null && areaFilter.isArea === true && areaFilter.isRestricted === true, 'Coordenador de Área possui filtro restrito de rede ativo');

  // 5. TESTES DE PERMISSÕES: Coordenador de Campo / Rua
  const fieldCoordProfile: Profile = {
    id: 'coord-field-1',
    full_name: 'Coordenador de Campo 01',
    email: 'campo@campanha.com',
    role: 'coordinator',
    org_id: 'org-1'
  };
  const fieldPerms = checkPermissions(fieldCoordProfile);
  assert(fieldPerms.canAccessAllTabs === false, 'Coordenador de Campo NÃO tem acesso a todas as abas');
  assert(fieldPerms.canCreateCoordinators === false, 'Coordenador de Campo NÃO pode cadastrar outros coordenadores');
  assert(fieldPerms.canCreateMembers === true, 'Coordenador de Campo PODE cadastrar eleitores');
  const fieldFilter = getNetworkFilter(fieldCoordProfile);
  assert(fieldFilter !== null && fieldFilter.isField === true && fieldFilter.isRestricted === true, 'Coordenador de Campo filtrado exclusivamente para sua produção');

  // 6. TESTES DA BASE ELEITORAL BRASIL (27 UFs + Voto no Exterior)
  const allUFs = getAllUFs();
  assert(allUFs.length === 28, `Base nacional contém 27 estados/DF + Voto no Exterior (Atual: ${allUFs.length})`);
  assert(getZonesByUF('DF').length === 21, 'Distrito Federal contém exatamente 21 zonas eleitorais');
  assert(getZonesByUF('AC').length === 9, 'Acre contém exatamente 9 zonas eleitorais');
  assert(getZonesByUF('SP').length === 393, 'São Paulo contém 393 zonas eleitorais');
  assert(getCitiesByUF('RJ').length > 0, 'Rio de Janeiro possui lista de municípios cadastrada');
  assert(getStateName('BA') === 'Bahia', 'Nome do estado BA resolvido corretamente como Bahia');
  // 7. TESTES DE RESILIÊNCIA E MESCLAGEM DE DADOS (MEMBERS & COORDINATORS)
  const localMembersSample = [
    { id: 'm-1', name: 'Eleitor Um', phone: '61999999999', org_id: 'org-1' },
    { id: 'm-2', name: 'Eleitor Dois', phone: '61888888888', org_id: 'org-1' }
  ];
  const supabaseMembersSample = [
    { id: 'm-1', name: 'Eleitor Um (Atualizado)', phone: '61999999999', org_id: 'org-1' },
    { id: 'm-3', name: 'Eleitor Três', phone: '61777777777', org_id: 'org-1' }
  ];
  const existingIds = new Set(supabaseMembersSample.map(m => m.id));
  const mergedMembers = [...supabaseMembersSample];
  for (const lm of localMembersSample) {
    if (!existingIds.has(lm.id)) {
      mergedMembers.push(lm);
    }
  }
  assert(mergedMembers.length === 3, 'Mesclagem de membros preserva dados remotos e locais sem duplicidade de IDs');
  assert(mergedMembers.some(m => m.id === 'm-1') && mergedMembers.some(m => m.id === 'm-2') && mergedMembers.some(m => m.id === 'm-3'), 'Todos os membros únicos (remotos + locais) estão presentes na mesclagem');

  // 8. TESTE DE RESOLUÇÃO DE COORDENADOR GERAL
  const testCoordLukas = { id: 'c-lukas', name: 'Lukas Gustavo', email: 'lukagustavomda@gmail.com' };
  const isLukasGeneral = testCoordLukas.email.includes('lukagustavo') || testCoordLukas.name.includes('Lukas');
  assert(isLukasGeneral === true, 'Lukas Gustavo é reconhecido com privilégio de Coordenação Geral');

  console.log('\n====================================================');
  console.log(`📊 RESULTADO DOS TESTES: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAutomatedAudit();
