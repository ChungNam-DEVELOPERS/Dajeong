import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const workspaceRoot = fileURLToPath(new URL("../", import.meta.url));

const highConfidencePatterns = [
  { label: "AWS access key", pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/ },
  { label: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { label: "Google API key", pattern: /\bAIza[A-Za-z0-9_-]{35}\b/ },
  { label: "Slack token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { label: "Stripe live key", pattern: /\bsk_live_[A-Za-z0-9]{16,}\b/ },
  {
    label: "private key",
    pattern: /-----BEGIN(?: [A-Z0-9]+)? PRIVATE KEY-----/,
  },
];

const secretAssignment =
  /^\s*(?:export\s+)?["']?([A-Za-z][A-Za-z0-9_.-]*)["']?\s*[:=]\s*(.*?)\s*$/;

const assignmentFileExtensions = new Set([
  ".bash",
  ".conf",
  ".env",
  ".ini",
  ".json",
  ".properties",
  ".sh",
  ".toml",
  ".yaml",
  ".yml",
  ".zsh",
]);

function shouldScanAssignments(filePath) {
  const baseName = path.basename(filePath);

  return (
    baseName === ".env" ||
    baseName.startsWith(".env.") ||
    assignmentFileExtensions.has(path.extname(baseName))
  );
}

function isSecretName(name) {
  const normalized = name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[.-]+/g, "_")
    .toUpperCase();

  return /(^|_)(API_KEY|PASSWORD|PRIVATE_KEY|SECRET|SERVICE_ACCOUNT_JSON|TOKEN)($|_)/.test(
    normalized,
  );
}

function isSafeReference(filePath, rawValue) {
  const value = rawValue.replace(/[",']+$/g, "").replace(/^[",']+/g, "").trim();

  if (!value || /^\$\{.+\}$/.test(value) || /^<.+>$/.test(value)) {
    return true;
  }

  if (value === "dajeong-local-only") {
    return true;
  }

  if (/\$\{\{\s*(?:env|secrets|vars)\./.test(value)) {
    return true;
  }

  return (
    path.basename(filePath).endsWith(".example") &&
    /(?:example|local-only|placeholder)/i.test(value)
  );
}

export function scanContent(filePath, content) {
  const findings = [];

  for (const detector of highConfidencePatterns) {
    if (detector.pattern.test(content)) {
      findings.push(detector.label);
    }
  }

  if (shouldScanAssignments(filePath)) {
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(secretAssignment);

      if (
        match &&
        isSecretName(match[1]) &&
        !isSafeReference(filePath, match[2])
      ) {
        findings.push(`hard-coded value for ${match[1]}`);
      }
    }
  }

  return [...new Set(findings)];
}

function trackedFiles() {
  const result = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    {
      cwd: workspaceRoot,
      encoding: "buffer",
    },
  );

  if (result.status !== 0 || result.error) {
    throw new Error(
      result.stderr?.toString("utf8") ||
        result.error?.message ||
        "git ls-files failed",
    );
  }

  return result.stdout
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

export function scanTrackedFiles() {
  const findings = [];

  for (const relativePath of trackedFiles()) {
    const buffer = readFileSync(path.join(workspaceRoot, relativePath));

    if (buffer.includes(0)) {
      continue;
    }

    for (const detector of scanContent(relativePath, buffer.toString("utf8"))) {
      findings.push({ detector, path: relativePath });
    }
  }

  return findings;
}

function run() {
  const findings = scanTrackedFiles();

  if (findings.length > 0) {
    console.error("추적 파일에서 커밋하면 안 되는 비밀값 후보를 발견했습니다.");

    for (const finding of findings) {
      console.error(`- ${finding.path}: ${finding.detector}`);
    }

    process.exitCode = 1;
    return;
  }

  console.log("PASS: 추적 파일에서 고신뢰 비밀값 패턴을 발견하지 못했습니다.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}
