import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const workspaceRoot = fileURLToPath(new URL("../", import.meta.url));
const typescriptCli = fileURLToPath(
  new URL("../node_modules/typescript/bin/tsc", import.meta.url),
);
const invalidFixture = fileURLToPath(
  new URL(
    "../packages/config/fixtures/invalid-type/tsconfig.json",
    import.meta.url,
  ),
);

const result = spawnSync(
  process.execPath,
  [typescriptCli, "--project", invalidFixture, "--pretty", "false"],
  {
    cwd: workspaceRoot,
    encoding: "utf8",
  },
);

if (result.error) {
  console.error("TypeScript 실패 검증을 실행하지 못했습니다.");
  console.error(result.error.message);
  process.exit(1);
}

const output = [result.stdout, result.stderr].filter(Boolean).join("\n");

if (result.status === 0) {
  console.error("잘못된 TypeScript 코드가 예기치 않게 검사를 통과했습니다.");
  process.exit(1);
}

if (!output.includes("TS2322")) {
  console.error("예상한 타입 오류(TS2322)가 아닌 이유로 검사에 실패했습니다.");
  console.error(output);
  process.exit(1);
}

console.log("PASS: 잘못된 TypeScript 코드가 TS2322로 거부되었습니다.");
