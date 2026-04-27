import { execSync } from "node:child_process";
import notifier from "node-notifier";

const WATCH_INTERVAL_MS = 5 * 60 * 1000;

interface RepoInfo {
  owner: string;
  repo: string;
}

function getOriginUrl(): string | null {
  try {
    return execSync("git remote get-url origin", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function parseGithubUrl(url: string): RepoInfo | null {
  const httpsMatch = url.match(/github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?$/i);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }
  return null;
}

function getLocalSha(): string {
  return execSync("git rev-parse HEAD").toString().trim();
}

async function getRemoteSha(info: RepoInfo): Promise<string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "saturn-update-checker",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(
    `https://api.github.com/repos/${info.owner}/${info.repo}/commits/master`,
    { headers },
  );
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
  }
  const data = (await res.json()) as { sha: string };
  return data.sha;
}

async function checkOnce(silent = false): Promise<boolean> {
  const originUrl = getOriginUrl();
  if (!originUrl) {
    if (!silent) {
      console.error(
        "✗ No se encontró remote 'origin'. Configúralo con: git remote add origin <url>",
      );
    }
    return false;
  }

  const info = parseGithubUrl(originUrl);
  if (!info) {
    if (!silent) console.error(`✗ No se pudo parsear la URL de GitHub: ${originUrl}`);
    return false;
  }

  const localSha = getLocalSha();
  let remoteSha: string;
  try {
    remoteSha = await getRemoteSha(info);
  } catch (err) {
    if (!silent) {
      console.error(
        `✗ Error consultando GitHub: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return false;
  }

  if (localSha === remoteSha) {
    if (!silent) console.log("✓ Saturn está actualizado");
    return false;
  }

  console.log(
    `⬆ Actualización disponible: ${localSha.slice(0, 7)} → ${remoteSha.slice(0, 7)}`,
  );
  notifier.notify({
    title: "Saturn - Actualización disponible",
    message: "Hay una nueva versión disponible. Corre `pnpm auto-update` para actualizar.",
  });
  return true;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const watch = args.includes("--watch");
  const auto = args.includes("--auto");

  if (!watch) {
    await checkOnce();
    return;
  }

  console.log(`▶ Saturn update watcher iniciado (intervalo ${WATCH_INTERVAL_MS / 1000}s)`);
  const tick = async () => {
    try {
      const updateAvailable = await checkOnce(true);
      if (updateAvailable && auto) {
        console.log("→ Ejecutando auto-update...");
        try {
          execSync("pnpm auto-update", { stdio: "inherit" });
        } catch (err) {
          console.error(
            `✗ auto-update falló: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    } catch {
      // Silencioso en modo watch para no romper el daemon
    }
  };
  await tick();
  setInterval(tick, WATCH_INTERVAL_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
