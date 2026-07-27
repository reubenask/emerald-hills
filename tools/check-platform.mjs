import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../platform.html", import.meta.url), "utf8");
const failures = [];

const inlineScripts = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter((script) => script.trim());

inlineScripts.forEach((script, index) => {
  try {
    new vm.Script(script, { filename: `platform-inline-${index + 1}.js` });
  } catch (error) {
    failures.push(`Inline script ${index + 1} does not parse: ${error.message}`);
  }
});

const unsafeBlankLinks = [...source.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/gi)]
  .map((match) => match[0])
  .filter((tag) => !/\brel=["'][^"']*\bnoopener\b[^"']*["']/i.test(tag));

if (unsafeBlankLinks.length) {
  failures.push(`${unsafeBlankLinks.length} target="_blank" link(s) are missing rel="noopener".`);
}

const requiredPatterns = [
  ["safe storage reads", /function safeStorageRead\(/],
  ["safe storage writes", /function safeStorageWrite\(/],
  ["admin backup export", /function exportOperationalBackup\(/],
  ["admin backup restore", /function importOperationalBackup\(/],
  ["exam iframe source validation", /event\.source !== examFrame\.contentWindow/],
  ["exam origin validation", /event\.origin !== window\.location\.origin/],
  ["safe resource URL validation", /function safeResourceUrl\(/],
  ["local upload size limit", /const maxLocalUploadBytes = 1_500_000/],
  ["new-account password minimum", /String\(account\.password\)\.length < 8/],
  ["avatar resource validation", /safeResourceUrl\(photo, true\)/],
  ["level-wide guest registration", /publicGuestRegistry\.level === publicGuestLevel/]
];

requiredPatterns.forEach(([label, pattern]) => {
  if (!pattern.test(source)) failures.push(`Missing ${label}.`);
});

if (/JSON\.parse\(localStorage\.getItem\(/.test(source)) {
  failures.push("Direct JSON.parse(localStorage.getItem(...)) remains outside the safe storage layer.");
}

if (/publicGuestRegistry\.section === publicGuestSection/.test(source)) {
  failures.push("Guest registration is incorrectly scoped to one entrance-exam section.");
}

if (/function setPublicGuestSection\(section\)\s*{\s*publicGuestSection = section;\s*publicGuestRegistry = null;/.test(source)) {
  failures.push("Changing entrance-exam sections clears the applicant registry.");
}

if (failures.length) {
  console.error("Platform audit failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(`Platform audit passed: ${inlineScripts.length} inline script parsed; storage, iframe messaging, and blank-link checks passed.`);
