export interface StateElectoralInfo {
  uf: string;
  name: string;
  totalZones: number;
  capital: string;
  mainCities: string[];
}

export const BRAZIL_STATES: StateElectoralInfo[] = [
  {
    uf: 'AC',
    name: 'Acre',
    totalZones: 9,
    capital: 'Rio Branco',
    mainCities: ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira', 'Tarauacá', 'Feijó', 'Brasiléia', 'Senador Guiomard', 'Plácido de Castro', 'Xapuri']
  },
  {
    uf: 'AL',
    name: 'Alagoas',
    totalZones: 42,
    capital: 'Maceió',
    mainCities: ['Maceió', 'Arapiraca', 'Rio Largo', 'Palmeira dos Índios', 'União dos Palmares', 'Penedo', 'São Miguel dos Campos', 'Delmiro Gouveia', 'Coruripe', 'Campo Alegre']
  },
  {
    uf: 'AP',
    name: 'Amapá',
    totalZones: 10,
    capital: 'Macapá',
    mainCities: ['Macapá', 'Santana', 'Laranjal do Jari', 'Oiapoque', 'Porto Grande', 'Mazagão', 'Tartarugalzinho', 'Vitória do Jari', 'Pedra Branca do Amapari']
  },
  {
    uf: 'AM',
    name: 'Amazonas',
    totalZones: 61,
    capital: 'Manaus',
    mainCities: ['Manaus', 'Parintins', 'Itacoatiara', 'Manacapuru', 'Coari', 'Tabatinga', 'Maués', 'Tefé', 'Manicoré', 'Humaitá']
  },
  {
    uf: 'BA',
    name: 'Bahia',
    totalZones: 199,
    capital: 'Salvador',
    mainCities: ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Juazeiro', 'Itabuna', 'Lauro de Freitas', 'Ilhéus', 'Jequié', 'Teixeira de Freitas', 'Barreiras', 'Alagoinhas', 'Porto Seguro', 'Simões Filho', 'Paulo Afonso']
  },
  {
    uf: 'CE',
    name: 'Ceará',
    totalZones: 109,
    capital: 'Fortaleza',
    mainCities: ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral', 'Crato', 'Itapipoca', 'Maranguape', 'Iguatu', 'Quixadá', 'Pacatuba', 'Aquiraz', 'Canindé', 'Russas', 'Tianguá']
  },
  {
    uf: 'DF',
    name: 'Distrito Federal',
    totalZones: 21,
    capital: 'Brasília',
    mainCities: ['Brasília', 'Ceilândia', 'Taguatinga', 'Samambaia', 'Plano Piloto', 'Águas Claras', 'Guará', 'Gama', 'Santa Maria', 'Recanto das Emas', 'Sobradinho', 'Planaltina', 'Vicente Pires', 'São Sebastião', 'Riacho Fundo']
  },
  {
    uf: 'ES',
    name: 'Espírito Santo',
    totalZones: 57,
    capital: 'Vitória',
    mainCities: ['Vitória', 'Vila Velha', 'Serra', 'Cariacica', 'Cachoeiro de Itapemirim', 'Linhares', 'São Mateus', 'Colatina', 'Guarapari', 'Aracruz', 'Viana', 'Nova Venécia']
  },
  {
    uf: 'GO',
    name: 'Goiás',
    totalZones: 128,
    capital: 'Goiânia',
    mainCities: ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Águas Lindas de Goiás', 'Luziânia', 'Valparaíso de Goiás', 'Trindade', 'Formosa', 'Senador Canedo', 'Itumbiara', 'Catalão', 'Jataí', 'Planaltina', 'Caldas Novas']
  },
  {
    uf: 'MA',
    name: 'Maranhão',
    totalZones: 105,
    capital: 'São Luís',
    mainCities: ['São Luís', 'Imperatriz', 'São José de Ribamar', 'Timon', 'Caxias', 'Codó', 'Paço do Lumiar', 'Açailândia', 'Bacabal', 'Balsas', 'Santa Inês', 'Barra do Corda', 'Pinheiro', 'Chapadinha']
  },
  {
    uf: 'MT',
    name: 'Mato Grosso',
    totalZones: 57,
    capital: 'Cuiabá',
    mainCities: ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Tangará da Serra', 'Sorriso', 'Lucas do Rio Verde', 'Primavera do Leste', 'Barra do Garças', 'Cáceres', 'Alta Floresta', 'Nova Mutum']
  },
  {
    uf: 'MS',
    name: 'Mato Grosso do Sul',
    totalZones: 54,
    capital: 'Campo Grande',
    mainCities: ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Ponta Porã', 'Naviraí', 'Nova Andradina', 'Aquidauana', 'Sidrolândia', 'Paranaíba', 'Maracaju', 'Amambai']
  },
  {
    uf: 'MG',
    name: 'Minas Gerais',
    totalZones: 304,
    capital: 'Belo Horizonte',
    mainCities: ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim', 'Montes Claros', 'Ribeirão das Neves', 'Uberaba', 'Governador Valadares', 'Ipatinga', 'Sete Lagoas', 'Divinópolis', 'Santa Luzia', 'Ibirité', 'Poços de Caldas', 'Patos de Minas', 'Pouso Alegre', 'Teófilo Otoni']
  },
  {
    uf: 'PA',
    name: 'Pará',
    totalZones: 101,
    capital: 'Belém',
    mainCities: ['Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Parauapebas', 'Castanhal', 'Abaetetuba', 'Cametá', 'Marituba', 'Bragança', 'São Félix do Xingu', 'Barcarena', 'Altamira', 'Tucuruí', 'Paragominas']
  },
  {
    uf: 'PB',
    name: 'Paraíba',
    totalZones: 68,
    capital: 'João Pessoa',
    mainCities: ['João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos', 'Bayeux', 'Sousa', 'Cajazeiras', 'Cabedelo', 'Guarabira', 'Mamanguape', 'Queimadas', 'Pombal']
  },
  {
    uf: 'PR',
    name: 'Paraná',
    totalZones: 186,
    capital: 'Curitiba',
    mainCities: ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel', 'São José dos Pinhais', 'Foz do Iguaçu', 'Colombo', 'Guarapuava', 'Paranaguá', 'Araucária', 'Toledo', 'Apucarana', 'Pinhais', 'Campo Largo', 'Arapongas', 'Almirante Tamandaré', 'Umuarama']
  },
  {
    uf: 'PE',
    name: 'Pernambuco',
    totalZones: 122,
    capital: 'Recife',
    mainCities: ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina', 'Paulista', 'Cabo de Santo Agostinho', 'Camaragibe', 'Garanhuns', 'Vitória de Santo Antão', 'Igarassu', 'São Lourenço da Mata', 'Santa Cruz do Capibaribe', 'Abreu e Lima', 'Ipojuca', 'Serra Talhada']
  },
  {
    uf: 'PI',
    name: 'Piauí',
    totalZones: 74,
    capital: 'Teresina',
    mainCities: ['Teresina', 'Parnaíba', 'Picos', 'Piripiri', 'Floriano', 'Barras', 'Campo Maior', 'União', 'Altos', 'Esperantina', 'José de Freitas', 'Pedro II', 'Oeiras', 'São Raimundo Nonato']
  },
  {
    uf: 'RJ',
    name: 'Rio de Janeiro',
    totalZones: 165,
    capital: 'Rio de Janeiro',
    mainCities: ['Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu', 'Niterói', 'Belford Roxo', 'Campos dos Goytacazes', 'São João de Meriti', 'Petrópolis', 'Volta Redonda', 'Macaé', 'Magé', 'Itaboraí', 'Cabo Frio', 'Angra dos Reis', 'Nova Friburgo', 'Barra Mansa', 'Teresópolis', 'Mesquita', 'Nilópolis', 'Maricá']
  },
  {
    uf: 'RN',
    name: 'Rio Grande do Norte',
    totalZones: 60,
    capital: 'Natal',
    mainCities: ['Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante', 'Macaíba', 'Ceará-Mirim', 'Caicó', 'Assu', 'São José de Mipibu', 'Currais Novos', 'Santa Cruz', 'Nova Cruz', 'Apodi']
  },
  {
    uf: 'RS',
    name: 'Rio Grande do Sul',
    totalZones: 165,
    capital: 'Porto Alegre',
    mainCities: ['Porto Alegre', 'Caxias do Sul', 'Canoas', 'Pelotas', 'Santa Maria', 'Gravataí', 'Viamão', 'Novo Hamburgo', 'São Leopoldo', 'Rio Grande', 'Alvorada', 'Passo Fundo', 'Sapucaia do Sul', 'Uruguaiana', 'Santa Cruz do Sul', 'Cachoeirinha', 'Bagé', 'Bento Gonçalves', 'Erechim']
  },
  {
    uf: 'RO',
    name: 'Rondônia',
    totalZones: 29,
    capital: 'Porto Velho',
    mainCities: ['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Vilhena', 'Cacoal', 'Rolim de Moura', 'Jaru', 'Guajará-Mirim', 'Machadinho d\'Oeste', 'Buritis', 'Pimenta Bueno', 'Ouro Preto do Oeste']
  },
  {
    uf: 'RR',
    name: 'Roraima',
    totalZones: 8,
    capital: 'Boa Vista',
    mainCities: ['Boa Vista', 'Rorainópolis', 'Caracaraí', 'Pacaraima', 'Cantá', 'Mucajaí', 'Alto Alegre', 'Bonfim', 'São João da Baliza']
  },
  {
    uf: 'SC',
    name: 'Santa Catarina',
    totalZones: 105,
    capital: 'Florianópolis',
    mainCities: ['Florianópolis', 'Joinville', 'Blumenau', 'São José', 'Chapecó', 'Itajaí', 'Criciúma', 'Jaraguá do Sul', 'Palhoça', 'Lages', 'Balneário Camboriú', 'Brusque', 'Tubarão', 'São Bento do Sul', 'Camboriú', 'Navegantes', 'Caçador', 'Concórdia']
  },
  {
    uf: 'SP',
    name: 'São Paulo',
    totalZones: 393,
    capital: 'São Paulo',
    mainCities: ['São Paulo', 'Guarulhos', 'Campinas', 'São Bernardo do Campo', 'São José dos Campos', 'Santo André', 'Ribeirão Preto', 'Osasco', 'Sorocaba', 'Mauá', 'São José do Rio Preto', 'Santos', 'Mogi das Cruzes', 'Diadema', 'Jundiaí', 'Piracicaba', 'Carapicuíba', 'Bauru', 'Itaquaquecetuba', 'São Vicente', 'Franca', 'Praia Grande', 'Guarujá', 'Taubaté', 'Limeira', 'Suzano', 'Taboão da Serra', 'Sumaré', 'Barueri', 'Embu das Artes', 'Indaiatuba', 'Cotia', 'São Carlos', 'Americana', 'Marília', 'Araraquara', 'Jacareí', 'Presidente Prudente']
  },
  {
    uf: 'SE',
    name: 'Sergipe',
    totalZones: 29,
    capital: 'Aracaju',
    mainCities: ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana', 'São Cristóvão', 'Estância', 'Tobias Barreto', 'Simão Dias', 'Itabaianinha', 'Nossa Senhora da Glória', 'Propriá', 'Barra dos Coqueiros']
  },
  {
    uf: 'TO',
    name: 'Tocantins',
    totalZones: 33,
    capital: 'Palmas',
    mainCities: ['Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional', 'Paraíso do Tocantins', 'Araguatins', 'Colinas do Tocantins', 'Guaraí', 'Tocantinópolis', 'Dianópolis', 'Formoso do Araguaia']
  },
  {
    uf: 'ZZ',
    name: 'Exterior (Voto no Exterior)',
    totalZones: 1,
    capital: 'Brasília (TRE-DF)',
    mainCities: ['Miami', 'Boston', 'Lisboa', 'Londres', 'Nova York', 'Porto', 'Zurique', 'Paris', 'Madri', 'Nagoya', 'Tóquio', 'Orlando', 'Milão', 'Sydney', 'Berlim']
  }
];

/**
 * Retorna as zonas eleitorais formatadas (com 3 dígitos, ex: "001", "002"...) para um Estado (UF)
 */
export function getZonesByUF(uf: string): string[] {
  const normalizedUF = (uf || 'DF').toUpperCase().trim();
  const state = BRAZIL_STATES.find(s => s.uf === normalizedUF);
  const total = state ? state.totalZones : 50;
  return Array.from({ length: total }, (_, i) => (i + 1).toString().padStart(3, '0'));
}

/**
 * Retorna os municípios/cidades cadastrados para uma UF
 */
export function getCitiesByUF(uf: string): string[] {
  const normalizedUF = (uf || 'DF').toUpperCase().trim();
  const state = BRAZIL_STATES.find(s => s.uf === normalizedUF);
  return state ? state.mainCities : ['Capital', 'Região Metropolitana', 'Interior'];
}

/**
 * Retorna o nome completo do Estado a partir da sigla UF
 */
export function getStateName(uf: string): string {
  const normalizedUF = (uf || 'DF').toUpperCase().trim();
  const state = BRAZIL_STATES.find(s => s.uf === normalizedUF);
  return state ? state.name : 'Brasil';
}

/**
 * Retorna todas as UFs disponíveis no Brasil
 */
export function getAllUFs(): { uf: string; name: string; totalZones: number }[] {
  return BRAZIL_STATES.map(s => ({
    uf: s.uf,
    name: s.name,
    totalZones: s.totalZones
  }));
}

/**
 * Gera seções eleitorais simuladas/estimadas para uma Zona de uma UF
 */
export function getSampleSectionsForZone(zone: string, count: number = 30): string[] {
  const baseZoneNum = parseInt(zone, 10) || 1;
  const startSec = (baseZoneNum * 15) % 800 + 1;
  return Array.from({ length: count }, (_, i) => (startSec + i).toString().padStart(4, '0'));
}
