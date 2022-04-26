// ==UserScript==
// @name         Waffle Cheatsheet
// @description  A cheatsheet generator for Waffle.
// @version      1.0
// @author       Derek W. Anderson
// @namespace    https://github.com/derek-w-anderson/waffle-cheatsheet
// @match        https://wafflegame.net
// @grant        none
// ==/UserScript==

const TileState = {
  CORRECT: "green",
  PARTIALLY_CORRECT: "yellow",
  INCORRECT: "",
};

class Tile {
  constructor(letter, state) {
    /**
     * @param {string} letter
     * @param {TileState} state
     */
    this.letter = letter;
    this.state = state;
  }
}

class Point {
  constructor(x, y) {
    /**
     * @param {number} x
     * @param {number} y
     */
    this.x = x;
    this.y = y;
  }
}

class Word {
  constructor(tilesByPosition) {
    /**
     * @param {Map<Point, Tile>} tilesByPosition
     */
    this.tilesByPosition = tilesByPosition;
  }

  get isHorizontal() {
    /**
     * @returns {boolean}
     */
    const yCoordinates = new Set();

    this.tilesByPosition.forEach((_, position) => {
      yCoordinates.add(position.y);
    });

    return yCoordinates.size == 1;
  }

  get isVertical() {
    /**
     * @returns {boolean}
     */
    return !this.isHorizontal;
  }

  filter(tileState) {
    /**
     * @param {TileState} tileState
     * @returns {Map<Point, Tile>}
     */
    return new Map(
      Array.from(this.tilesByPosition).filter(([_, tile]) => {
        return tile.state == tileState;
      })
    );
  }

  get partiallyCorrectLetterSet() {
    /**
     * @returns {Set<string>}
     */
    const letters = new Set();

    this.filter(TileState.PARTIALLY_CORRECT).forEach((tile, position) => {
      if (
        (position.x == 2 && position.y == 0) ||
        (position.x == 0 && position.y == 2) ||
        (position.x == 2 && position.y == 4) ||
        (position.x == 4 && position.y == 2)
      ) {
        return;
      }
      letters.add(tile.letter);
    });

    return letters;
  }

  get incorrectLetterSet() {
    /**
     * @returns {Set<string>}
     */
    const letters = new Set();

    this.filter(TileState.INCORRECT).forEach((tile, _) => {
      letters.add(tile.letter);
    });

    return letters;
  }

  static buildLetterHtmlElement() {
    /**
     * @returns {HTMLElement}
     */
    const element = document.createElement("div");

    element.style.fontSize = "70%";
    element.style.margin = "1px";
    element.style.minWidth = "40px";
    element.style.minHeight = "20px";
    element.style.textAlign = "center";
    element.style.verticalAlign = "middle";

    return element;
  }

  toHtmlElement(waffle, gridColumn) {
    /**
     * @param {Waffle} waffle
     * @param {number} gridColumn
     * @returns {HTMLElement}
     */
    const wordElement = document.createElement("div");
    wordElement.style.gridRow = this.isHorizontal ? 1 : 2;
    wordElement.style.gridColumn = gridColumn;

    this.tilesByPosition.forEach((innerTile, _) => {
      const containerElement = document.createElement("span");
      containerElement.style.display = "inline-block";
      containerElement.style.verticalAlign = "top";
      wordElement.appendChild(containerElement);

      const actualLetterElement = Word.buildLetterHtmlElement();
      actualLetterElement.style.border = "1px solid black";
      containerElement.appendChild(actualLetterElement);

      if (innerTile.state == TileState.CORRECT) {
        actualLetterElement.innerHTML = innerTile.letter;
      } else {
        waffle.sortedTiles
          .filter((tile) => tile.state != TileState.CORRECT)
          .filter((tile) => tile.letter != innerTile.letter)
          .filter((tile) => !this.incorrectLetterSet.has(tile.letter))
          .forEach((potentialTile) => {
            const potentialLetterElement = Word.buildLetterHtmlElement();
            if (this.partiallyCorrectLetterSet.has(potentialTile.letter)) {
              potentialLetterElement.style.textDecoration = "underline";
            }
            potentialLetterElement.innerHTML = potentialTile.letter;
            containerElement.appendChild(potentialLetterElement);
          });
      }
    });

    return wordElement;
  }
}

class Waffle {
  constructor(boardElement) {
    /**
     * @param {HTMLElement} boardElement
     */
    this.board = Waffle.extractTiles(boardElement);
  }

  static extractTiles(boardElement) {
    /**
     * @param {HTMLElement} boardElement
     * @returns {Tile[][]} A 5x5 two-dimensional array of Tile objects.
     */
    const board = Array.from(Array(5), () => new Array(5));

    boardElement.querySelectorAll(".tile").forEach((tileElement) => {
      const letter = tileElement.textContent;

      let state = TileState.INCORRECT;
      if (tileElement.classList.contains(TileState.CORRECT)) {
        state = TileState.CORRECT;
      } else if (tileElement.classList.contains(TileState.PARTIALLY_CORRECT)) {
        state = TileState.PARTIALLY_CORRECT;
      }

      const posMatch = tileElement.dataset.pos.match(/\{"x":(\d),"y":(\d)\}/);
      const position = new Point(parseInt(posMatch[1]), parseInt(posMatch[2]));

      board[position.x][position.y] = new Tile(letter, state);
    });

    return board;
  }

  get tiles() {
    /**
     * @returns {Set<Tile>}
     */
    const tiles = new Set();

    this.words.forEach((word) => {
      word.tilesByPosition.forEach((tile, _) => {
        tiles.add(tile);
      });
    });

    return tiles;
  }

  get sortedTiles() {
    /**
     * @returns {Tile[]}
     */
    return Array.from(this.tiles).sort((a, b) => {
      if (a.letter < b.letter) {
        return -1;
      }
      if (a.letter > b.letter) {
        return 1;
      }
      return 0;
    });
  }

  get words() {
    /**
     * @returns {Word[]}
     */
    const words = new Array(6);

    for (let x = 0; x <= 4; x += 2) {
      const tilesByPosition = new Map();
      for (let y = 0; y <= 4; y++) {
        tilesByPosition.set(new Point(x, y), this.board[x][y]);
      }
      words.push(new Word(tilesByPosition));
    }

    for (let y = 0; y <= 4; y += 2) {
      const tilesByPosition = new Map();
      for (let x = 0; x <= 4; x++) {
        tilesByPosition.set(new Point(x, y), this.board[x][y]);
      }
      words.push(new Word(tilesByPosition));
    }

    return words;
  }
}

function toggleDisplay(htmlElement) {
  if (htmlElement.style.display != "none") {
    htmlElement.style.display = "none";
  } else {
    const classList = htmlElement.classList;
    if (classList.contains("game-number") || classList.contains("swaps")) {
      htmlElement.style.display = "flex";
    } else {
      htmlElement.style.display = "block";
    }
  }
}

let cheatsheetElement;

function toggleCheatsheet() {
  const parentElement = document.querySelector(".game-main > .top");
  const boardElement = parentElement.querySelector(".board");

  if (cheatsheetElement == undefined) {
    cheatsheetElement = document.createElement("div");
    cheatsheetElement.setAttribute("class", "cheatsheet");
    cheatsheetElement.style.display = "none";
    parentElement.insertBefore(cheatsheetElement, boardElement.nextSibling);
  }
  cheatsheetElement.innerHTML = "";

  const gridElement = document.createElement("div");
  gridElement.style.display = "grid";
  gridElement.style.gap = "10px";
  cheatsheetElement.appendChild(gridElement);

  const waffle = new Waffle(boardElement);
  waffle.words.forEach((word, i) => {
    let gridColumn = (i + 1) % 3;
    if (gridColumn == 0) {
      gridColumn = 3;
    }
    gridElement.appendChild(word.toHtmlElement(waffle, gridColumn));
  });

  toggleDisplay(cheatsheetElement);
  toggleDisplay(boardElement);
  toggleDisplay(parentElement.querySelector(".game-number"));
  toggleDisplay(parentElement.querySelector(".swaps"));
}

(function () {
  document.querySelector(".help").style.display = "none";
  document.querySelector(".game-main > .top").style.height = "90vh";

  const hiddenButton = document.querySelector(".button--blank");
  if (hiddenButton) {
    hiddenButton.style.pointerEvents = "auto";
    hiddenButton.addEventListener("mouseup", toggleCheatsheet);
  }
})();
