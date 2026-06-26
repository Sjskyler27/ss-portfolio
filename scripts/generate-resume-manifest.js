const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const resumeDir = path.join(rootDir, "public", "resume");
const outputPath = path.join(rootDir, "src", "data", "resume-files.json");

function getResumeFiles() {
  if (!fs.existsSync(resumeDir)) {
    return [];
  }

  return fs
    .readdirSync(resumeDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
    .map((entry) => {
      const extension = path.extname(entry.name).replace(/^\./, "");
      const stem = path.basename(entry.name, path.extname(entry.name));

      return {
        name: entry.name,
        stem,
        extension,
        path: `/resume/${encodeURIComponent(entry.name)}`,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

fs.writeFileSync(outputPath, `${JSON.stringify(getResumeFiles(), null, 2)}\n`);
