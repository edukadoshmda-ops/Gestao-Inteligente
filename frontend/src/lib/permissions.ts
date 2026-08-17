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
      };

    case 'candidate':
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
        canAccessAdminMaster: false,
      };

    case 'general_coordination':
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
      };

    case 'area_coordinator':
      return {
        canCreateCampaigns: false,
        canDeleteCampaigns: false,
        canCreateCoordinators: true,
        canDeleteCoordinators: true,
        canEditCoordinators: true,
        canCreateMembers: true,
        canDeleteMembers: true,
        canEditMembers: true,
        canViewAllMembers: false,
        canViewOwnNetwork: true,
        canAccessAnalytics: true,
        canAccessAdminMaster: false,
      };

    case 'coordinator':
      return {
        canCreateCampaigns: false,
        canDeleteCampaigns: false,
        canCreateCoordinators: false,
        canDeleteCoordinators: false,
        canEditCoordinators: false,
        canCreateMembers: true,
        canDeleteMembers: true,
        canEditMembers: true,
        canViewAllMembers: false,
        canViewOwnNetwork: true,
        canAccessAnalytics: false,
        canAccessAdminMaster: false,
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
      };
  }
}

export function getNetworkFilter(profile: Profile | null) {
  if (!profile) return null;

  const role = profile.role;

  // Coordenadores só veem sua própria rede
  if (role === 'coordinator' || role === 'area_coordinator') {
    return {
      network_id: profile.id, // Filtra pela rede do coordenador
    };
  }

  // Candidato e Coordenação Geral veem tudo da organização
  return null;
}
