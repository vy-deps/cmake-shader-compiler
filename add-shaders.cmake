set(csc_generate_dir ${CMAKE_CURRENT_LIST_DIR})

find_program(csc_nodejs_executable
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

macro(add_gl_shaders project src_dir)
  file(GLOB_RECURSE gl_shader_files_in ${src_dir}/*.frag ${src_dir}/*.vert)
  set(gl_shader_files_out ${src_dir}/shaders.hpp ${src_dir}/shaders.cpp)
  message("add_gl_shaders(${project} ${src_dir})")
  message("  in:  ${gl_shader_files_in}")
  message("  out: ${gl_shader_files_out}")
  add_custom_command(
    COMMAND ${csc_nodejs_executable}
    ARGS
      ${csc_generate_dir}/gen-spirv.js
      gl
      ${src_dir}
      ${gl_shader_files_in}
    OUTPUT ${gl_shader_files_out}
    DEPENDS
      ${csc_generate_dir}/gen-spirv.js
      ${csc_generate_dir}/helpers.js
      ${gl_shader_files_in})
  target_sources(${project} PRIVATE ${gl_shader_files_out})
endmacro()

macro(add_vk_shaders project src_dir)
  file(GLOB_RECURSE vk_shader_files_in ${src_dir}/*.frag ${src_dir}/*.vert)
  set(vk_shader_files_out ${src_dir}/shaders.hpp ${src_dir}/shaders.cpp)
  message("add_vk_shaders(${project} ${src_dir})")
  message("  in:  ${vk_shader_files_in}")
  message("  out: ${vk_shader_files_out}")
  add_custom_command(
    COMMAND ${csc_nodejs_executable}
    ARGS
      ${csc_generate_dir}/gen-spirv.js
      Vulkan
      ${src_dir}
      ${vk_shader_files_in}
    OUTPUT ${vk_shader_files_out}
    DEPENDS
      ${csc_generate_dir}/gen-spirv.js
      ${csc_generate_dir}/helpers.js
      ${vk_shader_files_in})
  target_sources(${project} PRIVATE ${vk_shader_files_out})
endmacro()

macro(add_dx_shaders project src_dir version)
  file(GLOB_RECURSE dx_shader_files_in ${src_dir}/*.hlsl)
  set(dx_shader_files_out ${src_dir}/shaders.hpp ${src_dir}/shaders.cpp)
  message("add_dx_shaders(${project} ${src_dir})")
  message("  in:  ${dx_shader_files_in}")
  message("  out: ${dx_shader_files_out}")
  add_custom_command(
    COMMAND ${csc_nodejs_executable}
    ARGS
      ${csc_generate_dir}/gen-hlsl.js
      ${version}
      ${src_dir}
      ${dx_shader_files_in}
    OUTPUT ${dx_shader_files_out}
    DEPENDS
      ${csc_generate_dir}/gen-hlsl.js
      ${csc_generate_dir}/helpers.js
      ${dx_shader_files_in})
  target_sources(${project} PRIVATE ${dx_shader_files_out})
endmacro()
