# Arquitetura - Gestão Inteligente

## Visão Geral

Aplicação React + TypeScript para gestão de campanhas eleitorais, utilizando Supabase como backend e banco de dados, com integrações para IA (Gemini), pagamentos (Asaas) e notificações (Email/WhatsApp).

## Stack Tecnológico

### Frontend
- **React 18** - Framework UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Estilização
- **Framer Motion** - Animações
- **Lucide React** - Ícones

### Backend
- **Supabase** - Banco de dados PostgreSQL + Auth + Realtime
- **Netlify Functions** - Serverless functions para webhooks e integrações

### Integrações
- **Gemini AI** - Inteligência artificial para insights
- **Asaas** - Processamento de pagamentos
- **SendGrid/Mailgun** - Envio de emails
- **Twilio/Z-API** - Envio de WhatsApp

## Estrutura de Diretórios

```
src/
├── components/          # Componentes React
│   ├── Dashboard.tsx   # Dashboard principal com 12 abas
│   ├── MemberForm.tsx  # Formulário de cadastro de eleitores
│   ├── MemberList.tsx  # Lista de eleitores
│   ├── CoordinatorForm.tsx
│   ├── CoordinatorList.tsx
│   ├── AIInsights.tsx  # Insights com IA
│   ├── ElectionDay.tsx # Monitoramento Dia da Eleição
│   ├── Materials.tsx   # Gestão de materiais/avisos
│   ├── Chat.tsx        # Chat interno
│   ├── EmailCampaign.tsx # Campanhas de email
│   ├── AnalyticsTab.tsx # Analytics e relatórios
│   ├── AdminMaster.tsx # Painel admin multi-campanha
│   ├── LandingPage.tsx # Landing page pública
│   ├── Login.tsx       # Login
│   ├── SalesPage.tsx   # Página de vendas/planos
│   └── ...
├── lib/                # Utilitários
│   ├── supabase.ts     # Cliente Supabase
│   ├── db.ts           # IndexedDB local
│   ├── notifications.ts # Notificações browser
│   ├── permissions.ts  # Sistema de permissões
│   └── utils.ts        # Funções utilitárias
├── services/           # Serviços de negócio
│   ├── notifications.ts # Serviço de notificações (Email/WhatsApp)
│   ├── asaas.ts        # Integração Asaas
│   └── billingAutomation.ts # Automação de billing
├── hooks/              # Custom React hooks
│   └── useExcelTools.ts # Utilitários para Excel
├── types.ts            # Definições TypeScript globais
├── App.tsx             # Componente principal
└── main.tsx            # Entry point

netlify/functions/      # Serverless functions
├── asaas-checkout.ts   # Checkout Asaas
├── asaas-webhook.ts    # Webhook Asaas
├── send-bulk-email.ts  # Envio em massa de emails
└── sync-tse.ts         # Sincronização TSE
```

## Modelo de Dados

### Tabelas Principais (Supabase)

**organizations**
- Armazena informações das campanhas
- Campos: id, candidate_name, subscription_status, subdomain, asaas_customer_id, etc.

**profiles**
- Perfis de usuários com roles
- Campos: id, org_id, full_name, email, role (super_admin, candidate, general_coordination, area_coordinator, coordinator)

**members**
- Eleitores/apoiadores
- Campos: id, name, email, phone, voterId, voterSection, voterZone, supportLevel, coordinatorId, etc.

**coordinators**
- Coordenadores de campanha
- Campos: id, name, neighborhood, city, voterId, voterSection, voterZone, org_id, network_id

**announcements**
- Materiais e avisos
- Campos: id, title, content, priority, category, imageUrl, fileUrl, org_id

**messages**
- Chat interno
- Campos: id, content, senderId, senderName, org_id

**audit_logs**
- Logs de auditoria
- Campos: id, operation, table_name, details, user_email, org_id

## Sistema de Permissões

### Roles
- **super_admin**: Acesso total a todas as funcionalidades
- **candidate**: Acesso a analytics e relatórios
- **general_coordination**: Gestão de coordenadores e visualização de dados
- **area_coordinator**: Gestão de coordenadores de sua área
- **coordinator**: Gestão apenas de seus eleitores

### Permissões Implementadas
- canCreateCampaigns
- canDeleteCampaigns
- canCreateCoordinators
- canDeleteCoordinators
- canEditCoordinators
- canCreateMembers
- canDeleteMembers
- canEditMembers
- canViewAllMembers
- canViewOwnNetwork
- canAccessAnalytics
- canAccessAdminMaster

## Fluxo de Autenticação

1. Usuário faz login via Supabase Auth
2. Session é armazenada no localStorage
3. Profile é buscado na tabela profiles
4. Organization é buscada baseada no org_id do profile
5. Permissões são calculadas baseadas no role
6. Dashboard é renderizado com base nas permissões

## Fluxo de Pagamento

1. Usuário seleciona plano em SalesPage
2. Dados são enviados para asaas-checkout (Netlify Function)
3. Asaas cria customer e payment
4. Webhook Asaas notifica pagamento confirmado
5. asaas-webhook atualiza subscription_status para 'active'
6. Notificação de ativação é enviada via Email/WhatsApp
7. Usuário pode acessar o sistema

## Sistema de Notificações

### Tipos
- **Ativação de Campanha**: Email + WhatsApp quando subscription_status muda para 'active'
- **Pagamento Vencido**: Email + WhatsApp quando subscription_status muda para 'overdue'
- **Boas-vindas**: WhatsApp automático para novos eleitores
- **Aniversários**: WhatsApp automático no aniversário

### Implementação
- `src/services/notifications.ts` - Serviço centralizado
- `src/lib/notifications.ts` - Notificações browser (PWA)
- Integrações configuráveis via variáveis de ambiente

## Integrações Externas

### Gemini AI
- Usado em `AIInsights.tsx` para gerar insights estratégicos
- Analisa dados de eleitores e sugere ações
- Requer `GEMINI_API_KEY`

### Asaas
- Processamento de pagamentos recorrentes
- Webhook para notificações de pagamento
- Requer `ASAAS_API_KEY`

### Email (SendGrid/Mailgun)
- Envio de notificações transacionais
- Templates HTML personalizados
- Requer `SENDGRID_API_KEY` ou `MAILGUN_API_KEY`

### WhatsApp (Twilio/Z-API)
- Envio de mensagens automatizadas
- Templates dinâmicos
- Requer `TWILIO_*` ou `ZAPI_*` variáveis

## Performance e Otimização

- Lazy loading de componentes
- Code splitting via Vite
- IndexedDB para cache local
- Debounce em buscas
- Virtualização em listas grandes (quando necessário)

## Segurança

- Row Level Security (RLS) no Supabase
- Políticas de isolamento por organização
- Validação de inputs em formulários
- Sanitização de dados
- CORS configurado

## Deploy

### Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Variáveis de ambiente configuradas no dashboard

### Variáveis de Ambiente Necessárias
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`
- `ASAAS_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SENDGRID_API_KEY` (opcional)
- `TWILIO_ACCOUNT_SID` (opcional)
- `TWILIO_AUTH_TOKEN` (opcional)

## Monitoramento e Logs

- Console logging em funções críticas
- Audit logs em operações sensíveis
- Error handling com try/catch
- Webhook logging para debugging

## Próximas Melhorias Planejadas

- Sistema de testes automatizados
- CI/CD pipeline
- Monitoramento com Sentry
- Cache avançado com Redis
- Rate limiting
- Integração com redes sociais
- Sistema de tickets/suporte
