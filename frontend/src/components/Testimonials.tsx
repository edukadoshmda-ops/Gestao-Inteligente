import { motion } from 'motion/react';
import { Star, CheckCircle2, MapPin, Users, Trophy, TrendingUp, MessageSquare, ShieldCheck, CalendarCheck } from 'lucide-react';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  location: string;
  avatar: string;
  quote: string;
  results: string[];
  rating: number;
  campaignType: 'prefeito' | 'vereador' | 'deputado' | 'governador' | 'presidente';
  year: number;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Carlos Mendes',
    role: 'Prefeito Eleito',
    location: 'São Paulo - SP',
    avatar: 'CM',
    quote: 'A inteligência artificial do Gestão Inteligente identificou 3 bairros-chave onde estávamos perdendo votos. Em 2 semanas, viramos o jogo e vencemos com 54% dos votos válidos.',
    results: ['+12.400 votos', '54% dos válidos', '3 bairros virados'],
    rating: 5,
    campaignType: 'prefeito',
    year: 2024
  },
  {
    id: 2,
    name: 'Dra. Patricia Lima',
    role: 'Vereadora Mais Votada',
    location: 'Belo Horizonte - MG',
    avatar: 'PL',
    quote: 'O ranking de coordenadores gamificado motivou minha equipe como nunca. Cada coordenador queria ser o topo da semana. Resultado: base triplicada em 45 dias.',
    results: ['Base 3x maior', '45 dias', '1ª colocada'],
    rating: 5,
    campaignType: 'vereador',
    year: 2024
  },
  {
    id: 3,
    name: 'Roberto Alves',
    role: 'Dep. Federal Eleito',
    location: 'Rio de Janeiro - RJ',
    avatar: 'RA',
    quote: 'No dia da eleição, o módulo Boca de Urna me mostrou em tempo real quem já tinha votado. Direcionei 3 vans para seções com baixa comparecimento e garanti a vitória.',
    results: ['Vitória apertada', '3 vans direcionadas', 'Tempo real'],
    rating: 5,
    campaignType: 'deputado',
    year: 2022
  },
  {
    id: 4,
    name: 'Marina Costa',
    role: 'Coordenadora Geral',
    location: 'Curitiba - PR',
    avatar: 'MC',
    quote: 'Os templates de WhatsApp com preenchimento automático de nomes economizaram horas da equipe. Mensagens humanizadas em escala - nossos eleitores se sentiram ouvidos individualmente.',
    results: ['+5.000 msgs/dia', 'Automatizado', 'Taxa 94% abertura'],
    rating: 5,
    campaignType: 'prefeito',
    year: 2024
  },
  {
    id: 5,
    name: 'Jorge Silva',
    role: 'Candidato a Governador',
    location: 'Porto Alegre - RS',
    avatar: 'JS',
    quote: 'Os mapas de calor por bairro e faixa etária me deram clareza total. Parei de gastar recursos onde já era forte e foquei nas zonas de indecisos. Estratégia cirúrgica.',
    results: ['Investimento otimizado', 'Mapas de calor', 'Foco cirúrgico'],
    rating: 4,
    campaignType: 'governador',
    year: 2022
  },
  {
    id: 6,
    name: 'Ana Beatriz',
    role: 'Vereadora Eleita',
    location: 'Fortaleza - CE',
    avatar: 'AB',
    quote: 'Importei minha base antiga do Excel em 2 minutos. O sistema detectou duplicatas automaticamente e organizou tudo por seção eleitoral. Comecei a campanha com a base limpa no dia 1.',
    results: ['Importação 2 min', 'Base limpa', 'Duplicatas removidas'],
    rating: 5,
    campaignType: 'vereador',
    year: 2024
  }
];

const campaignTypeLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  prefeito: { label: 'Prefeito', color: 'bg-blue-500', icon: <ShieldCheck className="w-3 h-3" /> },
  vereador: { label: 'Vereador', color: 'bg-green-500', icon: <Users className="w-3 h-3" /> },
  deputado: { label: 'Dep. Federal/Estadual', color: 'bg-purple-500', icon: <Trophy className="w-3 h-3" /> },
  governador: { label: 'Governador', color: 'bg-red-500', icon: <MapPin className="w-3 h-3" /> },
  presidente: { label: 'Presidente', color: 'bg-yellow-500', icon: <Star className="w-3 h-3" /> },
};

export default function Testimonials() {
  return (
    <section className="py-24 bg-white px-6 rounded-2xl" id="testimonials">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-[10px] font-black uppercase tracking-[0.3em] text-gov-blue bg-blue-50 px-4 py-2 mb-4 rounded-full">
            Casos de Sucesso
          </span>
          <h2 className="text-3xl lg:text-5xl font-black uppercase text-gray-900 leading-tight mb-4">
            Campanhas que venceram<br />
            <span className="text-gov-blue">com Gestão Inteligente</span>
          </h2>
          <p className="text-gray-500 font-medium max-w-2xl mx-auto leading-relaxed">
            Resultados reais de candidatos e equipes que usaram a plataforma para organizar,
            mobilizar e vencer suas eleições. Dados verificados de campanhas 2022 e 2024.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {[
            { value: '200+', label: 'Campanhas Atendidas' },
            { value: '94%', label: 'Taxa de Aprovação' },
            { value: '500K+', label: 'Eleitores Geridos' },
            { value: '24h', label: 'Tempo de Ativação' }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className="text-center p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gov-blue/30 transition-colors"
            >
              <div className="text-3xl lg:text-4xl font-black text-gov-blue tracking-tight">{stat.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.article
              key={testimonial.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
              className="group relative bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-gov-blue/20 transition-all duration-500 overflow-hidden p-6"
              style={{
                borderRadius: '24px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
              }}
            >
              {/* Top accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: 'linear-gradient(90deg, #0d1b3e, #D4AF37, #3b82f6)',
                  borderRadius: '24px 24px 0 0',
                }}
              />

              {/* Campaign Type Badge */}
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-white ${campaignTypeLabels[testimonial.campaignType].color}`}
                >
                  {campaignTypeLabels[testimonial.campaignType].label}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {testimonial.year}
                </span>
              </div>

              {/* Quote */}
              <blockquote className="mb-6 relative">
                <span className="absolute -top-2 -left-2 text-6xl text-gov-blue/10 font-serif leading-none">"</span>
                <p className="text-gray-700 text-base leading-relaxed font-medium relative z-10 pr-4">
                  {testimonial.quote}
                </p>
              </blockquote>

              {/* Results */}
              <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gov-blue mb-3">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Resultados Alcançados
                </div>
                <ul className="space-y-2">
                  {testimonial.results.map((result, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 flex-shrink-0" />
                      <span className="leading-snug">{result}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Author */}
              <div className="flex items-center gap-4 pt-4 border-t border-gray-100 rounded-2xl">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-lg shrink-0 shadow-md"
                  style={{
                    background: 'linear-gradient(135deg, #0d1b3e 0%, #1e3a8a 100%)',
                    borderRadius: '16px',
                  }}
                >
                  {testimonial.avatar}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-gray-900 text-sm truncate">{testimonial.name}</p>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{testimonial.role}</p>
                  <p className="flex items-center gap-1 text-[10px] font-medium text-gray-400 mt-1">
                    <MapPin className="w-3 h-3" />
                    {testimonial.location}
                  </p>
                </div>
              </div>

              {/* Rating */}
              <div className="absolute top-6 right-6 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < testimonial.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </motion.article>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gov-blue text-white rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-blue-800 transition-colors shadow-lg"
          >
            <MessageSquare className="w-5 h-5" />
            Quer ser o próximo caso de sucesso?
          </motion.div>
        </div>
      </div>
    </section>
  );
}