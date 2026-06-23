"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/Table";
import { setUserPlanAction } from "@/app/(admin)/admin/actions";
import type { ProjectRole } from "@/lib/db/schema";
import {
  type ActionResult,
  changeMemberRoleAction,
  inviteMemberAction,
  removeMemberAction,
  revokeInvitationAction,
} from "@/lib/projects/member-actions";

type Member = {
  userId: string;
  email: string;
  name: string | null;
  role: ProjectRole;
  planId: string | null;
};

type Invitation = {
  id: string;
  email: string;
  role: ProjectRole;
  expiresAt: Date;
};

const ROLE_BADGE: Record<ProjectRole, "accent" | "neutral"> = {
  owner: "accent",
  admin: "accent",
  member: "neutral",
};

/**
 * Gestion des membres + invitations d'un projet. Partagé entre la console
 * (super-admin, n'importe quel projet) et l'espace client `/manage`.
 * `currentUserId` permet d'éviter qu'on se retire/rétrograde soi-même par accident.
 */
export function MembersPanel({
  projectId,
  members,
  invitations,
  currentUserId,
  plans,
}: {
  projectId: string;
  members: Member[];
  invitations: Invitation[];
  currentUserId: string | null;
  /** Paliers d'offre (console uniquement) → active la colonne d'assignation. */
  plans?: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ProjectRole>("member");

  function run(
    fn: () => Promise<ActionResult>,
    okText: string,
    onOk?: () => void,
  ) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setMsg({ kind: "ok", text: okText });
        onOk?.();
      } else {
        setMsg({ kind: "err", text: res.error ?? "Action impossible." });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {msg && (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${
            msg.kind === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose/40 bg-rose-50 text-rose"
          }`}
        >
          {msg.text}
        </p>
      )}

      {/* Inviter */}
      <form
        className="grid gap-3 sm:grid-cols-[1fr_auto_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => inviteMemberAction(projectId, email, inviteRole),
            "Invitation envoyée.",
            () => setEmail(""),
          );
        }}
      >
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@client.fr"
        />
        <Select
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value as ProjectRole)}
          className="w-32"
        >
          <option value="member">membre</option>
          <option value="admin">admin</option>
          <option value="owner">owner</option>
        </Select>
        <Button type="submit" disabled={pending}>
          Inviter
        </Button>
      </form>

      {/* Membres */}
      <Table>
        <THead>
          <tr>
            <TH>Email</TH>
            <TH>Nom</TH>
            <TH>Rôle</TH>
            {plans && <TH>Palier</TH>}
            <TH />
          </tr>
        </THead>
        <TBody>
          {members.map((m) => (
            <TR key={m.userId}>
              <TD className="font-medium text-navy-700">
                {m.email}
                {m.userId === currentUserId && (
                  <span className="ml-1 text-faint">(vous)</span>
                )}
              </TD>
              <TD>{m.name ?? "—"}</TD>
              <TD>
                <Select
                  defaultValue={m.role}
                  disabled={pending}
                  className="h-8 w-28"
                  onChange={(e) =>
                    run(
                      () =>
                        changeMemberRoleAction(
                          projectId,
                          m.userId,
                          e.target.value,
                        ),
                      "Rôle mis à jour.",
                    )
                  }
                >
                  <option value="member">membre</option>
                  <option value="admin">admin</option>
                  <option value="owner">owner</option>
                </Select>
              </TD>
              {plans && (
                <TD>
                  <Select
                    defaultValue={m.planId ?? ""}
                    disabled={pending}
                    className="h-8 w-36"
                    onChange={(e) =>
                      run(
                        () =>
                          setUserPlanAction(projectId, m.userId, e.target.value),
                        "Palier mis à jour.",
                      )
                    }
                  >
                    <option value="">(défaut)</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </TD>
              )}
              <TD className="text-right">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => removeMemberAction(projectId, m.userId),
                      "Membre retiré.",
                    )
                  }
                  className="text-xs text-faint hover:text-rose disabled:opacity-50"
                >
                  Retirer
                </button>
              </TD>
            </TR>
          ))}
          {members.length === 0 && (
            <TR>
              <TD colSpan={plans ? 5 : 4} className="py-5 text-center text-faint">
                Aucun membre.
              </TD>
            </TR>
          )}
        </TBody>
      </Table>

      {/* Invitations en attente */}
      {invitations.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-faint">
            Invitations en attente
          </h3>
          <Table>
            <THead>
              <tr>
                <TH>Email</TH>
                <TH>Rôle</TH>
                <TH>Expire le</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {invitations.map((inv) => (
                <TR key={inv.id}>
                  <TD className="font-medium text-navy-700">{inv.email}</TD>
                  <TD>
                    <Badge variant={ROLE_BADGE[inv.role]}>{inv.role}</Badge>
                  </TD>
                  <TD className="text-xs text-faint">
                    {new Date(inv.expiresAt).toLocaleDateString("fr-FR")}
                  </TD>
                  <TD className="text-right">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => revokeInvitationAction(projectId, inv.id),
                          "Invitation révoquée.",
                        )
                      }
                      className="text-xs text-faint hover:text-rose disabled:opacity-50"
                    >
                      Révoquer
                    </button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}
