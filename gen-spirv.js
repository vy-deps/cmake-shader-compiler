const {
  mainWrapper,
  tmpFile,
  spawnChildProcess,
  readAsCppBytesArray,
  readAsJson,
  resolveTool,
  filenameToIdentifier,
  withLimitNumCpu,
  writeShaders,
} = require("./helpers");

const glslang = resolveTool({ name: "glslangValidator" });
const spirvCross = resolveTool({ name: "spirv-cross", isOptional: true });

const shaderTypes = {
  Vulkan: {
    arg: "-V",
    name: "vk",
  },
  OpenGL: {
    arg: "-G",
    name: "gl",
  },
};

const shaders = [];

async function genSpirv(inputPath, type) {
  const identifier = filenameToIdentifier(inputPath);
  const tmpOutput = tmpFile(".spv");
  await spawnChildProcess(glslang, [
    "-g",
    shaderTypes[type].arg,
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
  const bytes = await readAsCppBytesArray(tmpOutput);
  shaders.push({ identifier, bytes });
  console.log(`spirv: ${inputPath} -> ${identifier}`);
}

mainWrapper(async (args) => {
  const type = args[0];
  const dir = args[1];
  const files = args.slice(2);

  if (!Object.keys(shaderTypes).includes(type)) {
    throw new Error(`unknown shader type ${type}`);
  }

  await withLimitNumCpu(files.map((file) => () => genSpirv(file, type)));
  await writeShaders(shaders, dir, shaderTypes[type].name);
});
