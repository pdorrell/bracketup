var fs = require("fs");
var path = require("path");
var utils = require("./utils.js");
var inspect = utils.inspect;
var spawn = require('child_process').spawn;

var async = require('async');

function CoffeeScriptSourceFile(dir, file, baseName) {
  this.dir = dir;
  this.file = file;
  this.baseName = baseName;
  this.coffeeFileName = path.join(dir, file);
  this.javascriptFileName = path.join(dir, baseName + ".js");
}

CoffeeScriptSourceFile.prototype = {
  forceCompile: true, 
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
    if(this.forceCompile) return true;
    var compileNeeded = false;
    if (fs.existsSync(this.javascriptFileName)) {
      //console.log("  " + this.javascriptFileName + " exists");
      var coffeeModTime = fs.statSync(this.coffeeFileName).mtime;
      //console.log("  coffeeModTime = " + coffeeModTime);
      var javascriptModTime = fs.statSync(this.javascriptFileName).mtime;
      //console.log("  javascriptModTime = " + coffeeModTime);
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
  
  compile: function(callback) {
    var process = spawn('coffee', ["-c", this.coffeeFileName], { stdio: 'inherit' });
    var $this = this;
    process.on('close', function (code) {
      if (code != 0) {
        callback({message: "Compilation of " + $this.coffeeFileName + " failed with status code " + code});
      }
    });
  }
};

function findCoffeeFilesToCompile(dir) {
  console.log("findCoffeeFilesToCompile, dir = " + dir);
  var files = fs.readdirSync(dir)
  var filesToCompile = []
  for (var i=0; i<files.length; i++) {
    var file = files[i];
    var coffeeMatch = file.match(/^(.*)\.coffee$/)
    if (coffeeMatch) {
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
    console.log(" " + fileToCompile);
    if (fileToCompile.requiresCompilation()) {
      console.log("   compiling ...");
      fileToCompile.compile(function(err) {
        console.log("ERROR: " + err.message);
      });
    }
  }
}

compileCoffeeFilesInDir(__dirname);
