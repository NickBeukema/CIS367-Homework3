
/* Written by Nick Beukema */

var gl;
var sizeInput, outMessage;
let mazeWidth = 512.0;
let mazeHeight = 512.0;
let prog;

function main() {
  let canvas = document.getElementById("gl-canvas");
  gl = WebGLUtils.setupWebGL (canvas, null);
  let button = document.getElementById("gen");
  sizeInput = document.getElementById("size");
  outMessage = document.getElementById("msg");
  button.addEventListener("click", buttonClicked);
  ShaderUtils.loadFromFile(gl, "vshader.glsl", "fshader.glsl")
  .then (program => {
    gl.useProgram(program);
    prog = program;

    render(10,10, prog);
  });

}

function drawScene(x,y,prog) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.viewport(0, 0, 512, 512);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  let maze = generateMaze(x,y);

  let [start, finish] = getEndPoints(maze);
  let solution = [];




  solveMaze(maze, start, finish, solution);



  displayMaze(maze, start, finish, solution, prog);
}

function getEndPoints(maze) {
  let randomStart = [0, Math.floor(Math.random() * maze[0].length)];
  let randomEnd = [maze.length-1, Math.floor(Math.random() * maze.length-1)];

  return [randomStart, randomEnd];
}


function render(x,y,prog) {
  drawScene(x,y,prog);
  //requestAnimationFrame(render);
}

function buttonClicked() {
  let sz = sizeInput.valueAsNumber;
  if (!sz) {
    outMessage.innerHTML = "Must set size in the input box";
  } else {
    outMessage.innerHTML = "I have to generate a maze of size " + sz + "x" + sz;
    render(sz,sz,prog);
  }

}

function generateMaze(x, y) {
  let totalSquares = x * y;
  let mazeArray = [];
  let visted = [];

  for(let i=0; i<x; i++) {
    mazeArray.push([]);
    visted.push([]);
    for(let j=0; j<y; j++) {
      mazeArray[i].push([1,1,1,1]); // Top, right, bottom, left
      visted[i].push(false);
    }
  }

  let current = [Math.floor(Math.random()*x), Math.floor(Math.random()*y)];
  let path = [current];

  visted[current[0]][current[1]] = true;

  generateSquare(mazeArray, current, path, visted, 1);
  return mazeArray;
}

const TOP = 0;
const RIGHT = 1;
const BOTTOM = 2;
const LEFT = 3;

function findNeighbors(position, mazeArray, visited) {
  // [x, y, current wall index, neighbor wall index ]
  return [
    [position[0],     position[1] - 1, TOP,    BOTTOM], // Above
    [position[0] + 1, position[1],     RIGHT,  LEFT  ], // Right
    [position[0],     position[1] + 1, BOTTOM, TOP   ], // Below
    [position[0] - 1, position[1],     LEFT,   RIGHT ], // Left
  ].filter((arr) => {
    let isInBounds = arr[0] > -1 && arr[1] > -1 && arr[0] < mazeArray.length && arr[1] < mazeArray[0].length;
    if(!isInBounds) { return false; }

    let isVisited = visited[arr[0]][arr[1]];
    return !isVisited;
  });
}

function generateSquare(mazeArray, current, path, visited, depth) {
  let neighbors = findNeighbors(current, mazeArray, visited);
  if(neighbors.length === 0) { return -1; }

  let chosen = neighbors[Math.floor(Math.random() * neighbors.length)];

  // Set the current space and the chosen space's
  // corresponding borders to 0
  mazeArray[current[0]][current[1]][chosen[2]] = 0;
  mazeArray[chosen[0]][chosen[1]][chosen[3]] = 0;

  // Add chosen to path
  path.push([chosen[0], chosen[1]]);
  visited[chosen[0]][chosen[1]] = true;

  generateSquare(mazeArray, [chosen[0], chosen[1]], path, visited, depth + 1);

  if(path.length === 1) {
    return 1;
  } else {
    path.pop();
    backpropagate(mazeArray, current, path, visited, depth);
  }
}

function backpropagate(mazeArray, position, path, visited, depth) {
  if(path.length === 1) { return 1; }

  let neighbors = findNeighbors(position, mazeArray, visited);
  if(neighbors.length === 0) {
    let backwardPosition = path.pop();
    backpropagate(mazeArray, backwardPosition, path, visited, depth - 1);
  } else {
    generateSquare(mazeArray, position, path, visited, depth);
  }
}

function displayMaze(maze, start, finish, solution, prog) {
  let x = maze.length;
  let y = maze[0].length;

  let XPercentPerCell = ((mazeWidth / x) / mazeWidth ) * 2;
  let YPercentPerCell = ((mazeHeight / y) / mazeHeight ) * 2;

  let percentPerCell = [XPercentPerCell, YPercentPerCell];


  drawMazeLines(maze, percentPerCell, prog);
  drawStartAndFinish(maze, percentPerCell, start, finish, prog);
}

function drawStartAndFinish(maze, percentPerCell, start, finish, prog) {
  let halfCell = [percentPerCell[0] / 2, percentPerCell[1] / 2];
  let startCenter = [((start[0] * percentPerCell[0]) + halfCell[0]) - 1, ((start[1] * percentPerCell[0]) + halfCell[0]) - 1];
  let endCenter = [((finish[0] * percentPerCell[1]) + halfCell[1]) - 1, ((finish[1] * percentPerCell[1]) + halfCell[1]) - 1];


  let point1 = [startCenter[0] - (halfCell[0]/2), startCenter[1] - (halfCell[0]/2)];
  let point2 = [endCenter[0] - (halfCell[1]/2), endCenter[1] - (halfCell[1]/2)];

  let verticies = [...startCenter, ...point1, ...endCenter, ...point2];


  let length = (verticies.length/2);
  let vertexBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuff);

  // copy the verticies data
  gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(verticies), gl.STATIC_DRAW);

  let posAttr = gl.getAttribLocation(prog, "vertexPos");
  gl.enableVertexAttribArray(posAttr);
  gl.vertexAttribPointer(posAttr,
      2,         /* number of components per attribute, in our case (x,y) */
      gl.FLOAT,  /* type of each attribute */
      false,     /* does not require normalization */
      0,         /* stride: number of bytes between the beginning of consecutive attributes */
      0);        /* the offset (in bytes) to the first component in the attribute array */
  gl.drawArrays(gl.LINES,
      0,  /* starting index in the array */
      length
  );


}

function drawMazeLines(maze, percentPerCell, prog) {
  let verticies = [];

  for(let i=0; i<maze.length; i++) {
    for(let j=0; j<maze[0].length; j++) {
      let cell = maze[i][j];
      verticies.push(...generateCell(i, j, cell, percentPerCell));
    }
  }

  let length = (verticies.length/2);
  let vertexBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuff);

  // copy the verticies data
  gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(verticies), gl.STATIC_DRAW);

  let posAttr = gl.getAttribLocation(prog, "vertexPos");
  gl.enableVertexAttribArray(posAttr);
  gl.vertexAttribPointer(posAttr,
      2,         /* number of components per attribute, in our case (x,y) */
      gl.FLOAT,  /* type of each attribute */
      false,     /* does not require normalization */
      0,         /* stride: number of bytes between the beginning of consecutive attributes */
      0);        /* the offset (in bytes) to the first component in the attribute array */
  gl.drawArrays(gl.LINES,
      0,  /* starting index in the array */
      length
  );
}

function getVertexPositions(x, y, percentPerCell) {
  let topLeft = [(x * percentPerCell[0]) - 1, (y * percentPerCell[1]) - 1];
  let topRight = [((x + 1) * percentPerCell[0]) - 1, (y * percentPerCell[1]) - 1];
  let bottomRight = [((x + 1) * percentPerCell[0]) - 1, ((y + 1) * percentPerCell[1]) - 1];
  let bottomLeft = [(x * percentPerCell[0]) - 1, ((y + 1) * percentPerCell[1]) - 1];

  return [
    [...topLeft, ...topRight],
    [...topRight, ...bottomRight],
    [...bottomRight, ...bottomLeft],
    [...bottomLeft, ...topLeft],
  ];
}

function generateCell(x, y, cell, percentPerCell) {
  let verticiesToDraw = [];

  let positions = getVertexPositions(x,y,percentPerCell);


  for(let i=0; i<4; i++) {
    if(cell[i] === 1) {
      verticiesToDraw.push(...positions[i]);
    }
  }

  return verticiesToDraw;
}

function solveMaze(maze, start, finish, solution) {



  return solution;
}
