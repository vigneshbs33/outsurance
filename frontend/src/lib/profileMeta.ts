export type PolicyGroup = { id: string; name: string; members: string[] };

export type ProfileMeta = {
  covered_members?: string[];
  member_ages?: Record<string, number>;
  groups?: PolicyGroup[];
  city?: string;
  gender?: string;
};

export function parseProfileFromFullName(fullName: string | null | undefined): {
  displayName: string;
  meta: ProfileMeta | null;
} {
  if (!fullName?.trim()) return { displayName: 'Member', meta: null };
  if (!fullName.includes(' || ')) return { displayName: fullName.trim(), meta: null };
  const parts = fullName.split(' || ');
  const displayName = parts[0]?.trim() || 'Member';
  try {
    return { displayName, meta: JSON.parse(parts[1]) as ProfileMeta };
  } catch {
    return { displayName, meta: null };
  }
}

export function getCoveredMembers(meta: ProfileMeta | null): string[] {
  const list = meta?.covered_members?.filter(Boolean) ?? [];
  return list.length > 0 ? list : ['Self'];
}

export function getPolicyGroups(meta: ProfileMeta | null): PolicyGroup[] {
  const groups = meta?.groups ?? [];
  return groups.filter((g) => (g.members?.length ?? 0) > 0);
}
