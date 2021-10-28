const express = require("express");
const app = new express();
const { games, leaderboard } = require("./db");
const { createGame, verifyGame, genId, formatTime, escape } = require("./util");
const { port } = require("./config.js");

leaderboard.ensure(".", []).then(() => {
    app.listen(port, () => console.log("Listening..."));
});

app.use("/", express.static(__dirname + "/web"));
app.use(express.json());

app.get("/api/v1/createGame", async (_req, res) => {
    let game = createGame();
    let id = genId();
    await games.set(id, {
        id,
        game,
        startTime: Date.now(),
        play: null,
        time: null,
        endTime: null,
        qualified: false
    });
    res.send({
        id,
        game
    });
});

app.post("/api/v1/abandonGame", async (req, res) => {
    let { id } = req.body;
    let game = await games.get(id);
    if(game == null) return res.status(400).send({
        status: 400
    });
    await games.delete(id);
    res.status(200).send({
        status: 200
    });
});

app.post("/api/v1/endGame", async (req, res) => {
    let { id, play } = req.body;
    let game = await games.get(id);
    if(game == null || game.endTime) return res.status(400).send({
        status: 400
    });
    play.time = play.timings.reduce((a, b) => a + b);
    await games.update(id, {
        time: play.time,
        endTime: Date.now()
    });
    if (await verifyGame(id, play)) {
        let lb = await leaderboard.get(".");
        let highestTime = lb.length > 9 ? lb[lb.length - 1].timeMs : Infinity;
        if(play.time < highestTime) {
            await games.set(`${id}.qualified`, true);
            res.status(200).send({
                status: 200,
                qualified: true
            })
        } else {
            await games.delete(id);
            res.status(200).send({
                status: 200,
                qualified: false
            })
        }
    } else {
        await games.delete(id);
        res.status(400).send({
            status: 400
        });
    }
});

app.post("/api/v1/submitGame", async (req, res) => {
    let { id, name } = req.body;
    let game = await games.get(id)
    if(typeof name != "string" || name.length == 0) name = "Anonymous";
    if(name.length > 24 || game == null || game.endTime == null || !game.qualified) return res.status(400).send({
        status: 400
    });
    name = escape(name);
    let lb = await leaderboard.get(".");
    let highestTime = lb.length > 9 ? lb[lb.length - 1].timeMs : Infinity;
    if(game.time > highestTime) return res.status(400).send({
        status: 400
    });
    if (lb.length > 9) lb.pop();
    lb.push({
        name,
        timeMs: game.time,
        time: formatTime(game.time)
    });
    lb.sort((a, b) => a.timeMs - b.timeMs);
    await leaderboard.set(".", lb);
    res.status(200).send({
        status: 200
    });
    await games.delete(id);
});

app.get("/api/v1/leaderboard", async (_req, res) => {
    res.send(await leaderboard.get("."));
});
