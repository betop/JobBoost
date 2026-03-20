import { promises as fs } from "node:fs";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { minify as minifyJs } from "terser";
import { minify as minifyHtml } from "html-minifier-terser";
import CleanCSS from "clean-css";
import archiver from "archiver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const buildRoot = path.join(root, "build");
const distRoot = path.join(buildRoot, "extensions");
const zipRoot = path.join(buildRoot, "zips");
const targets = ["swiftcv", "mail-traige"];

const textExts = new Set([".js", ".mjs", ".cjs", ".html", ".css", ".json"]);

function normalizeFilePath(filePath) {
  return filePath.split(path.sep).join("/");
}

async function ensureCleanDir(dirPath) {
  await fs.rm(dirPath, { recursive: true, force: true });
  await fs.mkdir(dirPath, { recursive: true });
}

async function readDirRecursive(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const nested = await readDirRecursive(fullPath);
      files.push(...nested);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function minifyContent(filePath, content) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".js" || ext === ".mjs" || ext === ".cjs") {
    const result = await minifyJs(content, {
      compress: true,
      mangle: true,
      format: { comments: false },
    });
    return result.code ?? content;
  }

  if (ext === ".html") {
    return minifyHtml(content, {
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
      minifyCSS: true,
      minifyJS: true,
    });
  }

  if (ext === ".css") {
    const out = new CleanCSS({ level: 2 }).minify(content);
    if (out.errors?.length) throw new Error(out.errors.join("; "));
    return out.styles || content;
  }

  if (ext === ".json") {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed);
  }

  return content;
}

async function buildTarget(targetName) {
  const sourceDir = path.join(root, targetName);
  const targetDir = path.join(distRoot, targetName);

  await ensureCleanDir(targetDir);
  const files = await readDirRecursive(sourceDir);

  for (const file of files) {
    const rel = path.relative(sourceDir, file);
    const output = path.join(targetDir, rel);
    await fs.mkdir(path.dirname(output), { recursive: true });

    const ext = path.extname(file).toLowerCase();
    const relUnix = normalizeFilePath(rel);

    const shouldMinify = textExts.has(ext) && !relUnix.endsWith(".min.js");

    if (!shouldMinify) {
      await fs.copyFile(file, output);
      continue;
    }

    const raw = await fs.readFile(file, "utf8");

    try {
      const minified = await minifyContent(file, raw);
      await fs.writeFile(output, minified, "utf8");
    } catch (error) {
      console.warn(`[warn] Minify failed for ${targetName}/${relUnix}. Copying original.`, error.message);
      await fs.writeFile(output, raw, "utf8");
    }
  }

  console.log(`[ok] Built ${targetName} -> ${path.relative(root, targetDir)}`);
}

async function zipTarget(targetName) {
  const sourceDir = path.join(distRoot, targetName);
  const zipPath = path.join(zipRoot, `${targetName}.zip`);

  await fs.mkdir(zipRoot, { recursive: true });

  await new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });

  console.log(`[ok] Zipped ${targetName} -> ${path.relative(root, zipPath)}`);
}

async function main() {
  await fs.rm(buildRoot, { recursive: true, force: true });
  await fs.mkdir(distRoot, { recursive: true });

  for (const target of targets) {
    await buildTarget(target);
    await zipTarget(target);
  }

  console.log("[done] Minified extension builds are ready in ./build/extensions and zip packages in ./build/zips");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
