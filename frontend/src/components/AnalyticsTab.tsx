/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useRef, useState } from 'react';
import { Member, Coordinator } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  Trophy, Medal, Target, Crown, Star, TrendingUp, Award,
  FileText, Loader2, Download, Check
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
  ageData
}: {
  members: Member[];
  coordinators: Coordinator[];
  rankingData: any[];
  genderData: any[];
  ageData: any[];
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

export default function AnalyticsTab({ members, coordinators, activeTab }: AnalyticsTabProps) {
  const rankingRef = useRef<HTMLDivElement>(null);
  const genderRef  = useRef<HTMLDivElement>(null);
  const ageRef     = useRef<HTMLDivElement>(null);
  const consolidatedRef = useRef<HTMLDivElement>(null);

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

  const ageData = useMemo(() => {
    const ranges: Record<string, number> = { '16-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55-64': 0, '65+': 0 };
    members.forEach(m => {
      if (!m.age) return;
      if (m.age < 25) ranges['16-24']++;
      else if (m.age < 35) ranges['25-34']++;
      else if (m.age < 45) ranges['35-44']++;
      else if (m.age < 55) ranges['45-54']++;
      else if (m.age < 65) ranges['55-64']++;
      else ranges['65+']++;
    });
    return Object.entries(ranges).map(([range, count]) => ({ range, count }));
  }, [members]);

  const genderData = useMemo(() => {
    const counts: Record<string, number> = {};
    members.forEach(m => { counts[m.gender] = (counts[m.gender] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [members]);

  const top3   = rankingData.slice(0, 3);
  const others = rankingData.slice(3);

  return (
    <div className="space-y-6">
      {/* Top Banner with Consolidated PDF Button */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 hover-lift">
        <div>
          <h4 className="text-gov-blue font-black uppercase text-sm tracking-wider">Centro de Inteligência Analítica</h4>
          <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Gere relatórios unificados de toda a sua campanha eleitoral</p>
        </div>
        <ConsolidatedPDFButton
          members={members}
          coordinators={coordinators}
          rankingData={rankingData}
          genderData={genderData}
          ageData={ageData}
        />
      </div>

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
                className={`relative flex flex-col items-center p-8 border-t-8 shadow-2xl ${
                  index === 0 ? 'order-2 h-[380px] bg-gov-blue text-white border-gov-yellow scale-110 z-10' :
                  index === 1 ? 'order-1 h-[320px] bg-white border-gray-300' :
                  'order-3 h-[280px] bg-white border-orange-300'
                }`}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  {index === 0 ? <Crown className="w-12 h-12 text-gov-yellow drop-shadow-lg rounded-2xl" /> :
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
                  <span className="text-[10px] font-bold uppercase opacity-60">Votos</span>
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

      {activeTab === 'gender' && (
        <div ref={genderRef} className="bg-white p-4 sm:p-10 border-b-4 border-gov-yellow shadow-xl min-h-[500px] rounded-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
            <div>
              <h3 className="text-2xl font-black text-gov-blue uppercase tracking-tighter italic">Distribuição por Gênero</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{members.length} eleitores analisados</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {genderData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className={`w-3 h-3 ${d.name === 'Masculino' ? 'bg-gov-blue' : d.name === 'Feminino' ? 'bg-[#FF007F]' : 'bg-gov-yellow'}`} />
                  <span className="text-[10px] font-bold uppercase">{d.name}: {d.value}</span>
                </div>
              ))}
              <PDFButton
                containerRef={genderRef}
                filename={`relatorio-genero-${Date.now()}.pdf`}
                title="Relatório de Distribuição por Gênero"
                subtitle={`Base com ${members.length} eleitores cadastrados`}
              />
            </div>
          </div>

          <div className="h-[350px] w-full relative">
            <ResponsiveContainer width="99%" height="99%">
              <BarChart data={genderData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#003366', border: 'none', borderRadius: '0' }}
                  itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                  labelStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {genderData.map((entry, index) => {
                    const color = entry.name === 'Masculino' ? '#003366' : entry.name === 'Feminino' ? '#FF007F' : '#FFD700';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Resumo numérico */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {genderData.map((d) => {
              const pct = members.length > 0 ? ((d.value / members.length) * 100).toFixed(1) : '0';
              return (
                <div key={d.name} className="bg-gray-50 p-4 border-l-4 border-gov-blue text-center rounded-2xl">
                  <p className="text-[9px] font-black text-gray-400 uppercase">{d.name}</p>
                  <p className="text-2xl font-black text-gov-blue mt-1">{d.value}</p>
                  <p className="text-[9px] font-bold text-gray-400">{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab !== 'ranking' && activeTab !== 'gender' && (
        <div ref={ageRef} className="bg-white p-4 sm:p-10 border-b-4 border-gov-yellow shadow-xl min-h-[500px] rounded-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
            <div>
              <h3 className="text-2xl font-black text-gov-blue uppercase tracking-tighter italic">Relatório por Faixa Etária</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{members.length} eleitores analisados</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-[10px] font-black bg-gov-bg px-4 py-2 text-gov-blue uppercase">Módulo de Inteligência Ativado</div>
              <PDFButton
                containerRef={ageRef}
                filename={`relatorio-faixa-etaria-${Date.now()}.pdf`}
                title="Relatório Estratégico — Faixa Etária"
                subtitle={`Base com ${members.length} eleitores cadastrados`}
              />
            </div>
          </div>

          <div className="h-[350px] w-full relative">
            <ResponsiveContainer width="99%" height="99%">
              <BarChart data={ageData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip
                  cursor={{ fill: '#F9FAFB' }}
                  contentStyle={{ backgroundColor: '#003366', border: 'none', borderRadius: '0' }}
                  itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                  labelStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {ageData.map((_, index) => {
                    const colors = ['#003366', '#FFD700', '#FF0000', '#10B981', '#6366F1', '#F59E0B'];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Resumo numérico */}
          <div className="mt-8 grid grid-cols-3 sm:grid-cols-6 gap-3">
            {ageData.map((d) => {
              const pct = members.length > 0 ? ((d.count / members.length) * 100).toFixed(1) : '0';
              return (
                <div key={d.range} className="bg-gray-50 p-3 border-l-4 border-gov-blue text-center rounded-2xl">
                  <p className="text-[8px] font-black text-gray-400 uppercase">{d.range} anos</p>
                  <p className="text-xl font-black text-gov-blue mt-1">{d.count}</p>
                  <p className="text-[8px] font-bold text-gray-400">{pct}%</p>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-[9px] text-gray-400 font-bold uppercase tracking-widest text-center">
            Este gráfico identifica em quais faixas etárias sua campanha tem maior penetração.
          </p>
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
