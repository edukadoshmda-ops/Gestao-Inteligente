-- Script de Criação do Banco de Dados para Gestão de Votos Mirla DF 2026 (ATUALIZADO E SEGURO)
-- Cole este código no SQL Editor do Supabase e clique em "Run".

-- ATUALIZAÇÃO PARA TABELAS EXISTENTES: Adicionar campos que podem estar faltando
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS subdomain text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS asaas_customer_id text;

-- Adicionar campos para hierarquia de rede
ALTER TABLE public.coordinators ADD COLUMN IF NOT EXISTS network_id text;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS network_id text;

-- 0. Criação da Tabela de Organizações (Campanhas) - Movida para o topo por causa das chaves estrangeiras
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    candidate_name text NOT NULL,
    subdomain text,
    asaas_customer_id text,
    subscription_status text DEFAULT 'active',
    logo_url text,
    theme_primary text,
    theme_secondary text,
    theme_bg text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Configuração de Segurança (RLS) para Organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso público às organizações" ON public.organizations;
-- A política de atualização será criada após a tabela profiles ser definida

-- 0.1 Criação da Tabela de Perfis (Atualizada com email e múltiplos papéis)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users(id) PRIMARY KEY,
    full_name text,
    email text,
    role text DEFAULT 'coordinator' CHECK (role IN ('super_admin', 'candidate', 'general_coordination', 'area_coordinator', 'coordinator')),
    organization_id uuid REFERENCES public.organizations(id),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Garantir que a coluna organization_id exista caso a tabela já estivesse lá
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- Adicionar coluna email se não existir
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso próprio perfil" ON public.profiles;
CREATE POLICY "Acesso próprio perfil" ON public.profiles FOR SELECT USING (id = auth.uid());

-- Política de organizações transferida para cá, após o profile existir
-- Permitimos leitura pública para carregar o tema na tela de login
DROP POLICY IF EXISTS "Acesso público às organizações" ON public.organizations;
CREATE POLICY "Acesso público às organizações" ON public.organizations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Criação pública de organizações" ON public.organizations;
CREATE POLICY "Criação pública de organizações" ON public.organizations FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Atualização para admins" ON public.organizations;
CREATE POLICY "Atualização para admins" ON public.organizations FOR UPDATE USING (id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Deleção para super_admin" ON public.organizations;
CREATE POLICY "Deleção para super_admin" ON public.organizations FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- 1. Criação da Tabela de Coordenadores
CREATE TABLE IF NOT EXISTS public.coordinators (
    id text PRIMARY KEY,
    name text NOT NULL,
    email text,
    neighborhood text,
    city text,
    "voterId" text,
    "voterSection" text,
    "voterZone" text,
    photo text,
    org_id uuid REFERENCES public.organizations(id),
    network_id text, -- ID do coordenador superior (para hierarquia de rede)
    "createdAt" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Criação da Tabela de Membros/Eleitores
CREATE TABLE IF NOT EXISTS public.members (
    id text PRIMARY KEY,
    name text NOT NULL,
    email text,
    phone text,
    age integer,
    "voterId" text,
    "voterSection" text,
    "voterZone" text,
    gender text,
    region text DEFAULT 'DF',
    referral text DEFAULT 'Direto',
    "mainInterest" text,
    "supportLevel" text DEFAULT 'Neutro',
    "birthDate" text,
    "coordinatorId" text REFERENCES public.coordinators(id),
    org_id uuid REFERENCES public.organizations(id),
    "createdAt" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabelas de Suporte
CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    content text NOT NULL,
    priority text DEFAULT 'info',
    active boolean DEFAULT true,
    "imageUrl" text,
    "fileUrl" text,
    category text DEFAULT 'notice',
    org_id uuid REFERENCES public.organizations(id),
    "createdAt" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    operation text NOT NULL,
    table_name text,
    details text,
    user_email text,
    org_id uuid REFERENCES public.organizations(id),
    "createdAt" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    content text NOT NULL,
    "senderId" text NOT NULL,
    "senderName" text NOT NULL,
    org_id uuid REFERENCES public.organizations(id),
    "createdAt" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Configuração de Segurança (RLS) - SEGURA E ISOLADA
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordinators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- REMOVE POLÍTICAS ANTIGAS ABERTAS
DROP POLICY IF EXISTS "Permitir tudo para anon" ON public.members;
DROP POLICY IF EXISTS "Permitir tudo para anon" ON public.coordinators;
DROP POLICY IF EXISTS "Acesso total aos avisos" ON public.announcements;
DROP POLICY IF EXISTS "Logar auditoria" ON public.audit_logs;
DROP POLICY IF EXISTS "Acesso público ao chat" ON public.messages;

-- CRIA NOVAS POLÍTICAS (Isoladas por Organização)
DROP POLICY IF EXISTS "Isolamento de Membros" ON public.members;
CREATE POLICY "Isolamento de Membros" ON public.members FOR ALL USING (org_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (org_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Isolamento de Coordenadores" ON public.coordinators;
CREATE POLICY "Isolamento de Coordenadores" ON public.coordinators FOR ALL USING (org_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (org_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Isolamento de Avisos" ON public.announcements;
CREATE POLICY "Isolamento de Avisos" ON public.announcements FOR ALL USING (org_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (org_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Isolamento de Mensagens" ON public.messages;
CREATE POLICY "Isolamento de Mensagens" ON public.messages FOR ALL USING (org_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (org_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Logar auditoria com isolamento" ON public.audit_logs;
CREATE POLICY "Logar auditoria com isolamento" ON public.audit_logs FOR INSERT WITH CHECK (org_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Ler auditoria da própria organização" ON public.audit_logs;
CREATE POLICY "Ler auditoria da própria organização" ON public.audit_logs FOR SELECT USING (org_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- 5. Habilita o Realtime
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'members') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'announcements') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
    END IF;
END $$;
