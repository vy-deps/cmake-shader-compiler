const {
  mainWrapper,
  tmpFile,
  spawnChildProcess,
  readAsCppBytesArray,
  writeFileStr,
  filenameToIdentifier,
  withLimitNumCpu,
} = require("./helpers");
const path = require("path");

const spvColumns = 16;
const spvIndent = 2;
const glslang = path.join(__dirname, resolveGlslangName());

function resolveGlslangName() {
  if (process.platform === "win32") {
    return "glslangValidator.exe";
  } else if (process.platform === "linux") {
    return "glslangValidator";
  } else {
    throw new Error("not implemented for non win32/linux system");
  }
}

function formatSpv(spv) {
  const lines = [];
  for (let i = 0; i < spv.length; i++) {
    const lineIdx = Math.floor(i / spvColumns);
    if (lines.length == lineIdx) {
      lines.push("");
    }
    lines[lineIdx] += spv[i] + ", ";
  }
  const indent = Array(spvIndent).fill(" ").join("");
  return lines.map((x) => indent + x.trim()).join("\n");
}

const sprvs = [];

async function genSpirv(inputPath) {
  const identifier = filenameToIdentifier(inputPath);
  const tmpOutput = tmpFile(".spv");
  await spawnChildProcess(glslang, ["-g", "-G", inputPath, "-o", tmpOutput]);
  const sprv = await readAsCppBytesArray(tmpOutput);
  sprvs.push({ identifier, sprv });
  console.log(`spirv: ${inputPath} -> ${identifier}`);
}

async function writeSpirv(dir) {
  const shaders = [];
  for (const { identifier, sprv } of sprvs) {
    const spirvFormatted = formatSpv(sprv);
    shaders.push({
      header: `  extern std::array<uint8_t, ${sprv.length}> g_${identifier};`,
      impl: `std::array<uint8_t, ${sprv.length}> shaders::g_${identifier}{
${spirvFormatted}
};`,
    });
  }
  await writeFileStr(
    path.join(dir, "shaders.hpp"),
    `#pragma once
#include <array>
#include <cstdint>

namespace shaders {
${shaders.map(({ header }) => header).join("\n")}
} // namespace shaders
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
  const dir = args[0];
  const files = args.slice(1);

  await withLimitNumCpu(files.map((file) => () => genSpirv(file)));
  await writeSpirv(dir);

  // for (const file of args) {
  //   await genSpirv(file);
  // }
});
