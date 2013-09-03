var fs = require("fs");
var path = require("path");
var utils = require("./utils.js");
var inspect = utils.inspect;
var spawn = require('child_process').spawn;

var async = require('async');

console.log("__dirname = " + __dirname);

function CoffeeScriptSourceFile(dir, file, baseName) {
  this.dir = dir;
  this.file = file;
  this.baseName = baseName;
  this.coffeeFileName = path.join(dir, file);
  this.javascriptFileName = path.join(dir, baseName + ".js");
}

CoffeeScriptSourceFile.prototype = {
  toString: function() {
    return "[CoffeeScriptSourceFile: " + this.coffeeFileName + " => " + this.javascriptFileName + "]";
  }, 
  deleteJavascriptFile: function() {
    if (!fs.existsSync(this.javascriptFileName)) {
      fs.unlinkSync(this.javascriptFileName);
    }
  }, 
  // Checks if compilation required, also, if it is, deletes the old output file
  requiresCompilation: function() {
    var compileNeeded = false;
    if (fs.existsSync(this.javascriptFileName)) {
      console.log("  " + this.javascriptFileName + " exists");
      var coffeeModTime = fs.statSync(this.coffeeFileName).mtime;
      console.log("  coffeeModTime = " + coffeeModTime);
      var javascriptModTime = fs.statSync(this.javascriptFileName).mtime;
      console.log("  javascriptModTime = " + coffeeModTime);
      var javascriptOutOfDate = javascriptModTime.getTime() < coffeeModTime.getTime();
      console.log("    javascriptOutOfDate = " + javascriptOutOfDate);
      if (javascriptOutOfDate) {
        fs.unlinkSync(this.javascriptFileName);
        compileNeeded = true;
      }
    }
    else {
      console.log("  " + this.javascriptFileName + " does not exist");
      compileNeeded = true;
    }
    return compileNeeded;
  }, 
  compile: function() {
    var process = spawn('coffee', ["-c", this.coffeeFileName], { stdio: 'inherit' });
    process.on('close', function (code) {
      if (code != 0) {
        console.log(" compilation of " + coffeeFileName + " failed");
      }
    });
  }
};

function findCoffeeFilesToCompile(dir) {
  console.log("findCoffeeFilesToCompile, dir = " + dir);
  var files = fs.readdirSync(dir)
  var filesToCompile = []
  console.log("files = " + inspect(files));
  for (var i=0; i<files.length; i++) {
    var file = files[i];
    var coffeeMatch = file.match(/^(.*)\.coffee$/)
    if (coffeeMatch) {
      console.log("   coffeeMatch = " + inspect(coffeeMatch));
      var baseName = coffeeMatch[1];
      filesToCompile.push(new CoffeeScriptSourceFile(dir, file, baseName));
    }
  }
  return filesToCompile;
}

function compileCoffeeFilesInDir(dir) {
  var filesToCompile = findCoffeeFilesToCompile(dir);
  for (var i=0; i<filesToCompile.length; i++) {
    var fileToCompile = filesToCompile[i];
    console.log("fileToCompile = " + fileToCompile);
    if (fileToCompile.requiresCompilation()) {
      console.log("  compiling ...");
      fileToCompile.compile();
    }
  }
}

compileCoffeeFilesInDir(__dirname);
