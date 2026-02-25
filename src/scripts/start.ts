import { $ } from "bun";
import chalk from "chalk";

const db_url = Bun.env.DATABASE_URL ?? "not set";

console.log(chalk.cyan("Starting PostgreSQL in Docker..."));
await $`docker-compose up -d`;

console.log(chalk.yellow("Waiting for PostgreSQL to be ready..."));

let ready = false;
for (let i = 0; i < 30; i++) {
  try {
    await $`docker-compose exec -T postgres pg_isready -U postgres`.quiet();
    ready = true;
    break;
  } catch {
    await Bun.sleep(1000);
    process.stdout.write(chalk.gray("."));
  }
}

if (!ready) {
  console.error(chalk.red("\nPostgreSQL failed to become ready. Exiting."));
  process.exit(1);
}

console.log(chalk.green("\nPostgreSQL is ready."));

console.log(chalk.yellow("Waiting for Qdrant to be ready..."));

let qdrant_ready = false;
for (let i = 0; i < 30; i++) {
  try {
    const res = await fetch("http://localhost:6333/healthz");
    if (res.ok) {
      qdrant_ready = true;
      break;
    }
  } catch {
    await Bun.sleep(1000);
    process.stdout.write(chalk.gray("."));
  }
}

if (!qdrant_ready) {
  console.error(chalk.red("\nQdrant failed to become ready. Exiting."));
  process.exit(1);
}

console.log(chalk.green("\nQdrant is ready."));

console.log(chalk.yellow("Waiting for Redis to be ready..."));

let redis_ready = false;
for (let i = 0; i < 30; i++) {
  try {
    await $`docker-compose exec -T redis redis-cli ping`.quiet();
    redis_ready = true;
    break;
  } catch {
    await Bun.sleep(1000);
    process.stdout.write(chalk.gray("."));
  }
}

if (!redis_ready) {
  console.error(chalk.red("\nRedis failed to become ready. Exiting."));
  process.exit(1);
}

console.log(chalk.green("\nRedis is ready."));
console.log(chalk.dim("DB →"), chalk.blue(db_url));
console.log(chalk.dim("Qdrant →"), chalk.blue("http://localhost:6333"));
console.log(chalk.dim("Redis →"), chalk.blue("localhost:6379"));
console.log(chalk.dim("pgAdmin →"), chalk.blue("http://localhost:5050"));
console.log(chalk.cyan("Starting server..."));
await $`FORCE_COLOR=1 bun --watch src/index.ts`;
