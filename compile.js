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
  forceCompile: false, 
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
      //console.log("    javascriptOutOfDate = " + javascriptOutOfDate);
      if (javascriptOutOfDate) {
        fs.unlinkSync(this.javascriptFileName);
        compileNeeded = true;
      }
    }
    else {
      //console.log("  " + this.javascriptFileName + " does not exist");
      compileNeeded = true;
    }
    return compileNeeded;
  }, 
  
  compile: function(callback) {
    console.log("  " + this.coffeeFileName + " ...");
    runCommand("coffee", ["-c", "-m", this.coffeeFileName], 
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
  var files = fs.readdirSync(dir)
  var filesToCompile = []
  for (var i=0; i<files.length; i++) {
    var file = files[i];
    var coffeeMatch = file.match(/^(.*)\.coffee$/)
    if (coffeeMatch) {
      var baseName = coffeeMatch[1];
      var sourceFile = new CoffeeScriptSourceFile(dir, file, baseName);
      if (sourceFile.requiresCompilation()) {
        filesToCompile.push(sourceFile);
      }
    }
  }
  return filesToCompile;
}

function compileCoffeeFilesInDirectories(dirs, callback) {
  for (var j=0; j<dirs.length; j++) {
    var dir = dirs[j];
    //console.log("  " + dir +  " ...");
    var filesToCompile = findCoffeeFilesToCompile(dir);
    var compileTasks = [];
    for (var i=0; i<filesToCompile.length; i++) {
      var fileToCompile = filesToCompile[i];
      compileTasks.push(fileToCompile.compiler());
    }
  }
  if (compileTasks.length > 0) {
    console.log(" Compiling ...");
  }
  else {
    console.log("   (no files require compilation)");
  }
  async.waterfall(compileTasks, callback);
}

function runFile(file, callback) {
  var coffeeMatch = file.match(/^(.*)\.coffee$/);
  var fileToRun = file;
  var actualFileAside = "";
  if (coffeeMatch) {
    fileToRun = coffeeMatch[1] + ".js";
    actualFileAside = " (" + path.basename(fileToRun) + ")";
  }
  console.log("Running " + file + actualFileAside + " ...");
  console.log("");
  runCommand("node", [fileToRun], "Execution of " + fileToRun, function(err, result) {
    if (err) {
      callback(err);
    }
    else {
      callback(null, fileToRun);
    }
  });
}

function handleCompileAndRunResult(err, fileThatWasRun) {
  if (err) {
    console.log("ERROR: " + err.message);
  }
  else {
    if (fileThatWasRun) {
      console.log("\nFinished compiling files and running " + fileThatWasRun);
    }
    else {
      console.log("\nCompilation finished");
    }
  }
}

function compileCoffeeFilesInDirectoriesAndRunFile(baseDir, dirs, file, callback) {
  console.log("Compile coffee files in " + inspect(dirs) + 
              (baseDir ? " (relative to " + baseDir + ")" : "") +
              (file ? " and run " + file : ""));
  if (baseDir) {
    for (var i=0; i<dirs.length; i++) {
      dirs[i] = path.resolve(baseDir, dirs[i]);
    }
  }
  var tasks = [async.apply(compileCoffeeFilesInDirectories, dirs)];
  if (file) {
    var fileToRun = file;
    if (baseDir) {
      fileToRun = path.resolve(baseDir, fileToRun);
    }
    tasks.push(async.apply(runFile, fileToRun));
  }
  async.waterfall(tasks, callback);
}
  
compileCoffeeFilesInDirectoriesAndRunFile(__dirname, [".", "correspondence"], "test2.coffee", 
                                          handleCompileAndRunResult);
