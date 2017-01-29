
/* Written by Nick Beukema */

var gl;
var sizeInput, outMessage;
/* TODO: Add more variable declarations here */

function main() {
  let canvas = document.getElementById("gl-canvas");
  gl = WebGLUtils.setupWebGL (canvas, null);
  let button = document.getElementById("gen");
  sizeInput = document.getElementById("size");
  outMessage = document.getElementById("msg");
  button.addEventListener("click", buttonClicked);
  ShaderUtils.loadFromFile(gl, "vshader.glsl", "fshader.glsl")
  .then (prog => {
    gl.useProgram(prog);

    /* TODO: Add more code here */
    render();
  });
}

function drawScene() {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.viewport(0, 0, 512, 512);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  /* TODO: Add more code here */
}

function render() {
  drawScene();
  requestAnimationFrame(render);
}

function buttonClicked() {
  let sz = sizeInput.valueAsNumber;
  if (!sz) {
    outMessage.innerHTML = "Must set size in the input box";
  } else {
    outMessage.innerHTML = "I have to generate a maze of size " + sz + "x" + sz;
  }

  /* TODO: Add more code here */
}

/* TODO: You may add more functions as needed */
