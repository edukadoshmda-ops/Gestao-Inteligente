import { Profile } from '../types';

export interface PermissionCheck {
  canCreateCampaigns: boolean;
  canDeleteCampaigns: boolean;
  canCreateCoordinators: boolean;
  canDeleteCoordinators: boolean;
  canEditCoordinators: boolean;
  canCreateMembers: boolean;
  canDeleteMembers: boolean;
  canEditMembers: boolean;
  canViewAllMembers: boolean;
  canViewOwnNetwork: boolean;
  canAccessAnalytics: boolean;
  canAccessAdminMaster: boolean;
  canAccessAllTabs: boolean;
}

export interface NetworkFilter {
  role: 'super_admin' | 'candidate' | 'general_coordination' | 'area_coordinator' | 'coordinator';
  profileId: string;
  isRestricted: boolean;
  isArea: boolean;
  isField: boolean;
}

export function checkPermissions(profile: Profile | null): PermissionCheck {
  if (!profile) {
    return {
      canCreateCampaigns: false,
      canDeleteCampaigns: false,
      canCreateCoordinators: false,
      canDeleteCoordinators: false,
      canEditCoordinators: false,
      canCreateMembers: false,
      canDeleteMembers: false,
      canEditMembers: false,
      canViewAllMembers: false,
      canViewOwnNetwork: false,
      canAccessAnalytics: false,
      canAccessAdminMaster: false,
      canAccessAllTabs: false,
    };
  }

  const role = profile.role;

  switch (role) {
    case 'super_admin':
      return {
        canCreateCampaigns: true,
        canDeleteCampaigns: true,
        canCreateCoordinators: true,
        canDeleteCoordinators: true,
        canEditCoordinators: true,
        canCreateMembers: true,
        canDeleteMembers: true,
        canEditMembers: true,
        canViewAllMembers: true,
        canViewOwnNetwork: true,
        canAccessAnalytics: true,
        canAccessAdminMaster: true,
        canAccessAllTabs: true,
      };

    case 'candidate':
    case 'general_coordination':
      // Candidato e Coordenador Geral têm VISÃO TOTAL DA CAMPANHA
      return {
        canCreateCampaigns: false,
        canDeleteCampaigns: false,
        canCreateCoordinators: true,
        canDeleteCoordinators: true,
        canEditCoordinators: true,
        canCreateMembers: true,
        canDeleteMembers: true,
        canEditMembers: true,
        canViewAllMembers: true,
        canViewOwnNetwork: true,
        canAccessAnalytics: true,
        canAccessAdminMaster: false,
        canAccessAllTabs: true,
      };

    case 'area_coordinator':
      // Coordenador de Área vê e gerencia apenas a sua rede subordinada
      return {
        canCreateCampaigns: false,
        canDeleteCampaigns: false,
        canCreateCoordinators: true, // Pode cadastrar coordenadores de campo em sua rede
        canDeleteCoordinators: false,
        canEditCoordinators: false,
        canCreateMembers: true, // Pode cadastrar eleitores
        canDeleteMembers: true,
        canEditMembers: true,
        canViewAllMembers: false,
        canViewOwnNetwork: true,
        canAccessAnalytics: true,
        canAccessAdminMaster: false,
        canAccessAllTabs: false,
      };

    case 'coordinator':
      // Coordenador de Campo/Rua: apenas seus eleitores e ranking de sua produção
      return {
        canCreateCampaigns: false,
        canDeleteCampaigns: false,
        canCreateCoordinators: false, // NÃO vê nem cadastra coordenadores
        canDeleteCoordinators: false,
        canEditCoordinators: false,
        canCreateMembers: true, // Cadastra eleitores normalmente
        canDeleteMembers: true,
        canEditMembers: true,
        canViewAllMembers: false,
        canViewOwnNetwork: true,
        canAccessAnalytics: false,
        canAccessAdminMaster: false,
        canAccessAllTabs: false,
      };

    default:
      return {
        canCreateCampaigns: false,
        canDeleteCampaigns: false,
        canCreateCoordinators: false,
        canDeleteCoordinators: false,
        canEditCoordinators: false,
        canCreateMembers: false,
        canDeleteMembers: false,
        canEditMembers: false,
        canViewAllMembers: false,
        canViewOwnNetwork: false,
        canAccessAnalytics: false,
        canAccessAdminMaster: false,
        canAccessAllTabs: false,
      };
  }
}

export function getNetworkFilter(profile: Profile | null): NetworkFilter | null {
  if (!profile) return null;

  const role = profile.role;

  // Candidato, Coordenação Geral e Super Admin veem tudo da organização (sem filtro restritivo)
  if (role === 'super_admin' || role === 'candidate' || role === 'general_coordination') {
    return null;
  }

  // Coordenadores de Área e Campo possuem visão isolada por rede
  return {
    role,
    profileId: profile.id,
    isRestricted: true,
    isArea: role === 'area_coordinator',
    isField: role === 'coordinator'
  };
}
