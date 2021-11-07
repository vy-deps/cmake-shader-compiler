const {
  mainWrapper,
  tmpFile,
  spawnChildProcess,
  resolveTool,
  filenameToIdentifier,
  withLimitNumCpu,
  writeShaders,
  readAsCppBytesArray,
} = require("./helpers");

const fxc = resolveTool({ name: "fxc" });
const dxc = resolveTool({ name: "dxc" });

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
    "-Fo",
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
    "/Fo",
    tmpOutput,
  ]);
}

const shaders = [];

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

  const bytes = await readAsCppBytesArray(tmpOutput);
  const identifier = filenameToIdentifier(
    inputPath.substr(0, inputPath.lastIndexOf("."))
  );
  shaders.push({ identifier, bytes });
  console.log(`cso: ${inputPath} -> ${identifier}`);
}

mainWrapper(async (args) => {
  const version = args[0];
  const dir = args[1];
  const files = args.slice(2);

  await withLimitNumCpu(files.map((file) => () => genCso(file, version)));
  await writeShaders(shaders, dir, "dx");
});
