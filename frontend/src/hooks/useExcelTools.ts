import { useState } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Member, Coordinator } from '../types';
import { normalizeName, cleanPhone, deduplicateMemberList } from '../lib/db';

export interface ExcelToolsOptions {
  coordinators?: Coordinator[];
  loggedInCoordinator?: Coordinator | null;
  activeCoordinator?: Coordinator | null;
  currentOrgId?: string;
}

export function useExcelTools(
  members: Member[],
  saveMembers: (data: Member[]) => Promise<void>,
  showToast: (msg: string) => void,
  organization?: any,
  options?: ExcelToolsOptions
) {
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Identifica o coordenador alvo de forma inteligente:
   * 1. Coordenador logado no sistema
   * 2. Coordenador atualmente ativo / visualizado
   * 3. Nome do coordenador contido no nome do arquivo (ex: PLANILHA_MARIA_JOSE_DE_ARAUJO_SILVA.xlsx)
   * 4. Nome do coordenador na aba da planilha (ex: "Apoiadores - MARIA JOSE")
   * 5. Nome do coordenador nos metadados ou primeiras linhas (ex: "Liderança: Maria Jose")
   */
  const detectCoordinator = (
    fileName: string,
    sheetNames: string[],
    firstRows: any[][],
    overrideCoord?: Coordinator | null
  ): Coordinator | null => {
    if (overrideCoord) return overrideCoord;
    if (options?.loggedInCoordinator) return options.loggedInCoordinator;
    if (options?.activeCoordinator) return options.activeCoordinator;

    const coords = options?.coordinators || [];
    if (coords.length === 0) return null;

    const norm = (s: string) =>
      (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, ' ')
        .trim();

    const normFileName = norm(fileName);

    // 1. Procura no nome do arquivo
    for (const c of coords) {
      const cNorm = norm(c.name);
      if (cNorm.length >= 4) {
        // Ex: Maria Jose de Araujo Silva -> testa partes ou nome completo
        if (normFileName.includes(cNorm)) return c;
        const parts = cNorm.split(' ').filter(p => p.length > 2);
        if (parts.length >= 2 && parts.every(p => normFileName.includes(p))) {
          return c;
        }
      }
    }

    // 2. Procura nas abas (sheet names)
    for (const sheetName of sheetNames) {
      const normSheet = norm(sheetName);
      for (const c of coords) {
        const cNorm = norm(c.name);
        if (cNorm.length >= 4 && (normSheet.includes(cNorm) || cNorm.includes(normSheet))) {
          return c;
        }
      }
    }

    // 3. Procura no cabeçalho das primeiras 4 linhas
    for (let r = 0; r < Math.min(firstRows.length, 5); r++) {
      const rowText = (firstRows[r] || []).map(cell => String(cell || '')).join(' ');
      const normRow = norm(rowText);
      for (const c of coords) {
        const cNorm = norm(c.name);
        if (cNorm.length >= 5 && normRow.includes(cNorm)) {
          return c;
        }
      }
    }

    return null;
  };

  /**
   * Processador universal de planilhas (.xlsx, .xls, .csv)
   */
  const processSpreadsheet = async (
    file: File,
    forcedCoordinator?: Coordinator | null
  ) => {
    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (!rows || rows.length < 1) {
        showToast('⚠️ Arquivo vazio ou sem dados legíveis.');
        return;
      }

      // Detecta coordenador automático da planilha
      const targetCoordinator = detectCoordinator(
        file.name,
        workbook.SheetNames,
        rows.slice(0, 5),
        forcedCoordinator
      );

      // Mapeamento dinâmico de colunas nas primeiras 10 linhas
      let nameCol = -1;
      let phoneCol = -1;
      let voterCol = -1;
      let emailCol = -1;
      let neighborhoodCol = -1;
      let zoneCol = -1;
      let sectionCol = -1;
      let coordCol = -1;
      let dataStartRow = 0;

      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i] || [];
        let foundAnyHeader = false;

        row.forEach((cell, idx) => {
          const val = (cell?.toString() || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          if (!val) return;

          if (nameCol === -1 && (val === 'nome' || val === 'nome completo' || val.includes('eleitor') || val.includes('apoiador'))) {
            nameCol = idx;
            foundAnyHeader = true;
          }
          if (phoneCol === -1 && (val.includes('tel') || val.includes('fone') || val.includes('cel') || val.includes('zap') || val.includes('whatsapp') || val.includes('contato'))) {
            phoneCol = idx;
            foundAnyHeader = true;
          }
          if (voterCol === -1 && (val.includes('titulo') || val.includes('voter') || val.includes('inscricao'))) {
            voterCol = idx;
            foundAnyHeader = true;
          }
          if (emailCol === -1 && (val.includes('email') || val.includes('e-mail') || val.includes('correio'))) {
            emailCol = idx;
            foundAnyHeader = true;
          }
          if (neighborhoodCol === -1 && (val.includes('bairro') || val.includes('regiao') || val.includes('distrito') || val.includes('comunidade'))) {
            neighborhoodCol = idx;
            foundAnyHeader = true;
          }
          if (zoneCol === -1 && (val === 'zona' || val.includes('zona eleitoral') || val === 'zone')) {
            zoneCol = idx;
            foundAnyHeader = true;
          }
          if (sectionCol === -1 && (val === 'secao' || val === 'sessao' || val.includes('secao') || val.includes('sessao') || val === 'sec')) {
            sectionCol = idx;
            foundAnyHeader = true;
          }
          if (coordCol === -1 && (val.includes('coordenador') || val.includes('lider') || val.includes('responsavel') || val === 'coord')) {
            coordCol = idx;
            foundAnyHeader = true;
          }
        });

        if (foundAnyHeader) {
          dataStartRow = i + 1;
          break;
        }
      }

      // Fallbacks caso não tenha cabeçalho explícito
      if (nameCol === -1) nameCol = 1; // Muitas planilhas tem [0] = Nº, [1] = Nome
      if (phoneCol === -1) phoneCol = 3;

      const norm = (s: string) =>
        (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

      const coords = options?.coordinators || [];
      const currentOrgId =
        targetCoordinator?.org_id ||
        options?.currentOrgId ||
        organization?.id ||
        'f82a9ced-1547-477a-8f7a-d08231e7bd30';

      // Criamos mapa de membros existentes para atualização resiliente
      const updatedMembersMap = new Map<string, Member>();
      members.forEach(m => updatedMembersMap.set(m.id, { ...m }));

      let newCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      for (let r = dataStartRow; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;

        const rawName = (row[nameCol]?.toString() || '').trim();
        const normName = norm(rawName);

        // Ignora linhas vazias ou de título/resumo
        if (
          !normName ||
          normName.length < 2 ||
          normName.includes('relatorio') ||
          normName.includes('total') ||
          normName === 'nome' ||
          normName === 'nome completo'
        ) {
          continue;
        }

        const rawPhone = phoneCol >= 0 ? (row[phoneCol]?.toString() || '').trim() : '';
        const phone = cleanPhone(rawPhone);
        const voterId = voterCol >= 0 ? (row[voterCol]?.toString() || '').trim() : '';
        const email = emailCol >= 0 ? (row[emailCol]?.toString() || '').trim().toLowerCase() : '';
        const neighborhood = neighborhoodCol >= 0 ? (row[neighborhoodCol]?.toString() || '').trim() : '';
        const zone = zoneCol >= 0 ? (row[zoneCol]?.toString() || '').trim() : '';
        const section = sectionCol >= 0 ? (row[sectionCol]?.toString() || '').trim() : '';

        // Coordenador da linha (se houver coluna específica) ou o detectado globalmente
        let rowCoordinator = targetCoordinator;
        if (coordCol >= 0 && row[coordCol]) {
          const rawCoord = norm(String(row[coordCol]));
          if (rawCoord) {
            const foundC = coords.find(c => {
              const cn = norm(c.name);
              return cn === rawCoord || cn.includes(rawCoord) || rawCoord.includes(cn);
            });
            if (foundC) rowCoordinator = foundC;
          }
        }

        // Verifica se o eleitor já existe na base
        let existingMember: Member | undefined;
        for (const m of updatedMembersMap.values()) {
          if (voterId && voterId.length >= 5 && m.voterId && m.voterId.trim() === voterId) {
            existingMember = m;
            break;
          }
          if (norm(m.name) === normName) {
            existingMember = m;
            break;
          }
          if (phone && phone.length >= 8 && cleanPhone(m.phone) === phone && norm(m.name).startsWith(normName.slice(0, 4))) {
            existingMember = m;
            break;
          }
        }

        if (existingMember) {
          // O membro já existe: ATUALIZA e VINCULA caso esteja sem coordenador ou sendo importado por um
          let changed = false;

          if (rowCoordinator && (!existingMember.coordinatorId || rowCoordinator.id !== existingMember.coordinatorId)) {
            existingMember.coordinatorId = rowCoordinator.id;
            existingMember.network_id = rowCoordinator.network_id || existingMember.network_id;
            changed = true;
          }

          if (zone && !existingMember.voterZone) {
            existingMember.voterZone = zone;
            changed = true;
          }
          if (section && !existingMember.voterSection) {
            existingMember.voterSection = section;
            changed = true;
          }
          if (neighborhood && !existingMember.neighborhood) {
            existingMember.neighborhood = neighborhood;
            changed = true;
          }
          if (phone && (!existingMember.phone || existingMember.phone.length < 8)) {
            existingMember.phone = phone;
            changed = true;
          }
          if (voterId && !existingMember.voterId) {
            existingMember.voterId = voterId;
            changed = true;
          }

          if (changed) {
            updatedMembersMap.set(existingMember.id, existingMember);
            updatedCount++;
          } else {
            skippedCount++;
          }
        } else {
          // Novo membro: INSERE já com o coordenador vinculado!
          const newId = Math.random().toString(36).substring(2, 11);
          const newMember: Member = {
            id: newId,
            name: rawName,
            phone: phone || rawPhone,
            email: email || undefined,
            voterId: voterId || undefined,
            voterSection: section || undefined,
            voterZone: zone || undefined,
            neighborhood: neighborhood || (rowCoordinator ? rowCoordinator.neighborhood : '') || undefined,
            coordinatorId: rowCoordinator ? rowCoordinator.id : undefined,
            network_id: rowCoordinator ? rowCoordinator.network_id : undefined,
            org_id: rowCoordinator?.org_id || currentOrgId,
            gender: 'Não Informado',
            createdAt: new Date().toISOString()
          };
          updatedMembersMap.set(newId, newMember);
          newCount++;
        }
      }

      const allCombined = Array.from(updatedMembersMap.values());
      const { deduplicated } = deduplicateMemberList(allCombined);

      await saveMembers(deduplicated);

      if (targetCoordinator) {
        showToast(
          `✅ Planilha vinculada a ${targetCoordinator.name}! (${newCount} novos, ${updatedCount} atualizados)`
        );
      } else if (newCount > 0 || updatedCount > 0) {
        showToast(`✅ ${newCount} novos eleitores cadastrados e ${updatedCount} atualizados!`);
      } else {
        showToast(`ℹ️ Todos os ${skippedCount} eleitores já estavam cadastrados e vinculados.`);
      }
    } catch (err) {
      console.error('Erro ao importar planilha:', err);
      showToast('❌ Erro ao ler a planilha. Verifique o formato do arquivo.');
    }
  };

  const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processSpreadsheet(file);
    event.target.value = '';
  };

  const handleImportExcelForCoordinator = (
    event: React.ChangeEvent<HTMLInputElement>,
    coordinator: Coordinator
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processSpreadsheet(file, coordinator);
    event.target.value = '';
  };

  const handleExportExcel = async () => {
    if (members.length === 0) return alert('Base vazia.');
    setIsExporting(true);
    showToast('Gerando relatório estratégico...');

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Base de Eleitores');

      worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 4, topLeftCell: 'A5', activeCell: 'A5' }];

      worksheet.mergeCells('A1:J1');
      const titleRow = worksheet.getRow(1);
      titleRow.height = 35;
      const candidateName = organization?.candidate_name ? ` ${organization.candidate_name}` : '';
      titleRow.getCell(1).value = `RELATÓRIO GESTÃO INTELIGENTE${candidateName}`;
      titleRow.getCell(1).style = {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 16 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } },
        alignment: { horizontal: 'center', vertical: 'middle' }
      };

      const headerRow = worksheet.getRow(4);
      const headers = ['NOME', 'ZAP', 'E-MAIL', 'NASC', 'IDADE', 'GÊNERO', 'TÍTULO', 'SEÇÃO', 'ZONA', 'DATA'];
      const headerColors = [
        'FF00B050',
        'FFFF0000',
        'FF00B0F0',
        'FF92D050',
        'FFC65911',
        'FFFFC000',
        'FF000000',
        'FFFF0000',
        'FF548235',
        'FF5B9BD5'
      ];
      headers.forEach((h, i) => {
        headerRow.getCell(i + 1).value = h;
        headerRow.getCell(i + 1).style = {
          font: { color: { argb: 'FFFFFFFF' }, bold: true },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColors[i] } },
          alignment: { horizontal: 'center' }
        };
      });

      members.forEach(m => {
        worksheet.addRow([
          m.name,
          m.phone,
          m.email || '',
          m.birthDate ? new Date(m.birthDate).toLocaleDateString('pt-BR') : '',
          m.age || '',
          m.gender,
          m.voterId || '',
          m.voterSection || '',
          m.voterZone || '',
          new Date(m.createdAt).toLocaleDateString('pt-BR')
        ]);
      });

      worksheet.columns.forEach((col, i) => (col.width = [35, 18, 25, 12, 8, 12, 18, 10, 10, 15][i]));

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `GESTAO_INTELIGENTE_RELATORIO_${new Date().getTime()}.xlsx`;

      try {
        if ('showSaveFilePicker' in window) {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: 'Planilha Excel',
                accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
              }
            ]
          });
          const writable = await handle.createWritable();
          await writable.write(buffer);
          await writable.close();
          showToast('✅ Download concluído!');
          return;
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') console.warn('Erro no File Picker:', err);
      }

      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const reader = new FileReader();
      reader.onloadend = () => {
        const url = reader.result as string;
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('✅ Download concluído!');
      };
      reader.readAsDataURL(blob);
    } catch (fallbackErr) {
      console.error('Erro na exportação:', fallbackErr);
      alert('Erro ao gerar a planilha. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return {
    handleImportExcel,
    handleImportExcelForCoordinator,
    processSpreadsheet,
    handleExportExcel,
    isExporting
  };
}
