# cmake-shader-compiler

CMake stuff to generate glsl/hlsl object files for shaders and embed them into shaders.cpp/hpp files.

**Not ready for production**, but you can fork it and have fun tuning it for your purposes!

## Requirements

Scripts require [nodejs](https://nodejs.org/en/download/) to be installed.  

## Usage

Add these lines to your **CMakeLists.txt** to fetch latest version of **cmake-shader-compiler**:

```cmake
include(FetchContent)

FetchContent_Declare(cmake-shader-compiler
  GIT_REPOSITORY https://github.com/vy-deps/cmake-shader-compiler.git
  GIT_TAG master)
FetchContent_GetProperties(cmake-shader-compiler)

if(NOT cmake-shader-compiler_POPULATED)
  FetchContent_Populate(cmake-shader-compiler)
  include(${cmake-shader-compiler_SOURCE_DIR}/add-shaders.cmake)
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
