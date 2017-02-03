/* Written by Nick Beukema */
precision mediump float;

// varying from rasterizer
varying vec4 vColor;

void main() {
  gl_FragColor = vColor;
}
