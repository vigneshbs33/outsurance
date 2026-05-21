'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  getCoveredMembers,
  getPolicyGroups,
  parseProfileFromFullName,
  type PolicyGroup,
} from '../lib/profileMeta';
import { useLanguage } from './LanguageProvider';

export interface ExplorerCoverageBarProps {
  activeMember?: string;
  activeGroupId?: string | null;
  onMemberChange?: (member: string) => void;
  onGroupChange?: (groupId: string | null) => void;
}

export function ExplorerCoverageBar({
  activeMember: controlledMember,
  activeGroupId: controlledGroupId,
  onMemberChange,
  onGroupChange,
}: ExplorerCoverageBarProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [members, setMembers] = useState<string[]>(['Self']);
  const [groups, setGroups] = useState<PolicyGroup[]>([]);
  const [internalMember, setInternalMember] = useState('Self');
  const [internalGroupId, setInternalGroupId] = useState<string | null>(null);

  const activeMember = controlledMember ?? internalMember;
  const activeGroupId = controlledGroupId !== undefined ? controlledGroupId : internalGroupId;

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      const { displayName: name, meta } = parseProfileFromFullName(
        (data?.full_name as string) ?? ''
      );
      setDisplayName(name);
      const covered = getCoveredMembers(meta);
      setMembers(covered);
      const policyGroups = getPolicyGroups(meta);
      setGroups(policyGroups);
      setInternalMember(covered[0] ?? 'Self');
      if (policyGroups.length > 0) {
        setInternalGroupId(policyGroups[0].id);
      }
      setLoading(false);
    })();
  }, []);

  const visibleGroups = useMemo(
    () => groups.filter((g) => g.members.length > 0),
    [groups]
  );

  const selectMember = (m: string) => {
    if (onMemberChange) onMemberChange(m);
    else setInternalMember(m);
    if (onGroupChange) onGroupChange(null);
    else setInternalGroupId(null);
  };

  const selectGroup = (groupId: string) => {
    if (onGroupChange) onGroupChange(groupId);
    else setInternalGroupId(groupId);
  };

  if (loading) {
    return (
      <div className="bg-teal-800 text-white px-4 sm:px-6 py-2.5 animate-pulse">
        <div className="max-w-[960px] mx-auto h-8 bg-white/10 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-teal-800 text-white px-4 sm:px-6 py-3 border-b border-teal-900 sticky top-0 z-40">
      <div className="max-w-[960px] mx-auto flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start sm:items-center gap-2 min-w-0">
          <Users size={16} className="shrink-0 mt-0.5 sm:mt-0 opacity-90" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
              {t('explorer.tailoredFor')}
              {displayName ? ` · ${displayName.split(' ')[0]}` : ''}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {members.map((m) => {
                const selected = activeMember === m && !activeGroupId;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => selectMember(m)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                      selected
                        ? 'bg-white text-teal-800 border-white'
                        : 'border-white/40 text-white hover:border-white'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
              {visibleGroups.map((g, idx) => {
                const selected = activeGroupId === g.id;
                const label = g.name?.trim() || `Grp ${idx + 1}`;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => selectGroup(g.id)}
                    title={g.members.join(', ')}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                      selected
                        ? 'bg-emerald-400 text-teal-900 border-emerald-300'
                        : 'border-emerald-300/60 text-emerald-100 hover:border-emerald-200'
                    }`}
                  >
                    {label}
                    <span className="opacity-80 font-semibold ml-1">
                      ({g.members.length})
                    </span>
                  </button>
                );
              })}
            </div>
            {activeGroupId && (
              <p className="text-[10px] text-white/60 mt-1 truncate">
                {t('explorer.groupMembers')}:{' '}
                {visibleGroups.find((g) => g.id === activeGroupId)?.members.join(' · ') ?? ''}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push('/assessment?reassess=1')}
          className="shrink-0 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/30 transition-colors"
        >
          <Pencil size={12} />
          {t('explorer.updateAssessment')}
        </button>
      </div>
    </div>
  );
}
