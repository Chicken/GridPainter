const table = document.getElementById("game");
const leaderboard = document.getElementById("leaderboard");
const start = document.getElementById("start");
const time = document.getElementById("time");
const ftime = document.getElementById("ftime");
const reset = document.getElementById("reset");
const newBtn = document.getElementById("new");
const submitBtn = document.getElementById("submitBtn");
const nameInput = document.getElementById("name");
const submitBox = document.getElementById("submitBox");
const winBox = document.getElementById("winBox");
const lbtime = document.getElementById("lbtime");

let playing = false;
let timeUpdate = null;
let id = null;
let game = null;
let startTime = null;
let highestTime = null;
let finalTime = null;
let lastPress = null;
let submitted = true;
let moves = [];
let timings = [];

async function updateLeaderboard() {
    let res = await fetch("/api/v1/leaderboard");
    let users = await res.json();
    leaderboard.innerHTML = "";
    let header = document.createElement("h2");
    header.innerHTML = "Leaderboard";
    leaderboard.appendChild(header);
    if (users.length === 0) {
        let txt = document.createElement("p");
        txt.classList.add("lbitem");
        txt.innerHTML = "Empty :c";
        leaderboard.appendChild(txt);
        highestTime = Infinity;
        return;
    }
    highestTime = users.length > 9 ? users[users.length - 1].timeMs : Infinity;
    for (let i in users) {
        let row = document.createElement("p");
        row.classList.add("lbitem");
        row.innerHTML = `${parseInt(i) + 1}. ${users[i].name} - ${users[i].time}`;
        leaderboard.appendChild(row);
    }
}

updateLeaderboard();
setInterval(updateLeaderboard, 10000);

let serialize = (r, c) => `r${r}c${c}`;
let deserialize = str => {
    let [, r, c] = str.match(/r(\d)c(\d)/);
    return {
        r: parseInt(r),
        c: parseInt(c)
    }
};

function flipTile(r, c) {
    let tile = document.getElementById(serialize(r, c));
    if(tile == null) return;
    if(tile.classList.contains("alt")) tile.classList.remove("alt");
    else tile.classList.add("alt");
}

function flipCross(r, c) {
    flipTile(r, c);
    flipTile(r + 1, c);
    flipTile(r - 1, c);
    flipTile(r, c + 1);
    flipTile(r, c - 1);
}

function clearHovers() {
    let hovered = document.getElementsByClassName("hover");
    while (hovered.length) {
        hovered[0].classList.remove("hover");
    }
}

function hoverTile(r, c) {
    let tile = document.getElementById(serialize(r, c));
    if(tile == null) return;
    tile.classList.add("hover");
}

function hoverCross(r, c) {
    clearHovers();
    hoverTile(r, c);
    hoverTile(r + 1, c);
    hoverTile(r - 1, c);
    hoverTile(r, c + 1);
    hoverTile(r, c - 1);
}

for(let r = 0; r < 10; r++) {
    let row = document.createElement("tr");
    table.appendChild(row);
    for(let c = 0; c < 10; c++) {
        let col = document.createElement("td");
        col.id = `r${r}c${c}`;
        row.appendChild(col);
        col.addEventListener("click", async () => {
            if(!playing) return;
            flipCross(r, c);
            moves.push([r, c]);
            let t = Date.now();
            timings.push(t - (lastPress ? lastPress : startTime));
            lastPress = t;
            await checkWin();
        });
        col.addEventListener("mouseover", () => {
            hoverCross(r, c)
        });
    }
}

table.addEventListener("mouseout", clearHovers);

function formatTime(ms) {
    let _s = Math.round(ms / 1000);
    let s = _s % 60;
    let m = (_s - s) / 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

start.addEventListener("click", async () => {
    if(!submitted) {
        fetch("/api/v1/abandonGame", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id
            })
        });
    }
    submitted = true;
    let res = await fetch("/api/v1/createGame");
    game = await res.json();
    for(let move of game.game) {
        flipTile(move[0], move[1]);
    }
    id = game.id;
    moves = [];
    timings = [];
    time.classList.remove("hide");
    reset.classList.remove("hide");
    newBtn.classList.remove("hide");
    start.classList.add("hide");
    submitBox.classList.add("hide");
    winBox.classList.add("hide")
    playing = true;
    lastPress = null;
    startTime = Date.now();
    timeUpdate = setInterval(() => {
        time.innerHTML = formatTime(Date.now() - startTime);
    }, 1000);
});

async function checkWin() {
    let altl = document.getElementsByClassName("alt").length;
    if(altl === 0 || altl === 100) {
        playing = false;
        finalTime = Date.now() - startTime;
        clearInterval(timeUpdate);
        time.classList.add("hide");
        reset.classList.add("hide");
        newBtn.classList.add("hide");
        start.classList.remove("hide");
        winBox.classList.remove("hide");
        ftime.innerHTML = `Final time: ${formatTime(finalTime)}`;
        let res = await fetch("/api/v1/endGame", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id,
                play: {
                    moves,
                    timings
                }
            })
        });
        let { status, qualified } = await res.json();
        if(status == 400) alert("Your run was determined to be invalid and will not be accepted for leaderboards!");
        if(qualified) {
            submitted = false;
            submitBox.classList.remove("hide");
        }
    }
}

submitBtn.addEventListener("click", async () => {
    if(nameInput.value.length > 24) return alert("Name cannot be longer than 24 chars.");
    let res = await fetch("/api/v1/submitGame", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            id,
            name: nameInput.value,
        })
    });
    let { status } = await res.json();
    if(status == 400) return alert("Something went wrong.");
    submitted = true;
    submitBox.classList.add("hide")
    await updateLeaderboard();
});

newBtn.addEventListener("click", async () => {
    playing = false;
    clearInterval(timeUpdate);
    let flipped = document.getElementsByClassName("alt");
    while (flipped.length) {
        flipped[0].classList.remove("alt")
    }
    fetch("/api/v1/abandonGame", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            id
        })
    });
    submitted = true;
    start.click();
});

reset.addEventListener("click", () => {
    let flipped = document.getElementsByClassName("alt");
    while (flipped.length)
        flipped[0].classList.remove("alt")
    for(let move of game.game) {
        flipTile(move[0], move[1]);
    }
});
