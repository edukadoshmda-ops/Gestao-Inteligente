# Configuração de Deploy no Netlify

## Variáveis de Ambiente Necessárias

Configure estas variáveis no painel do Netlify (Site Settings > Environment Variables):

### Para o Frontend (VITE_*)
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
VITE_SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
GEMINI_API_KEY=sua-gemini-api-key (opcional)
```

### Para as Functions (sem prefixo VITE_)
```
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
SUPABASE_ANON_KEY=sua-anon-key-aqui
ASAAS_API_KEY=sua-asaas-api-key
SITE_URL=https://seu-site.netlify.app
```

## Build Settings

No painel do Netlify (Site Settings > Build & deploy):

- **Build command:** `cd frontend && npm install && npm run build`
- **Publish directory:** `frontend/dist`
- **Functions directory:** `netlify/functions`

## Notas Importantes

1. **Service Role Key:** NUNCA exponha a service_role key no frontend. Ela só deve ser usada nas Netlify Functions.

2. **Asaas API:** Configure a API key do Asaas para processamento de pagamentos.

3. **Supabase RLS:** As políticas RLS foram configuradas para permitir criação de perfis pelo super_admin usando service_role key.

4. **Functions:** As functions usam a service_role key para contornar RLS em operações administrativas.

## Troubleshooting

### Erro de Build
- Verifique se todas as dependências estão no package.json
- Certifique-se de que o comando de build está correto

### Erro de Functions
- Verifique se as variáveis de ambiente das functions estão configuradas
- Certifique-se de que a service_role key está correta

### Erro de Supabase
- Verifique se as URLs e chaves estão corretas
- Verifique se as políticas RLS estão configuradas no banco
