/**
 * Servidor de exportação — salva o Excel diretamente na Área de Trabalho usando ExcelJS
 */
import express from 'express';
import cors from 'cors';
import ExcelJS from 'exceljs';
import { join } from 'path';
import { homedir } from 'os';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3500;

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- ROTA DE EXPORTAÇÃO EXCEL (EDIÇÃO PREMIUM) ---
app.post('/api/export-excel', async (req, res) => {
  try {
    const { members = [] } = req.body;
    if (!members || members.length === 0) {
      return res.status(400).json({ error: 'Base vazia.' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Base de Eleitores');

    // 1. Congelar as 4 primeiras linhas (CONGELAMENTO NATIVO)
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 4, topLeftCell: 'A5', activeCell: 'A5' }
    ];

    // 2. Título (Linha 1)
    worksheet.mergeCells('A1:J1');
    const titleRow = worksheet.getRow(1);
    titleRow.height = 45;
    titleRow.getCell(1).value = 'RELATÓRIO ESTRATÉGICO - MIRLA MIRANDA 2026';
    titleRow.getCell(1).style = {
      font: { name: 'Arial Black', size: 22, bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF007F' } }, // Rosa Mirla
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: { bottom: { style: 'medium', color: { argb: 'FF000000' } } }
    };

    // 3. Sumário e Data (Linha 2)
    const now = new Date();
    const summaryRow = worksheet.getRow(2);
    summaryRow.height = 25;
    summaryRow.getCell(1).value = 'TOTAL DE REGISTROS:';
    summaryRow.getCell(2).value = members.length;
    summaryRow.getCell(4).value = 'EXTRAÇÃO EM:';
    summaryRow.getCell(5).value = now.toLocaleString('pt-BR');
    
    const summaryStyle: Partial<ExcelJS.Style> = {
      font: { name: 'Arial', bold: true, size: 10, color: { argb: 'FF000000' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }, // Amarelo
      alignment: { vertical: 'middle' },
      border: { 
        top: { style: 'thin' }, left: { style: 'thin' }, 
        bottom: { style: 'thin' }, right: { style: 'thin' } 
      }
    };
    [1, 2, 4, 5].forEach(col => {
      summaryRow.getCell(col).style = summaryStyle;
    });

    // 4. Linha de Espaçamento (Linha 3)
    worksheet.getRow(3).height = 10;

    // 5. Cabeçalhos (Linha 4)
    const headerRow = worksheet.getRow(4);
    headerRow.height = 30;
    const headers = [
      'NOME COMPLETO', 'WHATSAPP', 'E-MAIL', 'NASCIMENTO',
      'IDADE', 'GÊNERO', 'TÍTULO', 'SEÇÃO', 'ZONA', 'CADASTRO'
    ];
    
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.style = {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003366' } }, // Azul Gov
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'medium', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FFFFFFFF' } }
        }
      };
    });

    // 6. Dados (A partir da Linha 5)
    members.forEach((m: any, index: number) => {
      const row = worksheet.addRow([
        m.name || '',
        m.phone || '',
        m.email || '',
        m.birthDate ? new Date(m.birthDate).toLocaleDateString('pt-BR') : 'N/A',
        m.age || 'N/A',
        m.gender || '',
        m.voterId || 'N/A',
        m.voterSection || '0000',
        m.voterZone || '000',
        m.createdAt ? new Date(m.createdAt).toLocaleString('pt-BR') : ''
      ]);
      
      const isEven = index % 2 === 0;
      row.eachCell((cell, colNumber) => {
        cell.style = {
          font: { size: 10, name: 'Arial' },
          fill: isEven ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } } : undefined,
          alignment: { 
            horizontal: (colNumber >= 5 && colNumber <= 9) ? 'center' : 'left', 
            vertical: 'middle',
            indent: (colNumber === 1 || colNumber === 3) ? 1 : 0
          },
          border: { 
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFF3F4F6' } }
          }
        };
      });
    });

    // Largura das Colunas
    worksheet.columns.forEach((col, i) => {
      const widths = [45, 22, 35, 18, 10, 18, 20, 10, 10, 25];
      col.width = widths[i];
    });

    // 7. Salvar e Enviar
    const dateStr = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
    const timeStr = now.toLocaleTimeString('pt-BR').replace(/:/g, '');
    const fileName = `ESTRATEGICO_MIRLA_2026_${dateStr}_${timeStr}.xlsx`;
    const filePath = join(homedir(), 'Desktop', fileName);

    await workbook.xlsx.writeFile(filePath);
    res.json({ success: true, path: filePath, fileName });

  } catch (err: any) {
    console.error('Erro na exportação:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor de exportação premium rodando em http://localhost:${PORT}`);
});
