/* -----------------------
        Written by
       Nick Beukema

   WebGL Maze Generation

-------------------------- */

var gl;
var sizeInput, outMessage;
let mazeWidth;
let mazeHeight;
let prog;
let canvas;

let green = [232.0/255.0, 232.0/255.0, 67.0/255.0, 1.0];
let yellow = [33.0/255.0, 186.0/255.0, 27.0/255.0, 1.0];
let blue = [0.0, 101.0/255.0, 164.0/255.0, 1.0];
let red = [232.0/255.0, 70.0/255.0, 67.0/255.0, 1.0];

let gameStart, gameEnd, gameMaze;

const TOP = 0;
const RIGHT = 1;
const BOTTOM = 2;
const LEFT = 3;



/* -----------------------
    General Functions
-------------------------- */


function main() {
  canvas = document.getElementById("gl-canvas");
  mazeWidth = canvas.width;
  mazeHeight = canvas.height;
  gl = WebGLUtils.setupWebGL (canvas, null);
  let button = document.getElementById("gen");
  sizeInput = document.getElementById("size");
  outMessage = document.getElementById("msg");
  button.addEventListener("click", buttonClicked);

  let solveButton = document.getElementById("solve");
  solveButton.addEventListener("click", solveClicked);

  ShaderUtils.loadFromFile(gl, "vshader.glsl", "fshader.glsl")
  .then (program => {
    gl.useProgram(program);
    prog = program;

    drawScene(20,10, prog);
  });

}



function drawScene(x,y,prog) {
  let maze = gameMaze = generateMaze(x,y);
  let [start, finish] = [gameStart, gameEnd] = getEndPoints(maze);

  displayMaze(maze, start, finish, [], prog);
}



/* -----------------------
       Click Events
-------------------------- */

function solveClicked() {
  let sol = solveMaze();
  displayMaze(gameMaze, gameStart, gameEnd, sol, prog);
}

function buttonClicked() {
  let sz = sizeInput.valueAsNumber;
  if (!sz) {
    outMessage.innerHTML = "Must set size in the input box";
  } else if(sz >= 50) {
    outMessage.innerHTML = "Let's try a number less than 50.";
  } else {
    outMessage.innerHTML = "I have to generate a maze of size " + sz * 2 + "x" + sz;
    drawScene(sz*2,sz,prog);
  }
}


/* -----------------------
   Generate Functions
-------------------------- */


function generateMaze(x, y) {
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

  // Begin recursive maze generation
  generateSquare(mazeArray, current, path, visted, 1);
  return mazeArray;
}



function generateSquare(mazeArray, current, path, visited) {
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

  generateSquare(mazeArray, [chosen[0], chosen[1]], path, visited);

  if(path.length === 1) {
    return 1;
  } else {
    path.pop();
    backpropagate(mazeArray, current, path, visited);
  }
}



function backpropagate(mazeArray, position, path, visited) {
  if(path.length === 1) { return 1; }

  let neighbors = findNeighbors(position, mazeArray, visited);
  if(neighbors.length === 0) {
    let backwardPosition = path.pop();
    backpropagate(mazeArray, backwardPosition, path, visited);
  } else {
    generateSquare(mazeArray, position, path, visited);
  }
}



function solveMaze() {
  let visited = [];
  let [start, finish] = [gameStart, gameEnd];
  let maze = gameMaze;
  for(i=0;i<maze.length;i++) {
    visited.push([]);
    for(j=0;j<maze[0].length;j++) {
      visited[i].push(false);
    }
  }
  visited[start[0]][start[1]] = true;
  let solution = [start];

  let ret = solveRecursive(maze, start, visited, solution, finish);
  return ret;
}



function solveRecursive(maze, current, visited, path, finish) {
  if(current[0] === finish[0] && current[1] === finish[1]) {
    return 1;
  }

  let mazePos = maze[current[0]][current[1]];
  let neighbors = findNeighbors(current, maze, visited, true);

  if(neighbors.length === 0) { return null; }

  let foundPath = null;

  neighbors.forEach(neighbor => {
    if(foundPath === null) {
      visited[neighbor[0]][neighbor[1]] = true;
      path.push([neighbor[0], neighbor[1]]);
      if(solveRecursive(maze, [neighbor[0], neighbor[1]], visited, path, finish) !== null) {
        foundPath = path;
      } else {
        path.pop()
      }
    }
  });

  return foundPath;
}



function getEndPoints(maze) {
  let randomStart = [0, Math.floor(Math.random() * (maze[0].length-1))];
  let randomEnd = [maze.length-1, Math.floor(Math.random() * (maze[0].length-1))];

  return [randomStart, randomEnd];
}



/* -----------------------
     Drawing Functions
-------------------------- */



function displayMaze(maze, start, finish, solution, prog) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  let x = maze.length;
  let y = maze[0].length;

  let XPercentPerCell = ((mazeWidth / x) / mazeWidth ) * 2;
  let YPercentPerCell = ((mazeHeight / y) / mazeHeight ) * 2;

  let percentPerCell = [XPercentPerCell, YPercentPerCell];

  drawMazeLines(maze, percentPerCell, prog);
  drawSolution(solution, percentPerCell, prog);
  drawStartAndFinish(maze, percentPerCell, start, finish, prog);
}



function drawSolution(solution, percentPerCell, prog) {
  let verticies = [];
  let colors = [];
  let halfCell = [percentPerCell[0] / 2, percentPerCell[1] / 2];
  for(i=0;i<solution.length;i++) {
    let pos = solution[i];
    let vertex = [((pos[0] * percentPerCell[0]) + halfCell[0]) - 1, ((pos[1] * percentPerCell[1]) + halfCell[1]) - 1];
    verticies.push(...vertex);
    colors.push(...red,...red);
  }

  let length = (verticies.length/2);
  let vertexBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuff);

  // copy the verticies data
  gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(verticies), gl.STATIC_DRAW);

  let startPosAttr = gl.getAttribLocation(prog, "vertexPos");
  gl.enableVertexAttribArray(startPosAttr);


  let cBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuff);
  gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(colors), gl.STATIC_DRAW);

  let colAttr = gl.getAttribLocation(prog, "vertexCol");
  gl.enableVertexAttribArray(colAttr);


  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuff);
  gl.vertexAttribPointer(startPosAttr,
      2,         /* number of components per attribute, in our case (x,y) */
      gl.FLOAT,  /* type of each attribute */
      false,     /* does not require normalization */
      0,         /* stride: number of bytes between the beginning of consecutive attributes */
      0);        /* the offset (in bytes) to the first component in the attribute array */


  gl.bindBuffer(gl.ARRAY_BUFFER, cBuff);
  gl.vertexAttribPointer(colAttr, 4, gl.FLOAT, false, 0, 0);


  gl.drawArrays(gl.LINE_STRIP,
      0,  /* starting index in the array */
      length
  );
}



function drawStartAndFinish(maze, percentPerCell, start, finish, prog) {
  let halfCell = [percentPerCell[0] / 2, percentPerCell[1] / 2];
  let startCenter = [((start[0] * percentPerCell[0]) + halfCell[0]) - 1, ((start[1] * percentPerCell[1]) + halfCell[1]) - 1];
  let endCenter = [((finish[0] * percentPerCell[0]) + halfCell[0]) - 1, ((finish[1] * percentPerCell[1]) + halfCell[1]) - 1];


  let r1 = halfCell[0] / 3;
  let r2 = halfCell[1] / 3;
  drawCircle(startCenter, [r1,r2], green);
  drawCircle(endCenter, [r1,r2], yellow);
}



function drawCircle(center, radius, color) {

  let verticies = [...center];
  let colors = [...color]

  for (i = 0; i <= 200; i++){
    verticies.push(
      center[0] + (radius[0]*Math.cos(i*2*Math.PI/200)),
      center[1] + (radius[1]*Math.sin(i*2*Math.PI/200))
    );
    colors.push(...color, ...color);
  }

  let length = (verticies.length/2);
  let vertexBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuff);

  // copy the verticies data
  gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(verticies), gl.STATIC_DRAW);

  let startPosAttr = gl.getAttribLocation(prog, "vertexPos");
  gl.enableVertexAttribArray(startPosAttr);

  let cBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuff);
  gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(colors), gl.STATIC_DRAW);

  let colAttr = gl.getAttribLocation(prog, "vertexCol");
  gl.enableVertexAttribArray(colAttr);


  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuff);
  gl.vertexAttribPointer(startPosAttr,
      2,         /* number of components per attribute, in our case (x,y) */
      gl.FLOAT,  /* type of each attribute */
      false,     /* does not require normalization */
      0,         /* stride: number of bytes between the beginning of consecutive attributes */
      0);        /* the offset (in bytes) to the first component in the attribute array */


  gl.bindBuffer(gl.ARRAY_BUFFER, cBuff);
  gl.vertexAttribPointer(colAttr, 4, gl.FLOAT, false, 0, 0);


  gl.drawArrays(gl.TRIANGLE_FAN,
      0,  /* starting index in the array */
      length
  );
}



function drawMazeLines(maze, percentPerCell, prog) {
  let verticies = [];
  let colors = [];

  for(let i=0; i<maze.length; i++) {
    for(let j=0; j<maze[0].length; j++) {
      let cell = maze[i][j];
      verticies.push(...generateCell(i, j, cell, percentPerCell));
      for(z=0;z<8;z++) {
        colors.push(...blue);
      }
    }
  }

  let length = (verticies.length/2);
  let vertexBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuff);

  // copy the verticies data
  gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(verticies), gl.STATIC_DRAW);


  let cBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuff);
  gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(colors), gl.STATIC_DRAW);


  let posAttr = gl.getAttribLocation(prog, "vertexPos");
  gl.enableVertexAttribArray(posAttr);

  let colAttr = gl.getAttribLocation(prog, "vertexCol");
  gl.enableVertexAttribArray(colAttr);


  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuff);
  gl.vertexAttribPointer(posAttr,
      2,         /* number of components per attribute, in our case (x,y) */
      gl.FLOAT,  /* type of each attribute */
      false,     /* does not require normalization */
      0,         /* stride: number of bytes between the beginning of consecutive attributes */
      0);        /* the offset (in bytes) to the first component in the attribute array */

  gl.bindBuffer(gl.ARRAY_BUFFER, cBuff);
  gl.vertexAttribPointer(colAttr, 4, gl.FLOAT, false, 0, 0);


  gl.drawArrays(gl.LINES,
      0,  /* starting index in the array */
      length
  );
}


/* -----------------------
     Helper Functions
-------------------------- */


function findNeighbors(position, mazeArray, visited, respectWalls) {
  let wallArray = [0,0,0,0];
  if(respectWalls) { wallArray = mazeArray[position[0]][position[1]]; }

  // [x, y, current wall index, neighbor wall index ]
  return [
    [position[0],     position[1] - 1, TOP,    BOTTOM], // Above
    [position[0] + 1, position[1],     RIGHT,  LEFT  ], // Right
    [position[0],     position[1] + 1, BOTTOM, TOP   ], // Below
    [position[0] - 1, position[1],     LEFT,   RIGHT ], // Left
  ].filter((arr, index) => {
    if(wallArray[index] === 1) { return false; }

    let isInBounds = arr[0] > -1 && arr[1] > -1 && arr[0] < mazeArray.length && arr[1] < mazeArray[0].length;
    if(!isInBounds) { return false; }

    let isVisited = visited[arr[0]][arr[1]];
    return !isVisited;
  });
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

