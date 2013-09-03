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
    console.log("compile, this = " + this);
    var process = spawn('coffee', ["-c", this.coffeeFileName], { stdio: 'inherit' });
    var $this = this;
    process.on('close', function (code) {
      if (code == 0) {
        callback();
      }
      else {
        callback({message: "Compilation of " + $this.coffeeFileName + " failed with status code " + code});
      }
    });
  }, 
  compiler: function() {
    var $this = this;
    return function(callback) {
      return $this.compile(callback);
    }
  }
};

function findCoffeeFilesToCompile(dir) {
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

function compileCoffeeFilesInDirectories(callback, dirs) {
  console.log("compileCoffeeFilesInDirectories " + inspect(dirs));
  for (var j=0; j<dirs.length; j++) {
    var dir = dirs[j];
    console.log("  " + dir +  " ...");
    var filesToCompile = findCoffeeFilesToCompile(dir);
    var compileTasks = [];
    for (var i=0; i<filesToCompile.length; i++) {
      var fileToCompile = filesToCompile[i];
      console.log("    " + fileToCompile.coffeeFileName);
      compileTasks.push(fileToCompile.compiler());
    }
  }
  async.parallel(compileTasks, callback);
}

function handleCompilationResult(err) {
  if (err) {
    console.log("ERROR: " + err.message);
  }
  else {
    console.log("Compilation finished!");
  }
}

compileCoffeeFilesInDirectories(handleCompilationResult, [__dirname]);
