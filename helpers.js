const fs = require("fs");
const fsp = fs.promises;
const os = require("os");
const path = require("path");
const childProcess = require("child_process");
const { pLimit } = require("./deps/plimit");
const { cpp_js } = require("./deps/cpp");

const cleanupFiles = [];

function cleanup() {
  for (const file of cleanupFiles) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }
}

function formatBytes(bytes, codeColumns = 16, codeIndent = 2) {
  const lines = [];
  for (let i = 0; i < bytes.length; i++) {
    const lineIdx = Math.floor(i / codeColumns);
    if (lines.length == lineIdx) {
      lines.push("");
    }
    lines[lineIdx] += bytes[i] + ", ";
  }
  const indent = Array(codeIndent).fill(" ").join("");
  return lines.map((x) => indent + x.trim()).join("\n");
}

function resolveTool({ name, isOptional }) {
  const binName = process.platform == "win32" ? name + ".exe" : name;
  const toolsDirs = [path.join(__dirname, "bin")];

  if (process.env.VULKAN_SDK) {
    const vulkanBin = path.join(process.env.VULKAN_SDK, "Bin");
    if (fs.existsSync(vulkanBin)) {
      toolsDirs.push(vulkanBin);
    } else {
      console.warn(
        `VULKAN_SDK environment variable is set but not contains Bin path...`
      );
    }
  } else {
    console.warn(`VULKAN_SDK environment variable not set`);
  }

  for (const toolDir of toolsDirs) {
    const p = path.join(toolDir, binName);
    if (fs.existsSync(p)) {
      console.log(`found suitable tool ${p}`);
      return p;
    }
  }

  if (isOptional) {
    return null;
  }

  throw new Error(
    `vulkan tool ${name} not found! please install vulkan sdk or check environment variable VULKAN_SDK to be correct path!`
  );
}

function tmpFile(ext) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = now.getMonth();
  const dd = now.getDate();
  const rand = (Math.random() * 0x100000000 + 1).toString(36);
  const name = `${yyyy}${mm}${dd}-${process.pid}-${rand}${ext}`;
  const filepath = path.join(os.tmpdir(), name);
  cleanupFiles.push(filepath);
  return filepath;
}

const spawnChildProcess = (exe, args) =>
  new Promise((resolve, reject) => {
    // console.log(`spawning ${exe} ${args.join(" ")}`);
    const proc = childProcess.spawn(exe, args);
    proc.on("error", (err) => {
      reject(`failed to start subprocess: ${err}`);
    });
    const output = [];
    if (proc.stdout) {
      proc.stdout.on("data", (data) => output.push(data));
    }
    if (proc.stderr) {
      proc.stderr.on("data", (data) => output.push(data));
    }
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `process ${exe} exited with code ${code}\noutput was: ${output.join(
              "\n"
            )}`
          )
        );
      } else {
        // console.log(`process ${exe} exit ok!`);
        resolve(output);
      }
    });
  });

async function readAsText(filepath) {
  return fsp.readFile(filepath, "utf-8");
}

async function readAsCppBytesArray(filepath) {
  const buf = await fsp.readFile(filepath);
  const res = [];
  for (let i = 0; i < buf.length; i++) {
    res.push("0x" + buf.slice(i, i + 1).toString("hex"));
  }
  return res;
}

async function writeFileStr(filepath, str) {
  await fsp.writeFile(filepath, str, "utf-8");
}

async function readAsJson(filepath) {
  const buf = await fsp.readFile(filepath, "utf-8");
  return JSON.parse(buf);
}

function filenameToIdentifier(name) {
  const base = path.basename(name);
  return base.replace(/[^0-9a-zA-Z_]/g, "_");
}

function mainWrapper(func) {
  const args = process.argv.slice(2);
  func(args)
    .then(() => {
      cleanup();
      process.exit(0);
    })
    .catch((err) => {
      cleanup();
      console.error(err);
      process.exit(1);
    });
}

async function runCPreprocessor(source) {
  return new Promise((resolve, reject) => {
    const preprocessor = cpp_js({
      // signal string that starts a preprocessor command,
      // only honoured at the beginning of a line.
      signal_char: "#",

      // function used to print warnings, the default
      // implementation logs to the console.
      warn_func: null,

      // function used to print critical errors, the default
      // implementation logs to the console and throws.
      error_func: null,

      // function to be invoked to fetch include files.
      // See the section "Handling include files" below.
      include_func: (file, is_global, resumer, error) => {
        // `is_global` is `true` if the file name was enclosed
        // in < .. > rather than " .. ".
        resumer(""); // ignore all includes
      },

      // function used to strip comments from the input file.
      // The default implementation handles C and C++-style
      // comments and also removes line continuations.
      // Since this function is invoked on all files before
      // any preprocessing happens, it can be thought of as a
      // "preprocessor to the preprocessor".
      // comment_stripper: null,

      completion_func: resolve,
    });

    preprocessor.run(source);
  });
}

async function writeShaders(shaders, dir, type) {
  const definitions = [];

  for (const { identifier, bytes } of shaders) {
    const formatted = formatBytes(bytes);
    definitions.push({
      header: `  extern uint8_t g_${identifier}[ ${bytes.length} ];`,
      impl: `uint8_t shaders::${type}::g_${identifier}[ ${bytes.length} ] = {
${formatted}
};`,
    });
  }

  await writeFileStr(
    path.join(dir, "shaders.hpp"),
    `#pragma once
#include <cstdint>

namespace shaders::${type} {
${definitions.map(({ header }) => header).join("\n")}
} // namespace shaders::${type}
`
  );
  await writeFileStr(
    path.join(dir, "shaders.cpp"),
    `#include \"shaders.hpp\"

${definitions.map(({ impl }) => impl).join("\n\n")}
`
  );
}

async function withLimitNumCpu(jobs) {
  const limit = pLimit(os.cpus().length);
  const promises = jobs.map((job) => limit(job));
  await Promise.all(promises);
}

module.exports = {
  cleanup,
  tmpFile,
  resolveTool,
  spawnChildProcess,
  readAsCppBytesArray,
  readAsJson,
  readAsText,
  mainWrapper,
  writeFileStr,
  filenameToIdentifier,
  withLimitNumCpu,
  runCPreprocessor,
  writeShaders,
  formatBytes,
};
