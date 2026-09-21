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
  /** Nome resolvido do candidato (effectiveCandidateName do Dashboard) */
  candidateName?: string;
  /** Lista completa (membros + coordenadores sem registro) exibida no app */
  allPeople?: Member[];
}

export function useExcelTools(
  members: Member[],
  saveMembers: (data: Member[]) => Promise<void>,
  showToast: (msg: string) => void,
  organization?: any,
  options?: ExcelToolsOptions
) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

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
    setIsImporting(true);
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
    } finally {
      setIsImporting(false);
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

  // Formata telefone exatamente igual ao exibido no app
  const formatPhoneForExport = (phone: string | null | undefined): string => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Recalcula a idade a partir da data de nascimento (mesma lógica do MemberForm)
  const recalcAge = (birthDate?: string): number | string => {
    if (!birthDate) return '';
    // Interpreta YYYY-MM-DD como data LOCAL (sem offset de timezone)
    const parts = birthDate.split('-');
    if (parts.length !== 3) return '';
    const birth = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(birth.getTime())) return '';
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : '';
  };

  // Formata data de nascimento sem bug de timezone (YYYY-MM-DD → DD/MM/YYYY)
  const formatBirthDate = (birthDate?: string): string => {
    if (!birthDate) return '';
    const parts = birthDate.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    // Fallback para outros formatos
    try {
      return new Date(birthDate).toLocaleDateString('pt-BR');
    } catch {
      return birthDate;
    }
  };

  // Formata data de criação (pode ser ISO string com timezone)
  const formatCreatedAt = (createdAt: string): string => {
    try {
      return new Date(createdAt).toLocaleDateString('pt-BR');
    } catch {
      return createdAt || '';
    }
  };

  const handleExportExcel = async (customList?: Member[], customCandidateName?: string) => {
    // 1. Prioridade absoluta para a lista passada diretamente no clique (ex: allCampaignPeople com 6165 pessoas)
    // 2. Fallback para options?.allPeople
    // 3. Fallback para members
    let candidateList: Member[] = [];
    if (Array.isArray(customList) && customList.length > 0) {
      candidateList = customList;
    } else if (options?.allPeople && options.allPeople.length > 0) {
      candidateList = options.allPeople;
    } else {
      candidateList = members;
    }

    // Filtrar membros válidos
    const exportList = candidateList.filter(m => m && (m.name || m.phone || m.id));

    if (exportList.length === 0) return alert('Base vazia.');
    setIsExporting(true);
    showToast('Gerando relatório estratégico...');

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Base de Eleitores');

      worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 5, topLeftCell: 'A6', activeCell: 'A6' }];

      // Linha 1 — Título principal
      worksheet.mergeCells('A1:J1');
      const titleRow = worksheet.getRow(1);
      titleRow.height = 35;
      titleRow.getCell(1).value = 'RELATÓRIO GESTÃO INTELIGENTE';
      titleRow.getCell(1).style = {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 16 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } },
        alignment: { horizontal: 'center', vertical: 'middle' }
      };

      // Linha 2 — Nome do candidato / campanha
      worksheet.mergeCells('A2:J2');
      const candidateRow = worksheet.getRow(2);
      candidateRow.height = 28;

      // Resolução do nome: customCandidateName > options.candidateName > organization.candidate_name
      let resolvedName = (typeof customCandidateName === 'string' && customCandidateName.trim())
        ? customCandidateName.trim()
        : (options?.candidateName && options.candidateName.trim())
          ? options.candidateName.trim()
          : (organization?.candidate_name && organization.candidate_name.trim())
            ? organization.candidate_name.trim()
            : 'Campanha Eleitoral';

      let party = organization?.party;
      let partyNumber = organization?.party_number;
      try {
        const orgId = organization?.id;
        if (orgId) {
          const edited = JSON.parse(localStorage.getItem('@AppGestao:editedOrgs') || '{}');
          if (edited[orgId]) {
            if (edited[orgId].party) party = edited[orgId].party;
            if (edited[orgId].party_number) partyNumber = edited[orgId].party_number;
          }
        }
        const currentSaved = JSON.parse(localStorage.getItem('forja_current_organization') || '{}');
        if (!party && currentSaved.party) party = currentSaved.party;
        if (!partyNumber && currentSaved.party_number) partyNumber = currentSaved.party_number;
      } catch {}

      const partyInfo = partyNumber
        ? ` · Nº ${partyNumber}` + (party ? ` – ${party}` : '')
        : party ? ` · ${party}` : '';
      candidateRow.getCell(1).value = `${resolvedName}${partyInfo}`;
      candidateRow.getCell(1).style = {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } },
        alignment: { horizontal: 'center', vertical: 'middle' }
      };

      // Linha 3 — Sub-info: total igual ao app + data de geração
      worksheet.mergeCells('A3:J3');
      const infoRow = worksheet.getRow(3);
      infoRow.height = 18;
      const genDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      infoRow.getCell(1).value = `Total de registros: ${exportList.length}   |   Gerado em: ${genDate}`;
      infoRow.getCell(1).style = {
        font: { italic: true, color: { argb: 'FF002060' }, size: 10 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F7' } },
        alignment: { horizontal: 'center', vertical: 'middle' }
      };

      // Linha 4 — vazia (espaçamento visual)
      // Linha 5 — Cabeçalho das colunas
      const headerRow = worksheet.getRow(5);
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

      exportList.forEach(m => {
        // Recalcula a idade na hora do export para ficar igual ao app
        const currentAge = recalcAge(m.birthDate) || m.age || '';
        worksheet.addRow([
          m.name,
          formatPhoneForExport(m.phone),          // Telefone formatado igual ao app
          m.email || '',
          formatBirthDate(m.birthDate),            // Data nascimento sem bug de timezone
          currentAge,                              // Idade recalculada na hora do export
          m.gender,
          m.voterId || '',
          m.voterSection || '',
          m.voterZone || '',
          formatCreatedAt(m.createdAt)             // Data de cadastro
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
    isExporting,
    isImporting
  };
}
