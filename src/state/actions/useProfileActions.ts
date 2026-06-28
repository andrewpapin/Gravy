import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { faUserPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import type { GravyRoot, GravyState } from '../types';
import { applyDayRollover, makeNewProfile } from '../defaultState';
import { appendAuditLog } from '../auditLog';
import type { LogActor } from '../actionLog';
import { buildMergedRoot, clone } from './shared';
import type { ProfilePatch, ShowToast } from './types';

export interface ProfileDeps {
  setState: Dispatch<SetStateAction<GravyState>>;
  setRoot: Dispatch<SetStateAction<GravyRoot>>;
  stateRef: MutableRefObject<GravyState>;
  rootRef: MutableRefObject<GravyRoot>;
  showToast: ShowToast;
  actorRef: MutableRefObject<LogActor | undefined>;
}

// Multi-kid profile management. Each action folds the live active-profile state back into the
// root (buildMergedRoot) before mutating, and runs applyDayRollover on a newly-activated profile
// since it may not have been opened today.
export function useProfileActions(deps: ProfileDeps) {
  const { setState, setRoot, stateRef, rootRef, showToast, actorRef } = deps;

  const switchProfile = useCallback((id: string) => {
    const prevRoot = rootRef.current;
    if (id === prevRoot.activeProfileId || !prevRoot.profiles.some((p) => p.id === id)) return;
    const merged = buildMergedRoot(prevRoot, stateRef.current);
    const target = merged.profiles.find((p) => p.id === id)!;
    const rolled = applyDayRollover(clone(target.state));
    setRoot({
      ...merged,
      activeProfileId: id,
      profiles: merged.profiles.map((p) => (p.id === id ? { id, state: rolled } : p)),
    });
    setState(rolled);
  }, [setState, setRoot, stateRef, rootRef]);

  const addProfile = useCallback(
    (name: string, opts?: ProfilePatch & { switchTo?: boolean }) => {
      const merged = buildMergedRoot(rootRef.current, stateRef.current);
      const entry = makeNewProfile(name, stateRef.current, {
        avatarIcon: opts?.avatarIcon,
        avatarIconColor: opts?.avatarIconColor,
        avatarBgColor: opts?.avatarBgColor,
        theme: opts?.theme,
      });
      const switchTo = opts?.switchTo ?? false;
      setRoot({
        ...merged,
        profiles: [...merged.profiles, entry],
        activeProfileId: switchTo ? entry.id : merged.activeProfileId,
      });
      if (switchTo) setState(entry.state);
      setState((prev) => {
        const next = clone(prev);
        appendAuditLog(next, actorRef.current, { type: 'profileAdded', label: `Added profile "${entry.state.settings.childName}"` });
        return next;
      });
      showToast(faUserPlus, `Added ${entry.state.settings.childName}`);
    },
    [setState, setRoot, stateRef, rootRef, showToast, actorRef],
  );

  const updateProfile = useCallback((id: string, patch: ProfilePatch) => {
    const profileName =
      id === rootRef.current.activeProfileId
        ? stateRef.current.settings.childName
        : rootRef.current.profiles.find((p) => p.id === id)?.state.settings.childName;
    if (id === rootRef.current.activeProfileId) {
      setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
    } else {
      setRoot((r) => ({
        ...r,
        profiles: r.profiles.map((p) =>
          p.id === id
            ? { id: p.id, state: { ...p.state, settings: { ...p.state.settings, ...patch } } }
            : p,
        ),
      }));
    }
    setState((prev) => {
      const next = clone(prev);
      appendAuditLog(next, actorRef.current, { type: 'profileUpdated', label: `Edited profile${profileName ? ` "${profileName}"` : ''} settings` });
      return next;
    });
  }, [setState, setRoot, stateRef, rootRef, actorRef]);

  const deleteProfile = useCallback(
    (id: string) => {
      const prevRoot = rootRef.current;
      if (prevRoot.profiles.length <= 1) return; // never delete the last profile
      const merged = buildMergedRoot(prevRoot, stateRef.current);
      const removed = merged.profiles.find((p) => p.id === id);
      const remaining = merged.profiles.filter((p) => p.id !== id);
      const wasActive = id === merged.activeProfileId;
      let nextState = stateRef.current;
      if (wasActive) {
        nextState = applyDayRollover(clone(remaining[0].state));
        remaining[0] = { id: remaining[0].id, state: nextState };
      }
      setRoot({
        ...merged,
        profiles: remaining,
        activeProfileId: wasActive ? remaining[0].id : merged.activeProfileId,
      });
      if (wasActive) setState(nextState);
      setState((prev) => {
        const next = clone(prev);
        appendAuditLog(next, actorRef.current, { type: 'profileRemoved', label: `Deleted profile${removed ? ` "${removed.state.settings.childName}"` : ''}` });
        return next;
      });
      if (removed) showToast(faTrashCan, `Deleted ${removed.state.settings.childName}`);
    },
    [setState, setRoot, stateRef, rootRef, showToast, actorRef],
  );

  return { switchProfile, addProfile, updateProfile, deleteProfile };
}
