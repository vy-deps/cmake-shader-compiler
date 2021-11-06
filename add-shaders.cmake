set(spirv_generate_dir ${CMAKE_CURRENT_LIST_DIR})

find_program(spirv_nodejs_executable
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
  file(GLOB_RECURSE opengl_shader_files_in
    ${src_dir}/*.frag
    ${src_dir}/*.vert)
  set(opengl_shader_files_out
    ${src_dir}/shaders.hpp
    ${src_dir}/shaders.cpp)
  message("add_opengl_shaders(${project} ${src_dir})")
  message("  in:  ${opengl_shader_files_in}")
  message("  out: ${opengl_shader_files_out}")
  add_custom_command(
    COMMAND ${spirv_nodejs_executable}
    ARGS
      ${spirv_generate_dir}/gen-spirv.js
      OpenGL
      ${src_dir}
      ${opengl_shader_files_in}
    OUTPUT ${opengl_shader_files_out}
    DEPENDS
      ${spirv_generate_dir}/gen-spirv.js
      ${opengl_shader_files_in})
  target_sources(${project} PRIVATE ${opengl_shader_files_out})
endmacro()

macro(add_vulkan_shaders project src_dir)
  file(GLOB_RECURSE vulkan_shader_files_in
    ${src_dir}/*.frag
    ${src_dir}/*.vert)
  set(vulkan_shader_files_out
    ${src_dir}/shaders.hpp
    ${src_dir}/shaders.cpp)
  message("add_opengl_shaders(${project} ${src_dir})")
  message("  in:  ${vulkan_shader_files_in}")
  message("  out: ${vulkan_shader_files_out}")
  add_custom_command(
    COMMAND ${spirv_nodejs_executable}
    ARGS
      ${spirv_generate_dir}/gen-spirv.js
      Vulkan
      ${src_dir}
      ${vulkan_shader_files_in}
    OUTPUT ${vulkan_shader_files_out}
    DEPENDS
      ${spirv_generate_dir}/gen-spirv.js
      ${vulkan_shader_files_in})
  target_sources(${project} PRIVATE ${vulkan_shader_files_out})
endmacro()
