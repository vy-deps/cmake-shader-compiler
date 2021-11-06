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

const spvColumns = 16;
const spvIndent = 2;
const glslang = resolveVulkanTool({ name: "glslangValidator" });
const spirvCross = resolveVulkanTool({ name: "spirv-cross", isOptional: true });

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
  if (spirvCross) {
    const reflectTmpOut = tmpFile(".json");
    const spirvCrossOut = await spawnChildProcess(spirvCross, [
      tmpOutput,
      "--reflect",
      "--output",
      reflectTmpOut,
    ]);
    for (const line of spirvCrossOut) {
      process.stdout.write(`[spirvCross] ${line}`);
    }
    const data = await readAsJson(reflectTmpOut, "utf-8");
    console.log(`tmp file contents: %s`, JSON.stringify(data, null, 2));
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
      header: `  extern uint8_t g_${identifier}[ ${sprv.length} ];`,
      impl: `uint8_t shaders::g_${identifier}[  ${sprv.length} ] = {
${spirvFormatted}
};`,
    });
  }
  await writeFileStr(
    path.join(dir, "shaders.hpp"),
    `#pragma once
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
  //   await genSpirv(file, type);
  // }
});
