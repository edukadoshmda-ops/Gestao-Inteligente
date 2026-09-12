import { useState } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Member } from '../types';
import { normalizeName, cleanPhone, deduplicateMemberList } from '../lib/db';

export function useExcelTools(
  members: Member[],
  saveMembers: (data: Member[]) => Promise<void>,
  showToast: (msg: string) => void,
  organization?: any
) {
  const [isExporting, setIsExporting] = useState(false);

  const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        if (rows.length < 1) return;

        let nameCol = -1;
        let phoneCol = -1;
        let voterCol = -1;
        let emailCol = -1;
        for (let i = 0; i < Math.min(rows.length, 5); i++) {
          rows[i].forEach((cell, idx) => {
            const val = cell?.toString().toLowerCase() || "";
            if (nameCol === -1 && (val.includes("nome") || val.includes("eleitor") || (val.length > 5 && isNaN(Number(val))))) nameCol = idx;
            if (phoneCol === -1 && (val.includes("tel") || val.includes("fone") || val.includes("cel") || val.includes("zap") || val.includes("whatsapp"))) phoneCol = idx;
            if (voterCol === -1 && (val.includes("titulo") || val.includes("título") || val.includes("voter"))) voterCol = idx;
            if (emailCol === -1 && (val.includes("email") || val.includes("e-mail"))) emailCol = idx;
          });
        }
        if (nameCol === -1) nameCol = 0;
        if (phoneCol === -1) phoneCol = 1;

        const seenExistingPhones = new Set<string>();
        const seenExistingNames = new Set<string>();
        const seenExistingVoters = new Set<string>();

        members.forEach(m => {
          const p = cleanPhone(m.phone);
          const n = normalizeName(m.name);
          const v = (m.voterId || '').trim();
          if (p && p.length >= 8) seenExistingPhones.add(p);
          if (n && n.length >= 2) seenExistingNames.add(n);
          if (v && v.length >= 5) seenExistingVoters.add(v);
        });

        const newImported: Member[] = [];
        let skippedDuplicates = 0;

        for (const row of rows) {
          if (!row || row.length === 0) continue;
          const rawName = row[nameCol]?.toString().trim() || "";
          const normName = normalizeName(rawName);
          if (normName.includes("relatorio") || normName.includes("total") || normName.length < 2) continue;
          if (normName === "nome completo" || normName === "nome") continue;

          const rawPhone = phoneCol >= 0 ? (row[phoneCol]?.toString() || "") : "";
          const phone = cleanPhone(rawPhone);
          const voterId = voterCol >= 0 ? (row[voterCol]?.toString().trim() || "") : "";
          const email = emailCol >= 0 ? (row[emailCol]?.toString().trim().toLowerCase() || "") : "";

          // Checa duplicidade com existentes ou no mesmo lote
          let isDup = false;
          if (phone && phone.length >= 8) {
            if (seenExistingPhones.has(phone)) isDup = true;
          }
          if (!isDup && normName && normName.length >= 2) {
            if (seenExistingNames.has(normName)) isDup = true;
          }
          if (!isDup && voterId && voterId.length >= 5) {
            if (seenExistingVoters.has(voterId)) isDup = true;
          }

          if (isDup) {
            skippedDuplicates++;
            continue;
          }

          if (phone && phone.length >= 8) seenExistingPhones.add(phone);
          if (normName && normName.length >= 2) seenExistingNames.add(normName);
          if (voterId && voterId.length >= 5) seenExistingVoters.add(voterId);

          newImported.push({
            id: Math.random().toString(36).substring(2, 11),
            name: rawName,
            phone: phone || rawPhone,
            email: email,
            voterId: voterId || undefined,
            gender: "Não Informado",
            createdAt: new Date().toISOString(),
          });
        }

        if (newImported.length > 0) {
          const combined = [...newImported, ...members];
          const { deduplicated } = deduplicateMemberList(combined);
          saveMembers(deduplicated);
          showToast(`✅ ${newImported.length} registros importados! (${skippedDuplicates} duplicatas evitadas)`);
        } else if (skippedDuplicates > 0) {
          showToast(`⚠️ Todos os ${skippedDuplicates} registros já constam na base de dados (nenhum duplicado inserido).`);
        } else {
          showToast('Nenhum registro válido encontrado no arquivo.');
        }
      } catch (err) {
        console.error(err);
        showToast('Erro ao importar arquivo Excel.');
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const handleExportExcel = async () => {
    if (members.length === 0) return alert('Base vazia.');
    setIsExporting(true);
    showToast('Gerando relatório estratégico...');

    try {

      try {
        // 2. FALLBACK: ExcelJS direto no Navegador (Com download forçado)
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Base de Eleitores');

        // Congelamento e Estilos
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
          'FF00B050', // NOME
          'FFFF0000', // ZAP
          'FF00B0F0', // E-MAIL
          'FF92D050', // NASC
          'FFC65911', // IDADE
          'FFFFC000', // GÊNERO
          'FF000000', // TÍTULO
          'FFFF0000', // SEÇÃO
          'FF548235', // ZONA
          'FF5B9BD5'  // DATA
        ];
        headers.forEach((h, i) => {
          headerRow.getCell(i + 1).value = h;
          headerRow.getCell(i + 1).style = {
            font: { color: { argb: 'FFFFFFFF' }, bold: true },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColors[i] } },
            alignment: { horizontal: 'center' }
          };
        });

        members.forEach((m) => {
          worksheet.addRow([
            m.name, m.phone, m.email || '', 
            m.birthDate ? new Date(m.birthDate).toLocaleDateString('pt-BR') : '',
            m.age || '', m.gender, m.voterId || '', m.voterSection || '', m.voterZone || '',
            new Date(m.createdAt).toLocaleDateString('pt-BR')
          ]);
        });

        worksheet.columns.forEach((col, i) => col.width = [35, 18, 25, 12, 8, 12, 18, 10, 10, 15][i]);

        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = `GESTAO_INTELIGENTE_RELATORIO_${new Date().getTime()}.xlsx`;

        // 1. Tentar usar File System Access API (Navegadores Modernos Desktop)
        try {
          if ('showSaveFilePicker' in window) {
            const handle = await (window as any).showSaveFilePicker({
              suggestedName: fileName,
              types: [{
                description: 'Planilha Excel',
                accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
              }],
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

        // 2. Fallback Seguro (Base64)
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
        console.error('Erro no fallback:', fallbackErr);
        alert('Erro ao gerar a planilha. Tente novamente.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  return { handleImportExcel, handleExportExcel, isExporting };
}
