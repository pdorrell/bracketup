var compile = require("./coffee-compilation.js");

compile.compileCoffeeFilesAndRunFile(__dirname, [".", "correspondence"], "test-correspondence-bracketup.js");
