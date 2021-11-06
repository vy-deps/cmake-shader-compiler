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
const fs = require("fs");

const spvColumns = 16;
const spvIndent = 2;
const glslang = path.join(resolveBinPath(), resolveGlslangName());
const linter = resolveLinter();

function resolveBinPath() {
  if (process.env.VULKAN_SDK) {
    const vulkanSDKPath = process.env.VULKAN_SDK;
    if (fs.existsSync(vulkanSDKPath)) {
      return vulkanSDKPath;
    }
  }
  return __dirname;
}

function resolveGlslangName() {
  if (process.platform === "win32") {
    return "glslangValidator.exe";
  } else if (process.platform === "linux") {
    return "glslangValidator";
  } else {
    throw new Error("not implemented for non win32/linux system");
  }
}

function resolveLinter() {
  const tryPaths = [
    path.join(resolveBinPath(), "spirv-lint"),
    path.join(resolveBinPath(), "spirv-lint.exe"),
  ];
  for (const p of tryPaths) {
    if (fs.existsSync(p)) {
      console.log(`found linter ${p}`);
      return p;
    }
  }
  return null;
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

async function genSpirv(inputPath, type) {
  let shaderTypeArg;
  if (type === "Vulkan") {
    shaderTypeArg = "-V";
  } else if (type === "OpenGL") {
    shaderTypeArg = "-G";
  } else {
    throw new Error(`unknown shader type ${type}`);
  }
  const identifier = filenameToIdentifier(inputPath);
  const tmpOutput = tmpFile(".spv");
  await spawnChildProcess(glslang, [
    "-g",
    shaderTypeArg,
    inputPath,
    "-o",
    tmpOutput,
  ]);
  if (linter) {
    const lintOut = await spawnChildProcess(linter, [tmpOutput]);
    for (const line of lintOut) {
      process.stdout.write(`[linter] ${line}`);
    }
  }
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
  const type = args[0];
  const dir = args[1];
  const files = args.slice(2);

  await withLimitNumCpu(files.map((file) => () => genSpirv(file, type)));
  await writeSpirv(dir);

  // for (const file of args) {
  //   await genSpirv(file);
  // }
});
