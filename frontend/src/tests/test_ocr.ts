function parseBrazilianDocument(rawText: string) {
  const lines = rawText.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  
  let name = '';
  let voterId = '';
  let voterZone = '';
  let voterSection = '';
  let birthDate = '';
  let neighborhood = '';

  const ignoreHeaders = [
    'REPUBLICA', 'REPÚBLICA', 'FEDERATIVA', 'BRASIL', 'JUSTIÇA', 'JUSTICA', 
    'ELEITORAL', 'TÍTULO', 'TITULO', 'ELEITOR', 'TRIBUNAL', 'SUPERIOR',
    'DOCUMENTO', 'IDENTIFICAÇÃO', 'IDENTIFICACAO', 'VALE', 'COMO', 'PROVA',
    'QUITAÇÃO', 'QUITACAO', 'ASSINATURA', 'PORTADOR', 'VIA', 'DIGITAL', 'PODER', 'JUDICIÁRIO', 'JUDICIARIO'
  ];

  // 1. Procura Nome
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase();
    if (line === 'NOME' || line === 'NOME DO ELEITOR' || line.startsWith('NOME:')) {
      if (line.includes(':')) {
        name = lines[i].split(':')[1].trim();
      } else if (i + 1 < lines.length) {
        name = lines[i + 1].trim();
      }
      break;
    }
  }

  // Fallback para Nome: linha com 2+ palavras em maiúsculo que não seja cabeçalho
  if (!name) {
    for (const line of lines) {
      const words = line.split(/\s+/);
      const isHeader = words.some(w => ignoreHeaders.includes(w.toUpperCase()));
      if (!isHeader && words.length >= 2 && words.length <= 6 && /^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]+$/i.test(line)) {
        name = line.trim();
        break;
      }
    }
  }

  // 2. Procura Título de Eleitor / Inscrição (12 dígitos numéricos)
  const allNumbers = rawText.match(/\b\d{4}\s*\d{4}\s*\d{4}\b/) || rawText.match(/\b\d{12}\b/);
  if (allNumbers) {
    voterId = allNumbers[0].replace(/\D/g, '');
  } else {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();
      if (line.includes('INSCRIÇÃO') || line.includes('INSCRICAO') || line.includes('TÍTULO') || line.includes('TITULO')) {
        const lineNums = lines[i].replace(/\D/g, '');
        if (lineNums.length >= 10 && lineNums.length <= 13) {
          voterId = lineNums.slice(0, 12);
          break;
        }
        if (i + 1 < lines.length) {
          const nextNums = lines[i + 1].replace(/\D/g, '');
          if (nextNums.length >= 10 && nextNums.length <= 13) {
            voterId = nextNums.slice(0, 12);
            break;
          }
        }
      }
    }
  }

  // 3. Procura Data de Nascimento (DD/MM/YYYY)
  const birthMatch = rawText.match(/\b(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{4})\b/);
  if (birthMatch) {
    const day = parseInt(birthMatch[1], 10);
    const month = parseInt(birthMatch[2], 10);
    const year = parseInt(birthMatch[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1920 && year <= 2026) {
      birthDate = `${birthMatch[3]}-${birthMatch[2]}-${birthMatch[1]}`;
    }
  }

  // 4. Procura Zona e Seção
  // Se Zona e Seção estão juntas na linha ou cabeçalho composto ("ZONA SEÇÃO \n 015 0345" ou "ZONA: 015 SEÇÃO: 0456")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase();
    if (line.includes('ZONA') && line.includes('SEÇÃO')) {
      if (i + 1 < lines.length) {
        const parts = lines[i + 1].match(/\b(\d{1,4})\b/g);
        if (parts && parts.length >= 2) {
          voterZone = parts[0].padStart(3, '0');
          voterSection = parts[1].padStart(4, '0');
          break;
        }
      }
    }
  }

  if (!voterZone) {
    const zoneMatch = rawText.match(/ZONA\s*[:\s]*(\d{1,4})/i);
    if (zoneMatch) voterZone = zoneMatch[1].padStart(3, '0');
  }

  if (!voterSection) {
    const sectionMatch = rawText.match(/SE[ÇC][ÃA]O\s*[:\s]*(\d{1,4})/i);
    if (sectionMatch) voterSection = sectionMatch[1].padStart(4, '0');
  }

  // 5. Procura Município / Bairro
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase();
    if (line.includes('MUNICÍPIO') || line.includes('MUNICIPIO')) {
      if (line.includes(':')) {
        neighborhood = lines[i].split(':')[1].replace(/\/.*$/, '').trim();
      } else if (i + 1 < lines.length) {
        neighborhood = lines[i + 1].replace(/\/.*$/, '').trim();
      }
      break;
    }
  }

  return {
    name,
    voterId,
    voterZone,
    voterSection,
    birthDate,
    neighborhood
  };
}

// Test Real-World Layouts (e-Título & Physical Voter Card)
const eTituloSample = `
REPÚBLICA FEDERATIVA DO BRASIL
PODER JUDICIÁRIO
TRIBUNAL SUPERIOR ELEITORAL
NOME
LUKAS GUSTAVO COUTINHO
DATA DE NASCIMENTO
14/08/1996
INSCRIÇÃO
0498 7123 0145
ZONA SEÇÃO
021 0456
MUNICÍPIO
BRASÍLIA / DF
`;

const parsed = parseBrazilianDocument(eTituloSample);
console.log('Parsed e-Título result:', parsed);

if (parsed.name === 'LUKAS GUSTAVO COUTINHO' && parsed.voterId === '049871230145' && parsed.voterZone === '021' && parsed.voterSection === '0456' && parsed.birthDate === '1996-08-14' && parsed.neighborhood === 'BRASÍLIA') {
  console.log('✅ Real-world e-Título Parsing PASSED perfectly!');
} else {
  console.error('❌ Failed e-Título parsing');
  process.exit(1);
}
