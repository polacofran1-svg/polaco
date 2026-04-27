import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { and, gte, eq } from "drizzle-orm";
import {
  createDb,
  activityLog,
  issues,
  issueComments,
  authUsers,
  companies,
} from "../packages/db/src/index.js";
import { resolveMigrationConnection } from "../packages/db/src/migration-runtime.js";

// Carga .paperclip/.env en process.env
const paperclipEnvPath = path.resolve(process.cwd(), ".paperclip", ".env");
if (existsSync(paperclipEnvPath)) {
  for (const line of readFileSync(paperclipEnvPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL?.trim();
const DRY_RUN = process.env.DRY_RUN === "1";
const HOURS = Number(process.env.DIGEST_HOURS ?? "24");

async function main() {
  if (!WEBHOOK_URL && !DRY_RUN) {
    console.error("Error: DISCORD_WEBHOOK_URL no está configurado en .paperclip/.env");
    process.exit(1);
  }

  const conn = await resolveMigrationConnection();
  const db = createDb(conn.connectionString);

  try {
    const since = new Date(Date.now() - HOURS * 60 * 60 * 1000);
    const sinceLabel = since.toLocaleString("es", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });

    const companyRows = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies);

    if (companyRows.length === 0) {
      console.log("No hay companies en la base de datos todavía.");
      return;
    }

    const allEmbeds: object[] = [];

    for (const company of companyRows) {
      const [newIssues, newComments, logs, users] = await Promise.all([
        db
          .select({
            id: issues.id,
            title: issues.title,
            status: issues.status,
            createdByUserId: issues.createdByUserId,
          })
          .from(issues)
          .where(and(eq(issues.companyId, company.id), gte(issues.createdAt, since))),

        db
          .select({
            issueId: issueComments.issueId,
            authorUserId: issueComments.authorUserId,
          })
          .from(issueComments)
          .where(and(eq(issueComments.companyId, company.id), gte(issueComments.createdAt, since))),

        db
          .select({
            actorId: activityLog.actorId,
            actorType: activityLog.actorType,
            action: activityLog.action,
          })
          .from(activityLog)
          .where(and(eq(activityLog.companyId, company.id), gte(activityLog.createdAt, since))),

        db.select({ id: authUsers.id, name: authUsers.name }).from(authUsers),
      ]);

      const userMap = new Map(users.map((u) => [u.id, u.name ?? u.id]));
      const userName = (id: string | null | undefined) =>
        id ? (userMap.get(id) ?? id) : "Agente";

      const lines: string[] = [];

      if (newIssues.length > 0) {
        lines.push(`**📝 Issues nuevos — ${newIssues.length}**`);
        for (const issue of newIssues.slice(0, 10)) {
          lines.push(`• ${issue.title} — *${userName(issue.createdByUserId)}* \`[${issue.status}]\``);
        }
        if (newIssues.length > 10) lines.push(`  …y ${newIssues.length - 10} más`);
      }

      if (newComments.length > 0) {
        lines.push(`\n**💬 Comentarios — ${newComments.length}**`);
        const byUser = new Map<string, number>();
        for (const c of newComments) {
          const key = userName(c.authorUserId);
          byUser.set(key, (byUser.get(key) ?? 0) + 1);
        }
        for (const [name, count] of byUser) {
          lines.push(`• ${name}: ${count} comentario${count !== 1 ? "s" : ""}`);
        }
      }

      const statusChanges = logs.filter(
        (l) => l.action === "status_changed" || l.action === "issue.status_changed",
      );
      if (statusChanges.length > 0) {
        lines.push(`\n**🔄 Cambios de estado — ${statusChanges.length}**`);
        const byUser = new Map<string, number>();
        for (const l of statusChanges) {
          const key = l.actorType === "user" ? userName(l.actorId) : "Agente";
          byUser.set(key, (byUser.get(key) ?? 0) + 1);
        }
        for (const [name, count] of byUser) {
          lines.push(`• ${name}: ${count} cambio${count !== 1 ? "s" : ""}`);
        }
      }

      const agentActions = logs.filter((l) => l.actorType === "agent");
      if (agentActions.length > 0) {
        lines.push(`\n**🤖 Acciones de agentes — ${agentActions.length}**`);
      }

      const hasActivity = lines.length > 0;
      allEmbeds.push({
        title: `📊 Resumen ${company.name ?? "Saturn"} — últimas ${HOURS}h`,
        description: hasActivity ? lines.join("\n").slice(0, 4000) : "Sin actividad en este período.",
        color: hasActivity ? 0x5865f2 : 0x747f8d,
        footer: { text: `Desde ${sinceLabel}` },
      });
    }

    const payload = { embeds: allEmbeds };

    if (DRY_RUN) {
      console.log(JSON.stringify(payload, null, 2));
      return;
    }

    const res = await fetch(WEBHOOK_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.status === 204 || res.status === 200) {
      console.log("✓ Digest enviado a Discord");
    } else {
      const body = await res.text();
      console.error(`Error Discord HTTP ${res.status}: ${body}`);
      process.exit(1);
    }
  } finally {
    await conn.stop();
  }
}

await main();
