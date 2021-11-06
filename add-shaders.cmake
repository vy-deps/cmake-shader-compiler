set(VY_SCRIPTS_DIR ${CMAKE_CURRENT_LIST_DIR})

find_program(NODEJS_EXECUTABLE
  NAMES node nodejs
  HINTS $ENV{NODE_DIR}
  PATH_SUFFIXES bin
  DOC "Node.js interpreter"
  REQUIRED)

function(list_transform_add_ext var input extension)
  set(temp "")
  foreach(filepath ${${input}})
    list(APPEND temp "${filepath}${extension}")
  endforeach()
  set(${var} "${temp}" PARENT_SCOPE)
endfunction()

macro(add_opengl_shaders project src_dir)
  file(GLOB_RECURSE SHADER_FILES ${src_dir}/*.frag ${src_dir}/*.vert)
  set(SHADER_FILES_OUT ${src_dir}/shaders.hpp ${src_dir}/shaders.cpp)
  message("add_shaders(${SHADER_FILES}) -> ${SHADER_FILES_OUT}")
  add_custom_command(
    COMMAND ${NODEJS_EXECUTABLE}
    ARGS ${VY_SCRIPTS_DIR}/gen-spirv.js OpenGL ${src_dir} ${SHADER_FILES}
    OUTPUT ${SHADER_FILES_OUT}
    DEPENDS ${VY_SCRIPTS_DIR}/gen-spirv.js ${SHADER_FILES})
  target_sources(${project} PRIVATE ${SHADER_FILES_OUT})
endmacro()

macro(add_vulkan_shaders project src_dir)
  file(GLOB_RECURSE SHADER_FILES ${src_dir}/*.frag ${src_dir}/*.vert)
  set(SHADER_FILES_OUT ${src_dir}/shaders.hpp ${src_dir}/shaders.cpp)
  message("add_shaders(${SHADER_FILES}) -> ${SHADER_FILES_OUT}")
  add_custom_command(
    COMMAND ${NODEJS_EXECUTABLE}
    ARGS ${VY_SCRIPTS_DIR}/gen-spirv.js Vulkan ${src_dir} ${SHADER_FILES}
    OUTPUT ${SHADER_FILES_OUT}
    DEPENDS ${VY_SCRIPTS_DIR}/gen-spirv.js ${SHADER_FILES})
  target_sources(${project} PRIVATE ${SHADER_FILES_OUT})
endmacro()
