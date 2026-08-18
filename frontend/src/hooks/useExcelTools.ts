import { useState } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Member } from '../types';

export function useExcelTools(
  members: Member[],
  saveMembers: (data: Member[]) => Promise<void>,
  showToast: (msg: string) => void,
  organization?: any
) {
  const [isExporting, setIsExporting] = useState(false);

  // ... (handleImportExcel permanece igual)
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
        for (let i = 0; i < Math.min(rows.length, 5); i++) {
          rows[i].forEach((cell, idx) => {
            const val = cell?.toString().toLowerCase() || "";
            if (nameCol === -1 && (val.includes("nome") || val.includes("eleitor") || (val.length > 5 && isNaN(Number(val))))) nameCol = idx;
            if (phoneCol === -1 && (val.includes("tel") || val.includes("fone") || val.includes("cel") || val.includes("zap") || val.includes("whatsapp"))) phoneCol = idx;
          });
        }
        if (nameCol === -1) nameCol = 0;
        if (phoneCol === -1) phoneCol = 1;

        const importedData: Member[] = rows.map((row) => {
          if (!row || row.length === 0) return null;
          const val = row[nameCol]?.toString().toLowerCase() || "";
          if (val.includes("relatório") || val.includes("total") || val.length < 2) return null;
          if (val === "nome completo" || val === "nome") return null;
          return {
            id: Math.random().toString(36).substring(2, 11),
            name: row[nameCol]?.toString().trim() || "Sem Nome",
            phone: row[phoneCol]?.toString().replace(/\D/g, '') || "",
            email: "",
            gender: "Não Informado",
            createdAt: new Date().toISOString(),
          };
        }).filter((m): m is Member => m !== null);

        if (importedData.length > 0) {
          saveMembers([...importedData, ...members]);
          showToast(`✅ ${importedData.length} registros importados!`);
        }
      } catch (err) { console.error(err); }
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
