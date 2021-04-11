const Josh = require("@joshdb/core");
const Sqlite = require("@joshdb/sqlite");

module.exports.games = new Josh({
    name: "games",
    provider: Sqlite
});

module.exports.leaderboard = new Josh({
    name: "leaderboard",
    provider: Sqlite
});
