const highscore = document.createElement("div");
highscore.className = "highscore";
highscore.textContent = "High Score : 0";

const score = document.createElement("div");
score.className = "score";
score.textContent = "Score : 0";

const time = document.createElement("div");
time.className = "time";
time.textContent = "Time 00 : 00";

const details = document.getElementById("details");
details.append(highscore, score, time);

//giving border for the better visiblity

const board = document.getElementById("gamearea");
const rows = 20;
const col = 30;
const totalcells = rows * col;

for (let i = 0; i < rows * col; i++) {
  const cell = document.createElement("div");
  cell.classList.add("cell");
  board.append(cell);
}

//snake ko introduce krte hai tin cell se

let snake = [42, 43, 44];

//ui pe snake dikhana hai to ek kr ke color badl rhe hai

snake.forEach((index) => {
  board.children[index].classList.add("snake");
});

//generating food
let foodindex;

function generatefood() {
  let randomindex;

  do {
    randomindex = Math.floor(Math.random() * totalcells);
  } while (snake.includes(randomindex));

  foodindex = randomindex;
  board.children[foodindex].classList.add("food");
}
function removefood() {
  board.children[foodindex].classList.remove("food");
}
generatefood();

//giving direction
let direction = "DOWN";

document.addEventListener("keydown", (e) => {
  e.preventDefault();
  if (e.key === "ArrowUp" && direction !== "DOWN") {
    direction = "UP";
  } else if (e.key === "ArrowDown" && direction !== "UP") {
    direction = "DOWN";
  } else if (e.key === "ArrowRight" && direction !== "LEFT") {
    direction = "RIGHT";
  } else if (e.key === "ArrowLeft" && direction !== "RIGHT") {
    direction = "LEFT";
  }
});

//draw or remove the snake fuction call se add ya remove kr sku
function drawsnake() {
  snake.forEach((index) => {
    board.children[index].classList.add("snake");
  });
}
function removesnake() {
  snake.forEach((index) => {
    board.children[index].classList.remove("snake");
  });
}

function movesnake() {
  const head = snake[snake.length - 1];
  let newHead;
  if (direction === "RIGHT") {
    newHead = head + 1;
  } else if (direction === "LEFT") {
    newHead = head - 1;
  } else if (direction === "DOWN") {
    newHead = head + col;
  } else if (direction === "UP") {
    newHead = head - col;
  }

  removesnake();
  snake.push(newHead);
  if (newHead === foodindex) {
    removefood();
    generatefood();
  } else {
    snake.shift();
  }
  drawsnake();
}

setInterval(movesnake,300); //set interval callback function le ya direct fuction ka naam baat same hai
