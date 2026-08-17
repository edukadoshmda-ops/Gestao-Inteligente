# Gestão Inteligente - Sistema de Gestão de Campanhas Eleitorais

Sistema completo para gestão de campanhas eleitorais com inteligência artificial, automação de WhatsApp, gestão de eleitores e coordenadores, e monitoramento em tempo real.

## Funcionalidades

- **Gestão de Eleitores**: Cadastro completo com dados eleitorais, geolocalização e nível de apoio
- **Coordenadores**: Sistema hierárquico com gamificação e ranking
- **Inteligência Artificial**: Insights estratégicos com Gemini API
- **Automação WhatsApp**: Templates dinâmicos para boas-vindas, aniversários e convites
- **Dia da Eleição**: Monitoramento em tempo real (Boca de Urna)
- **Analytics**: Relatórios detalhados por bairro, faixa etária e gênero
- **Materiais**: Gestão de avisos, banners e documentos
- **Chat Interno**: Comunicação entre equipe
- **Pagamentos**: Integração com Asaas para gestão de assinaturas
- **Notificações**: Email e WhatsApp automáticos para ativação de campanhas

## Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta no Supabase
- Chave API do Gemini (opcional, para funcionalidades de IA)

## Configuração

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente:
   Copie `env-template.txt` para `.env` e preencha as variáveis:
   - `VITE_SUPABASE_URL`: URL do projeto Supabase
   - `VITE_SUPABASE_ANON_KEY`: Chave anônima do Supabase
   - `GEMINI_API_KEY`: Chave da API do Google Gemini (para IA)
   - `APP_URL`: URL onde o app está hospedado

4. Execute o schema do banco de dados:
   - Abra o SQL Editor do Supabase
   - Execute o conteúdo de `supabase-schema.sql`

## Executar Localmente

```bash
npm run dev
```

O app estará disponível em `http://localhost:5173`

## Deploy

### Netlify

O projeto já está configurado para deploy no Netlify:

1. Conecte o repositório ao Netlify
2. Configure as variáveis de ambiente nas configurações do site
3. Deploy automático será feito em cada push

### Variáveis de Necessárias no Netlify

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`
- `ASAAS_API_KEY` (para pagamentos)
- `SUPABASE_SERVICE_ROLE_KEY` (para webhooks)

## Estrutura do Projeto

```
src/
├── components/       # Componentes React
├── lib/             # Utilitários (Supabase, DB, etc)
├── services/        # Serviços (Notificações, Billing, etc)
├── hooks/           # Custom React hooks
└── types.ts         # Definições TypeScript

netlify/functions/   # Serverless functions
```

## Suporte

Para suporte, entre em contato pelo WhatsApp: (91) 99383-7093
