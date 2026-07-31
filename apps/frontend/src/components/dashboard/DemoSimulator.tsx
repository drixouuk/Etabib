"use client";

import { Layers, Eye } from "lucide-react";

type Props = {
  currentTier: string;
  onTierChange: (tier: string) => void;
  onRoleToggle: () => void;
  simulatedRole: "doctor" | "secretary";
};

export default function DemoSimulator({
  currentTier,
  onTierChange,
  onRoleToggle,
  simulatedRole,
}: Props) {
  const tiers = ["vitrine", "rdv", "cabinet"];
  const tierLabels: Record<string, string> = {
    vitrine: "Vitrine (simulé)",
    rdv: "RDV (simulé)",
    cabinet: "Cabinet (réel)",
  };

  return (
    <div className="border-t border-primary-600/15 px-[10px] pt-3 mt-3">
      <p className="text-[10px] font-bold uppercase text-stone-400 tracking-wider mb-2">
        Simulateur démo
      </p>

      {/* Tier switcher */}
      <div className="flex items-center gap-1.5 mb-2">
        <Layers className="size-3 text-stone-400 shrink-0" />
        <select
          value={currentTier}
          onChange={(e) => onTierChange(e.target.value)}
          className="flex-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px] text-stone-700"
        >
          {tiers.map((t) => (
            <option key={t} value={t}>
              {tierLabels[t]}
            </option>
          ))}
        </select>
      </div>

      {/* Role switcher */}
      <button
        onClick={onRoleToggle}
        className="flex items-center gap-1.5 w-full rounded-md px-2 py-1 text-[11px] text-stone-600 hover:bg-stone-100 transition-colors"
      >
        <Eye className="size-3 shrink-0" />
        Vue : {simulatedRole === "doctor" ? "Médecin" : "Secrétaire"}
      </button>
    </div>
  );
}
