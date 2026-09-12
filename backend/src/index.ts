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

// Configuração do Supabase (com service role para operações irrestritas)
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Helper de normalização
function normalizeName(n?: string | null): string {
  if (!n) return '';
  return n.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
}

function cleanPhone(p?: string | null): string {
  if (!p) return '';
  return p.replace(/\D/g, '');
}

// --- ROTA DE EXCLUSÃO DE MEMBROS (GARANTIA DE EXCLUSÃO DEFINITIVA) ---
app.post('/api/delete-members', async (req, res) => {
  try {
    const { ids = [] } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Nenhum ID fornecido.' });
    }

    const cleanIds = ids.map(id => String(id).trim()).filter(Boolean);
    const BATCH_SIZE = 200;
    let deletedCount = 0;

    for (let i = 0; i < cleanIds.length; i += BATCH_SIZE) {
      const batch = cleanIds.slice(i, i + BATCH_SIZE);
      const { error, count } = await supabase
        .from('members')
        .delete({ count: 'exact' })
        .in('id', batch);

      if (error) {
        console.error('Erro ao deletar lote no Supabase:', error);
      } else {
        deletedCount += (count || batch.length);
      }
    }

    console.log(`🗑️ ${deletedCount} membros removidos com sucesso via backend.`);
    res.json({ success: true, deletedCount });
  } catch (err: any) {
    console.error('Erro ao deletar membros:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- ROTA DE EXCLUSÃO DE COORDENADORES ---
app.post('/api/delete-coordinators', async (req, res) => {
  try {
    const { ids = [] } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Nenhum ID fornecido.' });
    }

    const cleanIds = ids.map(id => String(id).trim()).filter(Boolean);
    // Desvincular membros e rede do coordenador para evitar restrição de Foreign Key (409)
    try {
      await supabase.from('members').update({ coordinatorId: null }).in('coordinatorId', cleanIds);
      await supabase.from('coordinators').update({ network_id: null }).in('network_id', cleanIds);
    } catch (e) {
      console.warn('Aviso ao desvincular FK de coordenadores:', e);
    }

    const { error, count } = await supabase
      .from('coordinators')
      .delete({ count: 'exact' })
      .in('id', cleanIds);

    if (error) throw error;
    res.json({ success: true, deletedCount: count || cleanIds.length });
  } catch (err: any) {
    console.error('Erro ao deletar coordenadores:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- ROTA DE DEDUPLICAÇÃO GERAL DE MEMBROS ---
app.post('/api/deduplicate', async (req, res) => {
  try {
    const { orgId } = req.body;
    console.log(`🧹 Iniciando deduplicação... ${orgId ? `Org: ${orgId}` : 'Todas as Orgs'}`);

    // 1. Buscar todos os membros
    let allMembers: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      let query = supabase.from('members').select('*').range(from, from + pageSize - 1);
      if (orgId && orgId !== 'demo-org' && orgId !== 'undefined') {
        query = query.eq('org_id', orgId);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) break;
      allMembers.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    // 2. Agrupar por org_id
    const orgGroups: { [key: string]: any[] } = {};
    allMembers.forEach(m => {
      const o = m.org_id || 'global';
      if (!orgGroups[o]) orgGroups[o] = [];
      orgGroups[o].push(m);
    });

    const toDeleteIds: string[] = [];

    // 3. Processar duplicidades dentro de cada organização
    for (const orgKey in orgGroups) {
      const list = orgGroups[orgKey];

      // Ordenar: mais completos primeiro, depois os mais novos
      list.sort((a, b) => {
        const scoreA = (a.phone ? 5 : 0) + (a.voterId ? 5 : 0) + (a.email ? 3 : 0) + (a.birthDate ? 2 : 0) + (a.coordinatorId ? 2 : 0);
        const scoreB = (b.phone ? 5 : 0) + (b.voterId ? 5 : 0) + (b.email ? 3 : 0) + (b.birthDate ? 2 : 0) + (b.coordinatorId ? 2 : 0);
        if (scoreA !== scoreB) return scoreB - scoreA;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });

      const seenPhone = new Map<string, string>();
      const seenName = new Map<string, string>();
      const seenVoter = new Map<string, string>();

      list.forEach(m => {
        const phone = cleanPhone(m.phone);
        const name = normalizeName(m.name);
        const voter = (m.voterId || '').trim();

        let isDup = false;

        if (phone && phone.length >= 8) {
          if (seenPhone.has(phone)) {
            isDup = true;
          }
        }

        if (!isDup && name && name.length >= 2) {
          if (seenName.has(name)) {
            isDup = true;
          }
        }

        if (!isDup && voter && voter.length >= 5) {
          if (seenVoter.has(voter)) {
            isDup = true;
          }
        }

        if (isDup) {
          toDeleteIds.push(m.id);
        } else {
          if (phone && phone.length >= 8) seenPhone.set(phone, m.id);
          if (name && name.length >= 2) seenName.set(name, m.id);
          if (voter && voter.length >= 5) seenVoter.set(voter, m.id);
        }
      });
    }

    // 4. Executar exclusão em lotes
    let deletedCount = 0;
    const BATCH_SIZE = 200;
    for (let i = 0; i < toDeleteIds.length; i += BATCH_SIZE) {
      const batch = toDeleteIds.slice(i, i + BATCH_SIZE);
      const { error, count } = await supabase
        .from('members')
        .delete({ count: 'exact' })
        .in('id', batch);

      if (error) {
        console.error('Erro ao deletar lote de duplicatas:', error);
      } else {
        deletedCount += (count || batch.length);
      }
    }

    console.log(`✅ Deduplicação concluída: ${toDeleteIds.length} duplicatas eliminadas.`);
    res.json({
      success: true,
      totalAnalyzed: allMembers.length,
      deletedCount: toDeleteIds.length,
      deletedIds: toDeleteIds,
      remainingCount: allMembers.length - toDeleteIds.length
    });
  } catch (err: any) {
    console.error('Erro na deduplicação:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- ROTA DE DEDUPLICAÇÃO DE COORDENADORES ---
app.post('/api/deduplicate-coordinators', async (req, res) => {
  try {
    const { orgId } = req.body;
    let query = supabase.from('coordinators').select('*');
    if (orgId && orgId !== 'demo-org' && orgId !== 'undefined') {
      query = query.eq('org_id', orgId);
    }
    const { data: coords, error } = await query;
    if (error) throw error;
    if (!coords || coords.length === 0) {
      return res.json({ success: true, deletedCount: 0 });
    }

    const seenEmail = new Map<string, string>();
    const seenName = new Map<string, string>();
    const toDeleteIds: string[] = [];

    coords.forEach(c => {
      const email = (c.email || '').trim().toLowerCase();
      const name = normalizeName(c.name);

      let isDup = false;
      if (email && email.length > 3) {
        if (seenEmail.has(email)) isDup = true;
      }
      if (!isDup && name && name.length > 3) {
        if (seenName.has(name)) isDup = true;
      }

      if (isDup) {
        toDeleteIds.push(c.id);
      } else {
        if (email && email.length > 3) seenEmail.set(email, c.id);
        if (name && name.length > 3) seenName.set(name, c.id);
      }
    });

    if (toDeleteIds.length > 0) {
      await supabase.from('coordinators').delete().in('id', toDeleteIds);
    }

    res.json({
      success: true,
      totalAnalyzed: coords.length,
      deletedCount: toDeleteIds.length,
      deletedIds: toDeleteIds,
      remainingCount: coords.length - toDeleteIds.length
    });
  } catch (err: any) {
    console.error('Erro na deduplicação de coordenadores:', err);
    res.status(500).json({ error: err.message });
  }
});

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
