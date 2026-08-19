/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useRef, useState } from 'react';
import { Member, Coordinator } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area, Legend
} from 'recharts';
import {
  Trophy, Medal, Target, Crown, Star, TrendingUp, Award,
  FileText, Loader2, Download, Check, Users, MapPin, Sparkles,
  PieChart as PieIcon, BarChart3, ArrowUpRight, Search, ShieldCheck,
  Heart, Flame, Compass, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

interface AnalyticsTabProps {
  members: Member[];
  coordinators: Coordinator[];
  activeTab: 'gender' | 'report' | 'ranking' | 'neighborhood';
}

// ── PDF helper ────────────────────────────────────────────────────────────────
async function downloadAsPDF(
  containerRef: React.RefObject<HTMLDivElement>,
  filename: string,
  title: string,
  subtitle: string
) {
  if (!containerRef.current) return;

  const canvas = await html2canvas(containerRef.current, {
    scale: 1.5,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    onclone: (clonedDoc, clonedEl) => {
      // Force desktop styling during capture
      if (clonedEl) {
        clonedEl.style.width = '1200px';
        clonedEl.style.minWidth = '1200px';
        clonedEl.style.padding = '40px';
        clonedEl.style.boxSizing = 'border-box';
      }

      const svgs = clonedDoc.querySelectorAll('svg');
      svgs.forEach(svg => {
        const rect = svg.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          svg.setAttribute('width', rect.width.toString());
          svg.setAttribute('height', rect.height.toString());
        }
      });

      // OKLCH/OKLAB CSS overrides for Tailwind
      const styles = clonedDoc.querySelectorAll('style');
      styles.forEach(style => {
        if (style.innerHTML) {
          style.innerHTML = style.innerHTML
            .replace(/oklch\([^)]+\)/gi, '#0d1b3e')
            .replace(/oklab\([^)]+\)/gi, '#0d1b3e');
        }
      });

      const allElements = clonedDoc.querySelectorAll('*');
      allElements.forEach(el => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.style) {
          const styleKeys = Array.from(htmlEl.style);
          styleKeys.forEach(prop => {
            const val = htmlEl.style.getPropertyValue(prop);
            if (val && (val.includes('oklch') || val.includes('oklab'))) {
              htmlEl.style.setProperty(prop, '#0d1b3e');
            }
          });
        }
      });
    }
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 12;

  // Header bar
  pdf.setFillColor(0, 51, 102);
  pdf.rect(0, 0, pageW, 22, 'F');

  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 204, 0);
  pdf.text('GESTÃO INTELIGENTE — Relatório Estratégico', margin, 14);

  // Date top-right
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(200, 200, 200);
  const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  pdf.text(`Gerado em ${now}`, pageW - margin, 14, { align: 'right' });

  // Title + subtitle
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 51, 102);
  pdf.text(title.toUpperCase(), margin, 34);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(subtitle, margin, 41);

  // Chart image
  const chartY = 47;
  const maxImgW = pageW - margin * 2;
  const imgRatio = canvas.height / canvas.width;
  const imgW = Math.min(maxImgW, 240);
  const imgH = imgW * imgRatio;

  const imgX = (pageW - imgW) / 2;
  pdf.addImage(imgData, 'PNG', imgX, chartY, imgW, Math.min(imgH, pageH - chartY - 14));

  // Footer
  pdf.setFillColor(245, 245, 245);
  pdf.rect(0, pageH - 10, pageW, 10, 'F');
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(160, 160, 160);
  pdf.text('Sistema Gestão Inteligente | Plataforma Eleitoral | gestao-inteligente.com', pageW / 2, pageH - 4, { align: 'center' });

  pdf.save(filename);
}

// ── PDF Button ────────────────────────────────────────────────────────────────
function PDFButton({ containerRef, filename, title, subtitle }: {
  containerRef: React.RefObject<HTMLDivElement>;
  filename: string;
  title: string;
  subtitle: string;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      await downloadAsPDF(containerRef, filename, title, subtitle);
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } catch (err: any) {
      console.error('Erro ao gerar PDF:', err);
      alert(`⚠️ Erro ao gerar o relatório em PDF: ${err.message || err}. Tente novamente ou imprima via navegador.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handle}
      disabled={loading}
      title="Baixar este relatório em PDF"
      className={`flex items-center gap-2 px-5 py-2.5 font-black uppercase text-[10px] tracking-widest transition-all shadow-md border-b-4 select-none rounded-2xl
        ${done
          ? 'bg-green-500 border-green-700 text-white'
          : loading
          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
          : 'bg-[#FF0000] border-red-800 text-white hover:bg-red-700 active:scale-95'
        }`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : done ? (
        <Check className="w-4 h-4" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      {loading ? 'Gerando...' : done ? 'Baixado!' : 'Baixar PDF'}
    </button>
  );
}

// ── Consolidated PDF Button ──────────────────────────────────────────────────
function ConsolidatedPDFButton({
  members,
  coordinators,
  rankingData,
  genderData,
  ageData,
  neighborhoodData
}: {
  members: Member[];
  coordinators: Coordinator[];
  rankingData: any[];
  genderData: any[];
  ageData: any[];
  neighborhoodData?: any[];
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState('');

  const handle = async () => {
    setLoading(true);
    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

      // Page 1: Ranking
      setProgress('1/3 - Placar de Líderes...');
      const rankingEl = document.getElementById('pdf-consolidated-ranking');
      if (!rankingEl) throw new Error('Elemento de Ranking não encontrado');
      
      const canvas1 = await html2canvas(rankingEl, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const styles = clonedDoc.querySelectorAll('style');
          styles.forEach(style => {
            if (style.innerHTML) {
              style.innerHTML = style.innerHTML
                .replace(/oklch\([^)]+\)/gi, '#0d1b3e')
                .replace(/oklab\([^)]+\)/gi, '#0d1b3e');
            }
          });
        }
      });
      
      // Page 2: Gênero
      setProgress('2/3 - Distribuição por Gênero...');
      const genderEl = document.getElementById('pdf-consolidated-gender');
      if (!genderEl) throw new Error('Elemento de Gênero não encontrado');
      
      const canvas2 = await html2canvas(genderEl, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const svgs = clonedDoc.querySelectorAll('svg');
          svgs.forEach(svg => {
            const rect = svg.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              svg.setAttribute('width', rect.width.toString());
              svg.setAttribute('height', rect.height.toString());
            }
          });
          const styles = clonedDoc.querySelectorAll('style');
          styles.forEach(style => {
            if (style.innerHTML) {
              style.innerHTML = style.innerHTML
                .replace(/oklch\([^)]+\)/gi, '#0d1b3e')
                .replace(/oklab\([^)]+\)/gi, '#0d1b3e');
            }
          });
        }
      });

      // Page 3: Faixa Etária
      setProgress('3/3 - Faixa Etária...');
      const ageEl = document.getElementById('pdf-consolidated-age');
      if (!ageEl) throw new Error('Elemento de Idade não encontrado');
      
      const canvas3 = await html2canvas(ageEl, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const svgs = clonedDoc.querySelectorAll('svg');
          svgs.forEach(svg => {
            const rect = svg.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              svg.setAttribute('width', rect.width.toString());
              svg.setAttribute('height', rect.height.toString());
            }
          });
          const styles = clonedDoc.querySelectorAll('style');
          styles.forEach(style => {
            if (style.innerHTML) {
              style.innerHTML = style.innerHTML
                .replace(/oklch\([^)]+\)/gi, '#0d1b3e')
                .replace(/oklab\([^)]+\)/gi, '#0d1b3e');
            }
          });
        }
      });

      setProgress('Montando PDF Executivo...');
      
      // Page 1 Setup
      pdf.setFillColor(0, 51, 102);
      pdf.rect(0, 0, pageW, 22, 'F');
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 204, 0);
      pdf.text('GESTÃO INTELIGENTE — Relatório Executivo Consolidado', margin, 14);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(200, 200, 200);
      pdf.text(`Gerado em ${now} | Página 1 de 3`, pageW - margin, 14, { align: 'right' });
      
      const imgData1 = canvas1.toDataURL('image/png');
      const maxImgW = pageW - margin * 2;
      const imgRatio1 = canvas1.height / canvas1.width;
      const imgW = Math.min(maxImgW, 235);
      const imgH1 = imgW * imgRatio1;
      const imgX = (pageW - imgW) / 2;
      pdf.addImage(imgData1, 'PNG', imgX, 30, imgW, Math.min(imgH1, pageH - 45));
      
      pdf.setFillColor(245, 245, 245);
      pdf.rect(0, pageH - 10, pageW, 10, 'F');
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(160, 160, 160);
      pdf.text('Sistema Gestão Inteligente | Relatório Unificado de Campanha | gestao-inteligente.com', pageW / 2, pageH - 4, { align: 'center' });

      // Page 2 Setup
      pdf.addPage();
      pdf.setFillColor(0, 51, 102);
      pdf.rect(0, 0, pageW, 22, 'F');
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 204, 0);
      pdf.text('GESTÃO INTELIGENTE — Relatório Executivo Consolidado', margin, 14);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(200, 200, 200);
      pdf.text(`Gerado em ${now} | Página 2 de 3`, pageW - margin, 14, { align: 'right' });
      
      const imgData2 = canvas2.toDataURL('image/png');
      const imgRatio2 = canvas2.height / canvas2.width;
      const imgH2 = imgW * imgRatio2;
      pdf.addImage(imgData2, 'PNG', imgX, 30, imgW, Math.min(imgH2, pageH - 45));
      
      pdf.setFillColor(245, 245, 245);
      pdf.rect(0, pageH - 10, pageW, 10, 'F');
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(160, 160, 160);
      pdf.text('Sistema Gestão Inteligente | Relatório Unificado de Campanha | gestao-inteligente.com', pageW / 2, pageH - 4, { align: 'center' });

      // Page 3 Setup
      pdf.addPage();
      pdf.setFillColor(0, 51, 102);
      pdf.rect(0, 0, pageW, 22, 'F');
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 204, 0);
      pdf.text('GESTÃO INTELIGENTE — Relatório Executivo Consolidado', margin, 14);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(200, 200, 200);
      pdf.text(`Gerado em ${now} | Página 3 de 3`, pageW - margin, 14, { align: 'right' });
      
      const imgData3 = canvas3.toDataURL('image/png');
      const imgRatio3 = canvas3.height / canvas3.width;
      const imgH3 = imgW * imgRatio3;
      pdf.addImage(imgData3, 'PNG', imgX, 30, imgW, Math.min(imgH3, pageH - 45));
      
      pdf.setFillColor(245, 245, 245);
      pdf.rect(0, pageH - 10, pageW, 10, 'F');
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(160, 160, 160);
      pdf.text('Sistema Gestão Inteligente | Relatório Unificado de Campanha | gestao-inteligente.com', pageW / 2, pageH - 4, { align: 'center' });

      pdf.save(`relatorio-consolidado-campanha-${Date.now()}.pdf`);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (err: any) {
      console.error('Erro ao gerar relatório consolidado:', err);
      alert(`⚠️ Erro ao gerar o relatório consolidado: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handle}
      disabled={loading}
      className={`flex items-center gap-2 px-6 py-3.5 font-black uppercase text-[10px] tracking-wider transition-all shadow-lg border-b-4 select-none rounded-2xl
        ${done
          ? 'bg-green-600 border-green-800 text-white'
          : loading
          ? 'bg-blue-50 border-blue-100 text-blue-400 cursor-not-allowed'
          : 'bg-[#003366] border-[#002244] text-[#FFD700] hover:bg-[#002244] active:scale-95'
        }`}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{progress}</span>
        </div>
      ) : done ? (
        <>
          <Check className="w-4 h-4 text-white" />
          <span>Relatório Consolidado Baixado!</span>
        </>
      ) : (
        <>
          <FileText className="w-4 h-4 text-[#FFD700]" />
          <span>Baixar Relatório Geral (PDF Completo)</span>
        </>
      )}
    </button>
  );
}

// ── Tooltip Customizado Premium ──────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0B192C] text-white p-3.5 rounded-2xl shadow-2xl border-2 border-gov-yellow/40 backdrop-blur-md">
        <p className="text-[11px] font-black uppercase tracking-wider text-gov-yellow mb-1">{label}</p>
        <p className="text-sm font-bold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gov-yellow animate-pulse" />
          <span className="text-white">{payload[0].value.toLocaleString('pt-BR')}</span>
          <span className="text-[10px] text-gray-300 font-normal">apoiadores</span>
        </p>
      </div>
    );
  }
  return null;
};

// ── Componente Principal ──────────────────────────────────────────────────────
export default function AnalyticsTab({ members, coordinators, activeTab }: AnalyticsTabProps) {
  const rankingRef = useRef<HTMLDivElement>(null);
  const genderRef  = useRef<HTMLDivElement>(null);
  const ageRef     = useRef<HTMLDivElement>(null);
  const neighborhoodRef = useRef<HTMLDivElement>(null);
  const consolidatedRef = useRef<HTMLDivElement>(null);

  const [neighborhoodSearch, setNeighborhoodSearch] = useState('');

  // 1. Dados do Ranking
  const rankingData = useMemo(() => {
    const counts: Record<string, number> = {};
    members.forEach(m => {
      if (m.coordinatorId) {
        counts[m.coordinatorId] = (counts[m.coordinatorId] || 0) + 1;
      }
    });
    return coordinators
      .map(c => ({ id: c.id, name: c.name, count: counts[c.id] || 0, points: (counts[c.id] || 0) * 10, photo: c.photo }))
      .sort((a, b) => b.count - a.count);
  }, [members, coordinators]);

  // 2. Dados de Faixa Etária
  const ageData = useMemo(() => {
    const ranges: Record<string, { count: number; label: string; desc: string; color: string }> = {
      '16-24': { count: 0, label: '16 a 24 anos', desc: 'Jovens & Universitários', color: '#6366F1' },
      '25-34': { count: 0, label: '25 a 34 anos', desc: 'Jovens Profissionais', color: '#3B82F6' },
      '35-44': { count: 0, label: '35 a 44 anos', desc: 'Adultos Estabelecidos', color: '#10B981' },
      '45-54': { count: 0, label: '45 a 54 anos', desc: 'Maduros & Chefes de Família', color: '#F59E0B' },
      '55-64': { count: 0, label: '55 a 64 anos', desc: 'Experientes & Líderes', color: '#EC4899' },
      '65+':   { count: 0, label: '65+ anos',     desc: 'Terceira Idade & Sênior', color: '#8B5CF6' },
    };

    members.forEach(m => {
      if (!m.age) return;
      if (m.age < 25) ranges['16-24'].count++;
      else if (m.age < 35) ranges['25-34'].count++;
      else if (m.age < 45) ranges['35-44'].count++;
      else if (m.age < 55) ranges['45-54'].count++;
      else if (m.age < 65) ranges['55-64'].count++;
      else ranges['65+'].count++;
    });

    return Object.entries(ranges).map(([range, info]) => ({
      range,
      count: info.count,
      label: info.label,
      desc: info.desc,
      color: info.color,
      percentage: members.length > 0 ? ((info.count / members.length) * 100).toFixed(1) : '0'
    }));
  }, [members]);

  // Insights de Faixa Etária
  const ageInsights = useMemo(() => {
    const sorted = [...ageData].sort((a, b) => b.count - a.count);
    const dominant = sorted[0] || { range: 'N/A', count: 0, percentage: '0', label: 'Nenhum' };
    
    const youth = ageData.filter(a => a.range === '16-24' || a.range === '25-34').reduce((acc, curr) => acc + curr.count, 0);
    const adult = ageData.filter(a => a.range === '35-44' || a.range === '45-54').reduce((acc, curr) => acc + curr.count, 0);
    const senior = ageData.filter(a => a.range === '55-64' || a.range === '65+').reduce((acc, curr) => acc + curr.count, 0);

    const total = members.length || 1;
    return {
      dominant,
      youth: { count: youth, pct: ((youth / total) * 100).toFixed(1) },
      adult: { count: adult, pct: ((adult / total) * 100).toFixed(1) },
      senior: { count: senior, pct: ((senior / total) * 100).toFixed(1) },
    };
  }, [ageData, members]);

  // 3. Dados de Gênero
  const genderData = useMemo(() => {
    const counts = {
      'Feminino': 0,
      'Masculino': 0,
      'Outro / Não Informado': 0
    };

    members.forEach(m => {
      const g = (m.gender || '').trim().toLowerCase();
      if (g.startsWith('f') || g === 'feminino' || g === 'mulher') counts['Feminino']++;
      else if (g.startsWith('m') || g === 'masculino' || g === 'homem') counts['Masculino']++;
      else counts['Outro / Não Informado']++;
    });

    const total = members.length || 1;

    return [
      { name: 'Feminino', value: counts['Feminino'], color: '#EC4899', gradient: '#F472B6', pct: ((counts['Feminino'] / total) * 100).toFixed(1) },
      { name: 'Masculino', value: counts['Masculino'], color: '#2563EB', gradient: '#60A5FA', pct: ((counts['Masculino'] / total) * 100).toFixed(1) },
      { name: 'Outros / Não Informado', value: counts['Outro / Não Informado'], color: '#F59E0B', gradient: '#FCD34D', pct: ((counts['Outro / Não Informado'] / total) * 100).toFixed(1) }
    ];
  }, [members]);

  // 4. Dados de Bairros
  const neighborhoodData = useMemo(() => {
    const counts: Record<string, number> = {};
    members.forEach(m => {
      const n = (m.neighborhood || '').trim() || 'Centro / Não Informado';
      counts[n] = (counts[n] || 0) + 1;
    });

    const total = members.length || 1;

    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: ((count / total) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count);
  }, [members]);

  const top10Neighborhoods = useMemo(() => {
    return neighborhoodData.slice(0, 10);
  }, [neighborhoodData]);

  const filteredNeighborhoods = useMemo(() => {
    if (!neighborhoodSearch.trim()) return neighborhoodData;
    return neighborhoodData.filter(n =>
      n.name.toLowerCase().includes(neighborhoodSearch.toLowerCase())
    );
  }, [neighborhoodData, neighborhoodSearch]);

  const top3   = rankingData.slice(0, 3);
  const others = rankingData.slice(3);

  return (
    <div className="space-y-6">
      {/* Top Banner with Consolidated PDF Button */}
      <div className="bg-gradient-to-r from-gov-blue via-blue-900 to-indigo-900 p-6 md:p-8 text-white rounded-2xl shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6 border-b-4 border-gov-yellow overflow-hidden relative">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-gov-yellow/20 text-gov-yellow border border-gov-yellow/40 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-gov-yellow animate-spin-slow" /> Inteligência Demográfica & Territorial
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Centro de Análise Estratégica</h2>
          <p className="text-xs text-blue-200 font-medium mt-1">Gráficos profissionais e mapeamento em tempo real com {members.length} apoiadores cadastrados</p>
        </div>
        <div className="relative z-10 w-full md:w-auto flex justify-end">
          <ConsolidatedPDFButton
            members={members}
            coordinators={coordinators}
            rankingData={rankingData}
            genderData={genderData}
            ageData={ageData}
            neighborhoodData={neighborhoodData}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ABA: FAIXA ETÁRIA */}
      {/* ========================================================================= */}
      {activeTab === 'report' && (
        <div ref={ageRef} className="space-y-6">
          {/* Header da Aba com Botão PDF */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-gov-blue" />
                <h3 className="text-xl font-black text-gov-blue uppercase tracking-tight">Distribuição por Faixa Etária</h3>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-1">Segmentação geracional do eleitorado para calibração de discursos e mídias</p>
            </div>
            <PDFButton
              containerRef={ageRef}
              filename={`relatorio-faixa-etaria-${Date.now()}.pdf`}
              title="Relatório Estratégico de Faixa Etária"
              subtitle={`Base total de ${members.length} eleitores analisados`}
            />
          </div>

          {/* Cards Executivos de Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-indigo-900 to-gov-blue text-white p-6 rounded-2xl shadow-lg border-b-4 border-gov-yellow">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase text-blue-200 tracking-wider">Faixa Mais Forte</span>
                <Trophy className="w-5 h-5 text-gov-yellow" />
              </div>
              <p className="text-2xl font-black text-white">{ageInsights.dominant.label}</p>
              <p className="text-xs text-gov-yellow font-black mt-1">{ageInsights.dominant.count} eleitores ({ageInsights.dominant.percentage}%)</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-2xl shadow-md border border-blue-100 border-l-4 border-l-blue-600">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Jovens (16-34 anos)</span>
                <Flame className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-gov-blue">{ageInsights.youth.count}</p>
              <div className="w-full bg-gray-100 h-2 rounded-full mt-2 overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full transition-all duration-1000" style={{ width: `${ageInsights.youth.pct}%` }} />
              </div>
              <p className="text-[10px] text-gray-500 font-bold mt-1.5">{ageInsights.youth.pct}% do eleitorado</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-2xl shadow-md border border-emerald-100 border-l-4 border-l-emerald-600">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Adultos (35-54 anos)</span>
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-gov-blue">{ageInsights.adult.count}</p>
              <div className="w-full bg-gray-100 h-2 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full transition-all duration-1000" style={{ width: `${ageInsights.adult.pct}%` }} />
              </div>
              <p className="text-[10px] text-gray-500 font-bold mt-1.5">{ageInsights.adult.pct}% do eleitorado</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-2xl shadow-md border border-purple-100 border-l-4 border-l-purple-600">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Sênior (55+ anos)</span>
                <ShieldCheck className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-black text-gov-blue">{ageInsights.senior.count}</p>
              <div className="w-full bg-gray-100 h-2 rounded-full mt-2 overflow-hidden">
                <div className="bg-purple-600 h-full rounded-full transition-all duration-1000" style={{ width: `${ageInsights.senior.pct}%` }} />
              </div>
              <p className="text-[10px] text-gray-500 font-bold mt-1.5">{ageInsights.senior.pct}% do eleitorado</p>
            </motion.div>
          </div>

          {/* Gráfico Principal de Barras e Área */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="font-black text-gov-blue uppercase text-sm">Volume de Votos por Idade</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Quantitativo exato de apoiadores em cada faixa</p>
                </div>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase rounded-full">Barras Interativas</span>
              </div>
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                    <defs>
                      <linearGradient id="ageBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#1E3A8A" stopOpacity={0.9} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="range" tickLine={false} axisLine={{ stroke: '#E2E8F0' }} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#475569' }} />
                    <YAxis tickLine={false} axisLine={{ stroke: '#E2E8F0' }} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#475569' }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={55} fill="url(#ageBarGrad)">
                      {ageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico de Área de Tendência Geracional */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100 flex flex-col justify-between">
              <div>
                <h4 className="font-black text-gov-blue uppercase text-sm">Curva de Penetração</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Distribuição contínua da campanha</p>
                <div className="h-[220px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ageAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="range" tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold' }} />
                      <YAxis tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#ageAreaGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="mt-4 p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
                <p className="text-[10px] font-black text-indigo-900 uppercase">💡 Dica Estratégica da IA</p>
                <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                  Para faixas acima de 45 anos, priorize mensagens institucionais sobre saúde e segurança via WhatsApp. Para jovens, intensifique conteúdos dinâmicos no Instagram e TikTok.
                </p>
              </div>
            </div>
          </div>

          {/* Cards Detalhados de Cada Faixa */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {ageData.map((item) => (
              <div key={item.range} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all hover:scale-105">
                <div className="w-3 h-3 rounded-full mb-2" style={{ backgroundColor: item.color }} />
                <p className="text-xs font-black text-gov-blue uppercase">{item.label}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase truncate">{item.desc}</p>
                <p className="text-xl font-black text-gov-blue mt-2">{item.count}</p>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: item.color }} />
                </div>
                <p className="text-[9px] font-black text-gray-500 mt-1">{item.percentage}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ABA: GÊNERO */}
      {/* ========================================================================= */}
      {activeTab === 'gender' && (
        <div ref={genderRef} className="space-y-6">
          {/* Header da Aba com Botão PDF */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <PieIcon className="w-6 h-6 text-gov-blue" />
                <h3 className="text-xl font-black text-gov-blue uppercase tracking-tight">Distribuição e Equilíbrio por Gênero</h3>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-1">Análise de penetração entre eleitoras e eleitores para direcionamento de pautas</p>
            </div>
            <PDFButton
              containerRef={genderRef}
              filename={`relatorio-genero-${Date.now()}.pdf`}
              title="Relatório de Distribuição por Gênero"
              subtitle={`Base total de ${members.length} eleitores cadastrados`}
            />
          </div>

          {/* Cards Executivos de Resumo de Gênero */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {genderData.map((d) => (
              <motion.div
                key={d.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-6 rounded-2xl shadow-xl border-t-4 hover:shadow-2xl transition-all"
                style={{ borderTopColor: d.color }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">Gênero</span>
                    <h4 className="text-lg font-black uppercase mt-0.5" style={{ color: d.color }}>{d.name}</h4>
                  </div>
                  <div className="p-3 rounded-2xl" style={{ backgroundColor: `${d.color}15` }}>
                    <Users className="w-6 h-6" style={{ color: d.color }} />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-3xl font-black text-gov-blue">{d.value.toLocaleString('pt-BR')}</span>
                  <span className="text-lg font-black" style={{ color: d.color }}>{d.pct}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full mt-3 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${d.pct}%`, backgroundColor: d.color }} />
                </div>
                <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase">Proporção na base de apoiadores</p>
              </motion.div>
            ))}
          </div>

          {/* Grid de Gráficos: Donut Chart + Barra Comparativa */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Donut Chart Moderno */}
            <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="font-black text-gov-blue uppercase text-sm">Composição Percentual</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Gráfico Donut de Alta Resolução</p>
                </div>
                <span className="px-3 py-1 bg-pink-50 text-pink-700 text-[10px] font-black uppercase rounded-full">Segmentação Ativa</span>
              </div>
              <div className="h-[340px] w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#0B192C] text-white p-3.5 rounded-2xl shadow-2xl border-2 border-gov-yellow/40">
                              <p className="text-[11px] font-black uppercase" style={{ color: data.color }}>{data.name}</p>
                              <p className="text-sm font-bold mt-1 text-white">{data.value.toLocaleString('pt-BR')} apoiadores ({data.pct}%)</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={75}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="#fff"
                      strokeWidth={3}
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value, entry: any) => (
                        <span className="text-[11px] font-black uppercase text-gov-blue mr-4">
                          {value} ({entry.payload.pct}%)
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Centro do Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                  <span className="text-[10px] font-black text-gray-400 uppercase">Total</span>
                  <span className="text-2xl font-black text-gov-blue">{members.length}</span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Eleitores</span>
                </div>
              </div>
            </div>

            {/* Painel Estratégico de Engajamento */}
            <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100 flex flex-col justify-between space-y-4">
              <div>
                <h4 className="font-black text-gov-blue uppercase text-sm">Diretrizes de Comunicação</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Estratégias por grupo demográfico</p>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-pink-50 border-l-4 border-pink-500 rounded-2xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="w-4 h-4 text-pink-600" />
                    <span className="text-xs font-black text-pink-900 uppercase">Pauta Feminina ({genderData[0]?.pct}%)</span>
                  </div>
                  <p className="text-[11px] text-pink-800 leading-relaxed font-medium">
                    No Brasil, mulheres decidem mais de 53% das eleições. Foque em propostas de creches em tempo integral, saúde preventiva da mulher e segurança pública nos bairros.
                  </p>
                </div>

                <div className="p-4 bg-blue-50 border-l-4 border-blue-600 rounded-2xl">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                    <span className="text-xs font-black text-blue-900 uppercase">Pauta Masculina ({genderData[1]?.pct}%)</span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                    Priorize temas ligados à geração de empregos locais, incentivo a microempreendedores, obras de infraestrutura urbana e transporte.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl text-center">
                <p className="text-[9px] font-black text-gray-400 uppercase">Índice de Diversidade da Campanha</p>
                <p className="text-sm font-black text-gov-blue uppercase mt-0.5">Equilibrado • Ampla Cobertura</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ABA: BAIRROS */}
      {/* ========================================================================= */}
      {activeTab === 'neighborhood' && (
        <div ref={neighborhoodRef} className="space-y-6">
          {/* Header da Aba com Botão PDF */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="w-6 h-6 text-gov-blue" />
                <h3 className="text-xl font-black text-gov-blue uppercase tracking-tight">Inteligência Territorial por Bairros</h3>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-1">Mapeamento de concentração de apoiadores, redutos eleitorais e áreas de expansão</p>
            </div>
            <PDFButton
              containerRef={neighborhoodRef}
              filename={`relatorio-bairros-${Date.now()}.pdf`}
              title="Relatório Estratégico de Bairros e Território"
              subtitle={`Total de ${neighborhoodData.length} bairros mapeados com ${members.length} eleitores`}
            />
          </div>

          {/* Cards Executivos de Resumo de Bairros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-emerald-800 to-teal-950 text-white p-6 rounded-2xl shadow-lg border-b-4 border-gov-yellow">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase text-emerald-200 tracking-wider">Bairro Principal</span>
                <Crown className="w-5 h-5 text-gov-yellow" />
              </div>
              <p className="text-xl font-black truncate">{neighborhoodData[0]?.name || 'N/A'}</p>
              <p className="text-xs text-gov-yellow font-black mt-1">{neighborhoodData[0]?.count || 0} apoiadores ({neighborhoodData[0]?.percentage || 0}%)</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-2xl shadow-md border border-blue-100 border-l-4 border-l-gov-blue">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Bairros Mapeados</span>
                <Compass className="w-5 h-5 text-gov-blue" />
              </div>
              <p className="text-2xl font-black text-gov-blue">{neighborhoodData.length}</p>
              <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase">Regiões com presença</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-2xl shadow-md border border-yellow-100 border-l-4 border-l-gov-yellow">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Média por Bairro</span>
                <BarChart3 className="w-5 h-5 text-gov-yellow" />
              </div>
              <p className="text-2xl font-black text-gov-blue">
                {neighborhoodData.length > 0 ? (members.length / neighborhoodData.length).toFixed(1) : 0}
              </p>
              <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase">Apoiadores / região</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-2xl shadow-md border border-purple-100 border-l-4 border-l-purple-600">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Top 5 Concentração</span>
                <Layers className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-black text-gov-blue">
                {neighborhoodData.slice(0, 5).reduce((acc, curr) => acc + curr.count, 0)}
              </p>
              <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase">
                {(neighborhoodData.slice(0, 5).reduce((acc, curr) => acc + parseFloat(curr.percentage), 0)).toFixed(1)}% do total
              </p>
            </motion.div>
          </div>

          {/* Gráfico de Barras Horizontal Top 10 Bairros */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h4 className="font-black text-gov-blue uppercase text-sm">Top 10 Bairros com Maior Força Eleitoral</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Ranking dos redutos eleitorais com mais apoiadores cadastrados</p>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-full">
                {top10Neighborhoods.length} Bairros em Destaque
              </span>
            </div>

            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={top10Neighborhoods}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 60, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="neighborhoodBarGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#059669" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" tickLine={false} axisLine={{ stroke: '#E2E8F0' }} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#475569' }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#1E293B' }}
                    width={120}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }} />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={28} fill="url(#neighborhoodBarGrad)">
                    {top10Neighborhoods.map((_, index) => {
                      const colors = ['#059669', '#0284C7', '#6366F1', '#8B5CF6', '#D97706', '#DC2626', '#4B5563'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela de Bairros com Busca Integrada */}
          <div className="bg-white rounded-none shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-5 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h4 className="font-black text-gov-blue uppercase text-xs">Todos os Bairros Cadastrados</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Classificação territorial completa</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={neighborhoodSearch}
                  onChange={(e) => setNeighborhoodSearch(e.target.value)}
                  placeholder="Filtrar bairro..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase focus:border-gov-blue outline-none text-gov-blue"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-left">
                <thead className="bg-gov-blue text-white sticky top-0 z-10 text-[9px] font-black uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Posição</th>
                    <th className="p-3.5">Nome do Bairro</th>
                    <th className="p-3.5 text-center">Total de Apoiadores</th>
                    <th className="p-3.5">Percentual da Base</th>
                    <th className="p-3.5 text-center">Status Estratégico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredNeighborhoods.length > 0 ? (
                    filteredNeighborhoods.map((n, idx) => {
                      const isDominant = idx < 3;
                      const isGrowing = idx >= 3 && idx < 10;
                      return (
                        <tr key={n.name} className="hover:bg-blue-50/50 transition-colors font-bold">
                          <td className="p-3.5 text-gray-400 font-black text-[10px]">{idx + 1}º</td>
                          <td className="p-3.5 text-gov-blue uppercase flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-gov-blue/50" /> {n.name}
                          </td>
                          <td className="p-3.5 text-center font-black text-gov-blue text-sm">{n.count}</td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${n.percentage}%` }} />
                              </div>
                              <span className="text-[10px] text-gray-500 font-black">{n.percentage}%</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-center">
                            {isDominant ? (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase rounded-full border border-emerald-300">
                                🟢 Reduto Forte
                              </span>
                            ) : isGrowing ? (
                              <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[8px] font-black uppercase rounded-full border border-blue-300">
                                🔵 Em Expansão
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-[8px] font-black uppercase rounded-full">
                                ⚪ Potencial
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400 font-bold uppercase text-xs">
                        Nenhum bairro encontrado para o filtro "{neighborhoodSearch}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ABA: RANKING (PLACAR DE LÍDERES) */}
      {/* ========================================================================= */}
      {activeTab === 'ranking' && (
        <div ref={rankingRef} className="bg-white p-4 sm:p-10 border-b-4 border-gov-yellow shadow-xl min-h-[600px] overflow-hidden rounded-2xl">
          <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-gov-yellow p-4 shadow-xl rounded-2xl">
                <Trophy className="w-10 h-10 text-gov-blue animate-pulse" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-gov-blue uppercase tracking-tighter italic">Placar de Líderes</h3>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-1">Mobilização e Engajamento de Elite</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-gray-50 px-6 py-3 border-2 border-dashed border-gov-blue/10 text-center rounded-2xl">
                <p className="text-[9px] font-black text-gray-400 uppercase">Total de Pontos</p>
                <p className="text-xl font-black text-gov-blue">{members.length * 10} XP</p>
              </div>
              <PDFButton
                containerRef={rankingRef}
                filename={`placar-lideres-${Date.now()}.pdf`}
                title="Placar de Líderes — Ranking de Coordenadores"
                subtitle={`Total de ${coordinators.length} coordenadores | ${members.length} apoiadores cadastrados`}
              />
            </div>
          </div>

          {/* Pódio Gamificado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 items-end">
            {top3.map((coord, index) => (
              <motion.div
                key={coord.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                className={`relative flex flex-col items-center p-8 border-t-8 shadow-2xl rounded-2xl ${
                  index === 0 ? 'order-2 h-[380px] bg-gov-blue text-white border-gov-yellow scale-110 z-10' :
                  index === 1 ? 'order-1 h-[320px] bg-white border-gray-300' :
                  'order-3 h-[280px] bg-white border-orange-300'
                }`}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  {index === 0 ? <Crown className="w-12 h-12 text-gov-yellow drop-shadow-lg" /> :
                   index === 1 ? <Medal className="w-10 h-10 text-gray-400" /> :
                   <Medal className="w-10 h-10 text-orange-400" />}
                </div>
                <div className="w-24 h-24 rounded-full border-4 border-current mb-4 overflow-hidden shadow-inner bg-gray-100 flex items-center justify-center">
                  {coord.photo ? (
                    <img src={coord.photo} crossOrigin="anonymous" className="w-full h-full object-cover" alt={coord.name} />
                  ) : (
                    <Star className="w-10 h-10 opacity-20" />
                  )}
                </div>
                <h4 className="font-black uppercase text-center text-sm mb-2">{coord.name}</h4>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-gov-yellow" />
                  <span className="text-2xl font-black">{coord.count}</span>
                  <span className="text-[10px] font-bold uppercase opacity-60">Apoiadores</span>
                </div>
                <div className="mt-auto w-full text-center">
                  <div className={`px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest ${
                    index === 0 ? 'bg-gov-yellow text-gov-blue' : 'bg-gov-bg text-gov-blue'
                  }`}>
                    {coord.points} XP
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Outras Posições */}
          <div className="space-y-3">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Demais Membros da Elite</h5>
            <AnimatePresence>
              {others.map((coord, index) => (
                <motion.div
                  key={coord.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-gray-50 p-4 flex items-center justify-between border-l-4 border-gray-200 group hover:border-gov-blue transition-all rounded-2xl"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-gray-400 w-6">{index + 4}º</span>
                    <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center overflow-hidden">
                      {coord.photo ? <img src={coord.photo} crossOrigin="anonymous" className="w-full h-full object-cover" alt="" /> : <Award className="w-5 h-5 text-gray-200" />}
                    </div>
                    <div>
                      <h6 className="text-[11px] font-black uppercase text-gov-blue">{coord.name}</h6>
                      <span className="text-[8px] font-bold text-gray-400 uppercase">{coord.points} Pontos</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="hidden md:block w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gov-blue" style={{ width: `${(coord.count / (rankingData[0]?.count || 1)) * 100}%` }} />
                    </div>
                    <span className="font-black text-gov-blue text-sm">{coord.count}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Hidden high-res container styled specifically for consolidated PDF generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '1200px', height: 'auto', overflow: 'hidden' }}>
        <div ref={consolidatedRef} style={{ width: '1200px', backgroundColor: '#ffffff', color: '#000000' }}>
          
          {/* Page 1: Ranking */}
          <div id="pdf-consolidated-ranking" style={{ padding: '50px 40px', width: '1200px', boxSizing: 'border-box', backgroundColor: '#ffffff' }}>
            <div style={{ borderBottom: '3px solid #003366', paddingBottom: '25px', marginBottom: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '32px', margin: 0, color: '#003366', fontWeight: '900', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>Placar de Líderes</h1>
                <p style={{ margin: '8px 0 0 0', color: '#666666', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Relatório Consolidado de Mobilização e Desempenho</p>
              </div>
              <div style={{ backgroundColor: '#f3f4f6', padding: '10px 20px', border: '1px solid #e5e7eb', textAlign: 'right', marginLeft: 'auto' }}>
                <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase' }}>Total Geral</span>
                <h3 style={{ margin: 0, color: '#003366', fontSize: '20px', fontWeight: '900' }}>{members.length * 10} XP</h3>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '30px', marginBottom: '40px', alignItems: 'flex-end', justifyContent: 'center' }}>
              {rankingData.slice(0, 3).map((coord, idx) => (
                <div key={coord.id} style={{
                  width: '320px',
                  height: idx === 0 ? '300px' : idx === 1 ? '260px' : '230px',
                  border: '2px solid #e5e7eb',
                  borderTop: idx === 0 ? '8px solid #FFD700' : idx === 1 ? '8px solid #9ca3af' : '8px solid #F59E0B',
                  backgroundColor: idx === 0 ? '#003366' : '#ffffff',
                  color: idx === 0 ? '#ffffff' : '#000000',
                  padding: '30px 20px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '15px' }}>
                    {idx === 0 ? '👑 1º Lugar' : idx === 1 ? '🥈 2º Lugar' : '🥉 3º Lugar'}
                  </div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: '900', textTransform: 'uppercase' }}>{coord.name}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', margin: '15px 0' }}>
                    <span style={{ fontSize: '24px', fontWeight: '900', color: idx === 0 ? '#FFD700' : '#003366' }}>{coord.count}</span>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: idx === 0 ? '#cbd5e1' : '#64748b', textTransform: 'uppercase' }}>Apoiadores</span>
                  </div>
                  <div style={{ marginTop: 'auto', backgroundColor: idx === 0 ? '#FFD700' : '#f1f5f9', color: idx === 0 ? '#003366' : '#003366', padding: '6px 20px', borderRadius: '20px', fontSize: '11px', fontWeight: '900', letterSpacing: '0.05em' }}>
                    {coord.points} XP
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '30px' }}>
              <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '15px' }}>Quadro Geral de Lideranças</h4>
              {rankingData.slice(3, 10).map((coord, idx) => (
                <div key={coord.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#9ca3af' }}>{idx + 4}º</span>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#003366', textTransform: 'uppercase' }}>{coord.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                    <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 'bold' }}>{coord.points} XP</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#003366' }}>{coord.count} apoiadores</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Page 2: Gender */}
          <div id="pdf-consolidated-gender" style={{ padding: '50px 40px', width: '1200px', boxSizing: 'border-box', backgroundColor: '#ffffff' }}>
            <div style={{ borderBottom: '3px solid #003366', paddingBottom: '25px', marginBottom: '35px' }}>
              <h1 style={{ fontSize: '32px', margin: 0, color: '#003366', fontWeight: '900', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>Distribuição por Gênero</h1>
              <p style={{ margin: '8px 0 0 0', color: '#666666', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Mapeamento e Composição Demográfica da Campanha</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
              <BarChart width={1050} height={320} data={genderData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#003366' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#003366' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {genderData.map((entry, index) => {
                    const color = entry.name === 'Masculino' ? '#003366' : entry.name === 'Feminino' ? '#FF007F' : '#FFD700';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: '40px' }}>
              {genderData.map((d) => {
                const pct = members.length > 0 ? ((d.value / members.length) * 100).toFixed(1) : '0';
                return (
                  <div key={d.name} style={{ backgroundColor: '#f9fafb', padding: '20px', borderLeft: '5px solid #003366', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <p style={{ margin: 0, fontSize: '10px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase' }}>{d.name}</p>
                    <p style={{ margin: '10px 0 5px 0', fontSize: '26px', fontWeight: '900', color: '#003366' }}>{d.value}</p>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: '#666666' }}>{pct}% do Eleitorado</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Page 3: Age */}
          <div id="pdf-consolidated-age" style={{ padding: '50px 40px', width: '1200px', boxSizing: 'border-box', backgroundColor: '#ffffff' }}>
            <div style={{ borderBottom: '3px solid #003366', paddingBottom: '25px', marginBottom: '35px' }}>
              <h1 style={{ fontSize: '32px', margin: 0, color: '#003366', fontWeight: '900', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>Distribuição por Faixa Etária</h1>
              <p style={{ margin: '8px 0 0 0', color: '#666666', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Engajamento de Apoiadores Segmentados por Faixa Etária</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
              <BarChart width={1050} height={320} data={ageData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#003366' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#003366' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {ageData.map((_, index) => {
                    const colors = ['#003366', '#FFD700', '#FF0000', '#10B981', '#6366F1', '#F59E0B'];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '15px', marginTop: '40px' }}>
              {ageData.map((d) => {
                const pct = members.length > 0 ? ((d.count / members.length) * 100).toFixed(1) : '0';
                return (
                  <div key={d.range} style={{ backgroundColor: '#f9fafb', padding: '15px 10px', borderLeft: '4px solid #003366', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <p style={{ margin: 0, fontSize: '9px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase' }}>{d.range} anos</p>
                    <p style={{ margin: '8px 0 5px 0', fontSize: '22px', fontWeight: '900', color: '#003366' }}>{d.count}</p>
                    <p style={{ margin: 0, fontSize: '10px', fontWeight: 'bold', color: '#666666' }}>{pct}%</p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
