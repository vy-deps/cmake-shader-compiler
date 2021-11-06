const fs = require("fs");
const fsp = fs.promises;
const os = require("os");
const path = require("path");
const childProcess = require("child_process");
const { pLimit } = require("./plimit");

const cleanupFiles = [];

function cleanup() {
  for (const file of cleanupFiles) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }
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
        reject(new Error(`process ${exe} exited with code ${code}\noutput was: ${output.join('\n')}`));
      } else {
        // console.log(`process ${exe} exit ok!`);
        resolve(output);
      }
    });
  });

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

async function withLimitNumCpu(jobs) {
  const limit = pLimit(os.cpus().length);
  const promises = jobs.map(job => limit(job));
  await Promise.all(promises);
}

module.exports = {
  cleanup,
  tmpFile,
  spawnChildProcess,
  mainWrapper,
  readAsCppBytesArray,
  writeFileStr,
  filenameToIdentifier,
  withLimitNumCpu,
};
