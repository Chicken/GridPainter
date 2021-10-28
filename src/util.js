const { games } = require("./db");
const { nanoid } = require("nanoid");
const { hardness: _hardness } = require("./config.js");
const hardness = Math.min(Math.max(_hardness, 1), 80);

const random = (min, max) => Math.floor(Math.random() * (max + 1)) + min;

let serialize = (r, c) => `r${r}c${c}`;

let deserialize = str => {
    let [, r, c] = str.match(/r(\d)c(\d)/);
    return [ parseInt(r), parseInt(c) ];
};

function flipTile(r, c, set) {
    if(r < 0 || r > 9 || c < 0 || c > 9) return;
    let serialized = serialize(r, c);
    if(set.has(serialized)) set.delete(serialized);
    else set.add(serialized);
}

function flipCross(r, c, set) {
    flipTile(r, c, set);
    flipTile(r + 1, c, set);
    flipTile(r - 1, c, set);
    flipTile(r, c + 1, set);
    flipTile(r, c - 1, set);
}

module.exports.createGame = () => {
    let emulated = new Set();
    let flipped = new Set();
    let loop = hardness;
    for(let i = 0; i < loop; i++) {
        let r = random(0, 9);
        let c = random(0, 9);
        let ser = serialize(r, c);
        if(flipped.has(ser)) {
            loop++;
        } else {
            flipped.add(ser);
            flipCross(r, c, emulated);
        }
    }
    return Array.from(emulated).map(t => deserialize(t));
}

module.exports.verifyGame = async (id, play) => {
    let game = await games.get(id);
    if(game == null) return false;
    if(play.timings.length != play.moves.length) return false;
    if(play.timings.some(t => t < 50)) return false;
    if(play.time < hardness * 250) return false;
    if((game.endTime - game.startTime) - play.time < -100) return false;
    if(play.moves.some(m => m.some(v => v < 0 || v > 9))) return false;
    let emulated = new Set();
    for(let move of game.game) {
        flipTile(move[0], move[1], emulated);
    }
    for(let move of play.moves) {
        flipCross(move[0], move[1], emulated);
    }
    return emulated.size == 0 || emulated.size == 100;
}

module.exports.genId = nanoid;

module.exports.escape = str => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

module.exports.formatTime = ms => {
    let _s = Math.round(ms / 1000);
    let s = _s % 60;
    let m = (_s - s) / 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
