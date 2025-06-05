export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*/.test(error.message);
}

export function getInitials(firstName?: string, lastName?: string): string {
  if (!firstName && !lastName) return "??";
  
  const first = firstName?.[0]?.toUpperCase() || "";
  const last = lastName?.[0]?.toUpperCase() || "";
  
  return first + last;
}

export function getFullName(firstName?: string, lastName?: string): string {
  if (!firstName && !lastName) return "Usuário";
  
  return [firstName, lastName].filter(Boolean).join(" ");
}

export function getProfileLabel(profile: string): string {
  const profileLabels: Record<string, string> = {
    ADMINISTRATOR: "Administrador",
    MANAGER: "Gerente",
    COORDINATOR: "Coordenador",
    NEGOTIATOR: "Negociador",
    LAWYER: "Advogado",
    CONTROLLER: "Controller",
  };
  
  return profileLabels[profile] || profile;
}

export function hasPermission(userProfile: string, requiredProfiles: string[]): boolean {
  return requiredProfiles.includes(userProfile);
}

export function canManageUsers(userProfile: string): boolean {
  return hasPermission(userProfile, ["ADMINISTRATOR", "MANAGER"]);
}

export function canDeleteUsers(userProfile: string): boolean {
  return hasPermission(userProfile, ["ADMINISTRATOR"]);
}

export function canManageWorkGroups(userProfile: string): boolean {
  return hasPermission(userProfile, ["ADMINISTRATOR", "MANAGER"]);
}

export function canDeleteWorkGroups(userProfile: string): boolean {
  return hasPermission(userProfile, ["ADMINISTRATOR"]);
}
