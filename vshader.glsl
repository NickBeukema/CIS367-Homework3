attribute vec2 vertexPos; // each incoming vertex is(x,y)
void main() {
  gl_Position = vec4 (vertexPos, 0.0, 1.0);
}
