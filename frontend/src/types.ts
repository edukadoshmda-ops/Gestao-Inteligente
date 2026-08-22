/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Organization {
  id: string;
  candidate_name: string;
  subdomain?: string;
  asaas_customer_id?: string;
  subscription_status: 'active' | 'overdue' | 'pending' | 'trialing';
  logo_url?: string;
  created_at: string;
  state?: string;
  city?: string;
  theme_color?: string;
  theme_primary?: string;
  theme_secondary?: string;
  theme_bg?: string;
  welcome_template?: string;
  birthday_template?: string;
  gemini_api_key?: string; // Chave Gemini AI exclusiva por campanha
}

export interface Profile {
  id: string;
  org_id: string;
  organization_id?: string;
  full_name: string;
  email?: string;
  role: 'super_admin' | 'candidate' | 'general_coordination' | 'area_coordinator' | 'coordinator';
  organization?: Organization;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  age?: number;
  voterId?: string;
  voterSection?: string;
  voterZone?: string;
  gender: string;
  birthDate?: string;
  neighborhood?: string;
  coordinatorId?: string;
  observations?: string;
  latitude?: number;
  longitude?: number;
  region?: string;
  referral?: string;
  createdAt: string;
  org_id?: string;
  network_id?: string;
  supportLevel?: string;
}

export interface Voter {
  id: string;
  name: string;
  cpf: string;
  voterId: string;
  voterZone: string;
  municipality: string;
  email: string;
  password?: string;
  phone: string;
  birthDate: string;
  gender: string;
  sex?: string;
  civilStatus: string;
  votingSection: string;
  createdAt: string;
  org_id?: string;
}


export interface Coordinator {
  id: string;
  name: string;
  neighborhood: string;
  city: string;
  voterId?: string;
  voterSection?: string;
  voterZone?: string;
  photo?: string;
  whatsapp?: string;
  email?: string;
  password?: string;
  createdAt: string;
  org_id?: string;
  network_id?: string;
}

export interface User {
  id: string;
  username: string;
  password?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  org_id?: string;
  imageUrl?: string;
  audioUrl?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'info' | 'warning' | 'critical';
  active: boolean;
  imageUrl?: string;
  fileUrl?: string;
  category: 'notice' | 'banner' | 'flyer' | 'project';
  createdAt: string;
  org_id?: string;
}

export interface ElectoralResult {
  id: string;
  city: string;
  zone: string;
  section: string;
  candidateName: string;
  votes: number;
  totalVotesInSection: number;
  municipality?: string;   // Município / UF
  aptVoters?: number;      // Eleitores aptos
  blankVotes?: number;     // Votos brancos
  nullVotes?: number;      // Votos nulos
  electionYear: number;
  createdAt: string;
  org_id?: string;
}
