"use client";

import { createContext, useContext } from "react";
import type { VendorOrgRole } from "@/lib/vendor/types";

const VendorRoleContext = createContext<VendorOrgRole>("tech");

interface VendorRoleProviderProps {
  role: VendorOrgRole;
  children: React.ReactNode;
}

export function VendorRoleProvider({ role, children }: VendorRoleProviderProps) {
  return (
    <VendorRoleContext.Provider value={role}>
      {children}
    </VendorRoleContext.Provider>
  );
}

export function useVendorRole(): VendorOrgRole {
  return useContext(VendorRoleContext);
}
