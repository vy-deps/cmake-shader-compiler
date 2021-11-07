const {
  mainWrapper,
  tmpFile,
  spawnChildProcess,
  resolveTool,
  writeFileStr,
  filenameToIdentifier,
  withLimitNumCpu,
  readAsText,
  runCPreprocessor,
} = require("./helpers");
const path = require("path");

const fxc = resolveTool({ name: "fxc" });
const dxc = resolveTool({ name: "dxc" });

function formatCso(cso) {
  const startIndex = cso.indexOf("{") + 2;
  const lastIndex = cso.lastIndexOf("}") - 1;
  return cso.substring(startIndex, lastIndex);
}

const csos = [];

async function compileNew(tmpOutput, inputPath, type) {
  console.log("compiling with dxc");
  await spawnChildProcess(dxc, [
    "-Od", // Disable optimizations
    "-Zi", // Enable debug information
    "-Ges", // Enable strict mode
    "-WX", // Treat warnings as errors
    inputPath,
    "-T",
    type,
    "-Fh",
    tmpOutput,
  ]);
}

async function compileOld(tmpOutput, inputPath, type) {
  console.log("compiling with fxc");
  await spawnChildProcess(fxc, [
    "/Od", // Disable optimizations
    "/Zi", // Enable debug information
    "/Ges", // Enable strict mode
    "/WX", // Treat warnings as errors
    inputPath,
    "/T",
    type,
    "/Fh",
    tmpOutput,
  ]);
}

async function genCso(inputPath, version) {
  const splitPath = inputPath.split(".");

  if (splitPath.length < 3 || splitPath[splitPath.length - 1] != "hlsl") {
    throw new Error(
      `invalid path '${inputPath}'. should be like 'some-shader.vs.hlsl'`
    );
  }

  const type =
    splitPath[splitPath.length - 2] + "_" + version.replace(".", "_");

  const tmpOutput = tmpFile(".cso");

  if (+version > 5.5) {
    await compileNew(tmpOutput, inputPath, type);
  } else {
    await compileOld(tmpOutput, inputPath, type);
  }

  const cso = await runCPreprocessor(await readAsText(tmpOutput));
  const identifier = filenameToIdentifier(
    inputPath.substr(0, inputPath.lastIndexOf("."))
  );
  csos.push({ identifier, cso });
  console.log(`cso: ${inputPath} -> ${identifier}`);
}

async function writeCso(dir) {
  const shaders = [];
  for (const { identifier, cso } of csos) {
    const formatted = formatCso(cso);
    const size = formatted
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x.length).length;
    shaders.push({
      header: `  extern uint8_t g_${identifier}[ ${size} ];`,
      impl: `uint8_t shaders::dx::g_${identifier}[ ${size} ] = {
${formatted}
};`,
    });
  }
  await writeFileStr(
    path.join(dir, "shaders.hpp"),
    `#pragma once
#include <cstdint>

namespace shaders::dx {
${shaders.map(({ header }) => header).join("\n")}
} // namespace shaders::dx
`
  );
  await writeFileStr(
    path.join(dir, "shaders.cpp"),
    `#include \"shaders.hpp\"

${shaders.map(({ impl }) => impl).join("\n\n")}
`
  );
}

mainWrapper(async (args) => {
  const version = args[0];
  const dir = args[1];
  const files = args.slice(2);

  await withLimitNumCpu(files.map((file) => () => genCso(file, version)));
  await writeCso(dir);

  // for (const file of args) {
  //   await genSpirv(file, version);
  // }
});
