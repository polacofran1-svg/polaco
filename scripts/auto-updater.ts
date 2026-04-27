import { execSync } from "node:child_process";

interface Step {
  label: string;
  cmd: string;
}

function hasOrigin(): boolean {
  try {
    execSync("git remote get-url origin", { stdio: ["ignore", "pipe", "ignore"] });
    return true;
  } catch {
    return false;
  }
}

function runStep(step: Step): void {
  process.stdout.write(`⏳ ${step.label}...\n`);
  try {
    execSync(step.cmd, { stdio: "inherit" });
    process.stdout.write(`✓ ${step.label} completado\n\n`);
  } catch (err) {
    process.stdout.write(`✗ ${step.label} falló\n`);
    throw err;
  }
}

function main(): void {
  console.log("════════════════════════════════════");
  console.log("     Saturn Auto-Updater");
  console.log("════════════════════════════════════\n");

  const remote = hasOrigin() ? "origin" : "upstream";
  const steps: Step[] = [
    { label: `git pull ${remote} master`, cmd: `git pull ${remote} master` },
    { label: "pnpm install", cmd: "pnpm install" },
    { label: "pnpm db:migrate", cmd: "pnpm db:migrate" },
  ];

  try {
    for (const step of steps) {
      runStep(step);
    }
    console.log("✓ Saturn actualizado exitosamente");
  } catch (err) {
    console.error(
      `\n✗ Auto-update abortado: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  }
}

main();
