"use client";

import { useState, useTransition } from "react";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { toast } from "@/components/ui/toast";
import { changeStaffRole } from "@/lib/supplier/staff-actions";
import { MEMBER_ROLES, ROLE_LABELS, type MemberRole } from "@/lib/supplier/permissions";

/** Inline role change for a team member (optimistic, rolls back on failure). */
export function TeamRoleSelect({ memberId, role }: { memberId: string; role: MemberRole }) {
  const [value, setValue] = useState(role);
  const [pending, start] = useTransition();

  function change(next: MemberRole) {
    const previous = value;
    setValue(next);
    start(async () => {
      const result = await changeStaffRole(memberId, next);
      if (result.ok) {
        toast.add({ type: "success", title: result.message });
      } else {
        setValue(previous);
        toast.add({ type: "error", title: "Could not change role", description: result.message });
      }
    });
  }

  return (
    <NativeSelect
      size="sm"
      aria-label="Role"
      value={value}
      disabled={pending}
      onChange={(e) => change(e.target.value as MemberRole)}
    >
      {MEMBER_ROLES.map((r) => (
        <NativeSelectOption key={r} value={r}>
          {ROLE_LABELS[r]}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
