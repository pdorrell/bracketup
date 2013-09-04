var compile = require("./coffee-compilation.js");

compile.compileCoffeeFilesAndRunFile(__dirname, [".", "correspondence"], "test2.coffee");
