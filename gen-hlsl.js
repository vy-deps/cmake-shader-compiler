const {
  mainWrapper,
  tmpFile,
  spawnChildProcess,
  readAsCppBytesArray,
  readAsJson,
  resolveVulkanTool,
  writeFileStr,
  filenameToIdentifier,
  withLimitNumCpu,
} = require("./helpers");
const path = require("path");

const csoColumns = 16;
const csoIndent = 2;
const dxc = resolveVulkanTool({ name: "dxc" });

function formatCso(cso) {
  const lines = [];
  for (let i = 0; i < cso.length; i++) {
    const lineIdx = Math.floor(i / csoColumns);
    if (lines.length == lineIdx) {
      lines.push("");
    }
    lines[lineIdx] += cso[i] + ", ";
  }
  const indent = Array(csoIndent).fill(" ").join("");
  return lines.map((x) => indent + x.trim()).join("\n");
}

const csos = [];

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
  await spawnChildProcess(dxc, [
    "-O0",
    inputPath,
    "-T",
    type,
    "-Fo",
    tmpOutput,
  ]);
  const cso = await readAsCppBytesArray(tmpOutput);
  const identifier = filenameToIdentifier(
    inputPath.substr(0, inputPath.lastIndexOf("."))
  );
  csos.push({ identifier, cso });
  console.log(`spirv: ${inputPath} -> ${identifier}`);
}

async function writeCso(dir) {
  const shaders = [];
  for (const { identifier, cso } of csos) {
    const formatted = formatCso(cso);
    shaders.push({
      header: `  extern uint8_t g_${identifier}[ ${cso.length} ];`,
      impl: `uint8_t shaders::dx::g_${identifier}[  ${cso.length} ] = {
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
