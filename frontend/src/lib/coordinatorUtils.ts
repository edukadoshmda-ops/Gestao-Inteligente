import ExcelJS from 'exceljs';
import { Coordinator, Member } from '../types';

/**
 * Verifica de forma robusta e resiliente se um membro/eleitor pertence a um coordenador.
 * Trata variações de ID (com/sem prefixo coord-), network_id, email, título de eleitor e nome.
 */
export function matchMemberToCoordinator(m: Member, c: Coordinator): boolean {
  if (!m || !c) return false;

  const cId = String(c.id || '').trim().toLowerCase();
  const cIdClean = cId.replace(/^coord-/, '');
  const cEmail = c.email ? c.email.trim().toLowerCase() : '';
  const cName = c.name ? c.name.trim().toLowerCase() : '';
  const cVoterId = c.voterId ? String(c.voterId).trim() : '';

  const mCoordId = String(m.coordinatorId || '').trim().toLowerCase();
  const mCoordIdClean = mCoordId.replace(/^coord-/, '');
  const mNetworkId = String(m.network_id || '').trim().toLowerCase();
  const mNetworkIdClean = mNetworkId.replace(/^coord-/, '');

  // 1. Comparação direta de ID (com ou sem prefixo coord-)
  if (mCoordId) {
    if (
      mCoordId === cId ||
      mCoordIdClean === cIdClean ||
      `coord-${mCoordIdClean}` === cId ||
      mCoordId === `coord-${cIdClean}`
    ) {
      return true;
    }
  }

  // 2. Comparação de Network ID (subordinação / rede)
  if (mNetworkId) {
    if (
      mNetworkId === cId ||
      mNetworkIdClean === cIdClean ||
      `coord-${mNetworkIdClean}` === cId ||
      mNetworkId === `coord-${cIdClean}`
    ) {
      return true;
    }
  }

  // 3. Comparação por Email do coordenador
  if (cEmail && (mCoordId === cEmail || mNetworkId === cEmail)) {
    return true;
  }

  // 4. Comparação por Título de Eleitor do coordenador
  if (cVoterId && (mCoordId === cVoterId || mNetworkId === cVoterId)) {
    return true;
  }

  // 5. Comparação por Nome do coordenador
  if (cName && (mCoordId === cName || mNetworkId === cName)) {
    return true;
  }

  return false;
}

/**
 * Gera e realiza o download de uma planilha Excel (.xlsx) exclusiva com os apoiadores do coordenador.
 */
export async function exportCoordinatorExcel(
  coordinator: Coordinator,
  allMembers: Member[],
  candidateName?: string,
  onNotify?: (msg: string) => void
): Promise<void> {
  const coordMembers = allMembers.filter(m => matchMemberToCoordinator(m, coordinator));

  const notify = onNotify || ((msg: string) => console.log(msg));
  notify(`Gerando planilha de ${coordinator.name}...`);

  try {
    const workbook = new ExcelJS.Workbook();
    const sheetName = `Apoiadores - ${coordinator.name.substring(0, 18).trim()}`;
    const worksheet = workbook.addWorksheet(sheetName);

    // 1. Congelamento de painel na linha 5
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 4, topLeftCell: 'A5', activeCell: 'A5' }
    ];

    // 2. Cabeçalho de Título (Linha 1)
    worksheet.mergeCells('A1:K1');
    const titleRow = worksheet.getRow(1);
    titleRow.height = 40;
    const campaignTitle = candidateName ? ` • ${candidateName.toUpperCase()}` : '';
    titleRow.getCell(1).value = `RELATÓRIO DE APOIADORES: ${coordinator.name.toUpperCase()}${campaignTitle}`;
    titleRow.getCell(1).style = {
      font: { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003366' } }, // Azul institucional
      alignment: { horizontal: 'center', vertical: 'middle' }
    };

    // 3. Linha de Metadados do Coordenador (Linha 2)
    worksheet.mergeCells('A2:K2');
    const metaRow = worksheet.getRow(2);
    metaRow.height = 24;
    const infoText = `Liderança: ${coordinator.name} | Região: ${coordinator.neighborhood || 'N/I'} - ${coordinator.city || 'DF'} | Contato: ${coordinator.whatsapp || coordinator.email || 'N/I'} | Total de Apoiadores: ${coordMembers.length}`;
    metaRow.getCell(1).value = infoText;
    metaRow.getCell(1).style = {
      font: { name: 'Arial', size: 10, bold: true, color: { argb: 'FF003366' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } }, // Destaque amarelo suave
      alignment: { horizontal: 'center', vertical: 'middle' }
    };

    // Linha 3 em branco para espaçamento visual
    worksheet.getRow(3).height = 10;

    // 4. Cabeçalho das Colunas (Linha 4)
    const headerRow = worksheet.getRow(4);
    headerRow.height = 28;
    const headers = [
      'NOME COMPLETO',
      'WHATSAPP / TELEFONE',
      'E-MAIL',
      'DATA NASC.',
      'IDADE',
      'GÊNERO',
      'TÍTULO DE ELEITOR',
      'SEÇÃO',
      'ZONA',
      'BAIRRO',
      'DATA DE CADASTRO'
    ];

    const headerColors = [
      'FF003366', // NOME
      'FF059669', // ZAP (verde)
      'FF0284C7', // EMAIL
      'FF4F46E5', // NASC
      'FFD97706', // IDADE
      'FF7C3AED', // GÊNERO
      'FF1E293B', // TÍTULO
      'FFDC2626', // SEÇÃO
      'FF16A34A', // ZONA
      'FF9333EA', // BAIRRO
      'FF475569'  // DATA
    ];

    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.style = {
        font: { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true, size: 10 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColors[i] } },
        alignment: { horizontal: 'center', vertical: 'middle' }
      };
    });

    // 5. Preencher dados dos eleitores do coordenador
    if (coordMembers.length > 0) {
      coordMembers.forEach((m) => {
        const row = worksheet.addRow([
          m.name || '',
          m.phone || '',
          m.email || '',
          m.birthDate ? new Date(m.birthDate).toLocaleDateString('pt-BR') : '',
          m.age || '',
          m.gender || '',
          m.voterId || '',
          m.voterSection || '',
          m.voterZone || '',
          m.neighborhood || '',
          m.createdAt ? new Date(m.createdAt).toLocaleDateString('pt-BR') : ''
        ]);
        row.height = 22;
        row.alignment = { vertical: 'middle' };
      });
    } else {
      const emptyRow = worksheet.addRow([
        'Nenhum apoiador vinculado até o momento.',
        '', '', '', '', '', '', '', '', '', ''
      ]);
      emptyRow.height = 30;
      worksheet.mergeCells(`A5:K5`);
      emptyRow.getCell(1).style = {
        font: { italic: true, color: { argb: 'FF6B7280' }, size: 11 },
        alignment: { horizontal: 'center', vertical: 'middle' }
      };
    }

    // Larguras automáticas de colunas
    worksheet.columns.forEach((col, i) => {
      col.width = [35, 20, 26, 14, 8, 12, 20, 10, 10, 22, 16][i];
    });

    // 6. Gerar Buffer e Download
    const buffer = await workbook.xlsx.writeBuffer();
    const cleanCoordName = coordinator.name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    const fileName = `PLANILHA_${cleanCoordName}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Tentativa com File System Access API
    try {
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'Planilha Excel (.xlsx)',
            accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(buffer);
        await writable.close();
        notify(`✅ Planilha de ${coordinator.name} salva com sucesso!`);
        return;
      }
    } catch (pickerErr: any) {
      if (pickerErr.name === 'AbortError') return;
    }

    // Fallback Download padrão
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    notify(`✅ Planilha de ${coordinator.name} baixada com sucesso!`);
  } catch (err) {
    console.error('Erro ao exportar planilha do coordenador:', err);
    alert(`Erro ao gerar a planilha de ${coordinator.name}. Tente novamente.`);
  }
}
