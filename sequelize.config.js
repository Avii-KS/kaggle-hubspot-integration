// Enable ts-node so sequelize-cli can load TypeScript migration files (if any)
require("ts-node/register");
module.exports = require("./src/database/config/config.js");
