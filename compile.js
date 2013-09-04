var fs = require("fs");
var path = require("path");
var utils = require("./utils.js");
var inspect = utils.inspect;
var spawn = require('child_process').spawn;

var async = require('async');

function runCommand(command, args, description, callback) {
  var process = spawn(command, args, { stdio: 'inherit' });
  var $this = this;
  process.on('close', function (code) {
    if (code == 0) {
      callback();
    }
    else {
      callback({message: description + " failed with status code " + code});
    }
  });
}

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
    runCommand("coffee", ["-c", this.coffeeFileName], 
               "Compilation of " + this.coffeeFileName, callback);
  }, 
  compiler: function() {
    var $this = this;
    return function(callback) {
      return $this.compile(callback);
    }
  }
};

function findCoffeeFilesToCompile(dir) {
  console.log("findCoffeeFilesToCompile, dir = " + inspect(dir));
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

function compileCoffeeFilesInDirectories(dirs, callback) {
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
  async.waterfall(compileTasks, callback);
}

function runFile(file, callback) {
  console.log("Running " + file + " ...");
  var coffeeMatch = file.match(/^(.*)\.coffee$/);
  if (coffeeMatch) {
    file = coffeeMatch[1] + ".js";
    console.log("   (actually run " + file + " ...)");
  }
  console.log("");
  runCommand("node", [file], "Execution of " + file, function(err, result) {
    if (err) {
      callback(err);
    }
    else {
      callback(null, file);
    }
  });
}

function handleCompileAndRunResult(err, fileThatWasRun) {
  if (err) {
    console.log("ERROR: " + err.message);
  }
  else {
    if (fileThatWasRun) {
      console.log("\nFinished compiling files and running " + fileThatWasRun + "!");
    }
    else {
      console.log("\nCompilation finished!");
    }
  }
}

function compileCoffeeFilesInDirectoriesAndRunFile(dirs, file, callback) {
  console.log("compileCoffeeFilesInDirectoriesAndRunFile, dirs = " + inspect(dirs));
  var tasks = [async.apply(compileCoffeeFilesInDirectories, dirs)];
  if (file) {
    var fileToRun = path.resolve(__dirname, file);
    tasks.push(async.apply(runFile, fileToRun));
  }
  async.waterfall(tasks, callback);
}
  
compileCoffeeFilesInDirectoriesAndRunFile([__dirname], "test2.coffee", 
                                          handleCompileAndRunResult);
