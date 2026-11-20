"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { mergeLocalSaved } from "@/app/account-actions";

export type AccountUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  role: string;
};

type Ctx = {
  user: AccountUser | null;
  savedIds: Set<string>;
  setSaved: (id: string, saved: boolean) => void;
};

const AccountContext = createContext<Ctx>({ user: null, savedIds: new Set(), setSaved: () => {} });

export const LOCAL_SAVED_KEY = "gh.saved";

export function readLocalSaved(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(LOCAL_SAVED_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function writeLocalSaved(ids: string[]) {
  try {
    localStorage.setItem(LOCAL_SAVED_KEY, JSON.stringify(ids));
  } catch {}
}

export function AccountProvider({
  user,
  savedIds: initialSaved,
  children,
}: {
  user: AccountUser | null;
  savedIds: string[];
  children: React.ReactNode;
}) {
  const [savedIds, setSavedIds] = useState(() => new Set(initialSaved));

  // Keep in sync with server data after navigations and sign-in/out.
  useEffect(() => {
    setSavedIds(new Set(user ? initialSaved : readLocalSaved()));
  }, [user, initialSaved]);

  // After sign-in, move anything saved on this device into the account.
  useEffect(() => {
    if (!user) return;
    const local = readLocalSaved();
    if (local.length === 0) return;
    mergeLocalSaved(local).then((all) => {
      writeLocalSaved([]);
      setSavedIds(new Set(all));
    });
  }, [user]);

  const setSaved = (id: string, saved: boolean) =>
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (saved) next.add(id);
      else next.delete(id);
      return next;
    });

  return <AccountContext.Provider value={{ user, savedIds, setSaved }}>{children}</AccountContext.Provider>;
}

export const useAccount = () => useContext(AccountContext);
