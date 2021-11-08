# spirv-generate

CMake stuff to generate glsl/hlsl object files for shaders and embed them into shaders.cpp/hpp files.

**Not ready for production**, but you can fork it and have fun tuning it for your purposes!

## Requirements

Scripts require [nodejs](https://nodejs.org/en/download/) and [vulkan sdk](https://vulkan.lunarg.com/) to be installed.  

## Usage

Add these lines to your **CMakeLists.txt** to fetch latest version of **spirv-generate**:

```cmake
include(FetchContent)

FetchContent_Declare(deps-spirv-generate
  GIT_REPOSITORY https://github.com/cprkv/spirv-generate.git
  GIT_TAG master)
FetchContent_GetProperties(deps-spirv-generate)

if(NOT deps-spirv-generate_POPULATED)
  FetchContent_Populate(deps-spirv-generate)
  include(${deps-spirv-generate_SOURCE_DIR}/add-shaders.cmake)
endif()
```

And then, use macro `add_gl/vk/dx_shaders` to make shaders build:

```cmake
add_gl_shaders(${PROJECT_NAME} ${CMAKE_CURRENT_SOURCE_DIR}/gl-shaders)
add_vk_shaders(${PROJECT_NAME} ${CMAKE_CURRENT_SOURCE_DIR}/vk-shaders)
add_dx_shaders(${PROJECT_NAME} ${CMAKE_CURRENT_SOURCE_DIR}/dx-shaders)
```

That's it!

Now at build stage 2 files generated in **each** directory `gl-shaders`/`vk-shaders`/`dx-shaders`:

```
shaders.cpp
shaders.hpp
```

Don't add it to cmake project sources, because macro `add_gl/vk/dx_shaders` already does that.
Just include `shaders.hpp` in any file which needs shaders binary code, and use it!
Also you might want to add these cpp/hpp files to your git ignore file.

## Thirdparty

Scripts doesn't depend on any thirdparty module for manual installation.

Everything it needs already included in this repo.

There is file `plimit.js` which contains 2 node packages contents:

- [p-limit](https://www.npmjs.com/package/p-limit): licensed under MIT license, author: Sindre Sorhus
- [yocto-queue](https://www.npmjs.com/package/yocto-queue): licensed under MIT license, author: Sindre Sorhus
- [cpp.js](https://github.com/acgessler/cpp.js/): licensed under custom licensem, author: Alexander Christoph Gessler