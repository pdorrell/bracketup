var fs = require("fs");
var path = require("path");
var utils = require("./utils.js");
var inspect = utils.inspect;
var spawn = require('child_process').spawn;

console.log("__dirname = " + __dirname);

function compileCoffeeFilesInDir(dir) {
  console.log("compileCoffeeFilesInDir, dir = " + dir);
  var files = fs.readdirSync(dir)
  console.log("files = " + inspect(files));
  for (var i=0; i<files.length; i++) {
    var file = files[i];
    var coffeeMatch = file.match(/^(.*)\.coffee$/)
    if (coffeeMatch) {
      console.log("   coffeeMatch = " + inspect(coffeeMatch));
      compileCoffeeFileIfNeeded(dir, file, coffeeMatch[1]);
    }
  }
}

function compileCoffeeFileIfNeeded(dir, file, nameWithoutExtension) {
  var coffeeFileName = path.join(dir, file);
  var javascriptFileName = path.join(dir, nameWithoutExtension + ".js");
  console.log("compile if needed from " + coffeeFileName + " to " + javascriptFileName);
  var compileNeeded = false;
  if (fs.existsSync(javascriptFileName)) {
    console.log("  " + javascriptFileName + " exists");
    var coffeeModTime = fs.statSync(coffeeFileName).mtime;
    console.log("  coffeeModTime = " + coffeeModTime);
    var javascriptModTime = fs.statSync(javascriptFileName).mtime;
    console.log("  javascriptModTime = " + coffeeModTime);
    var javascriptOutOfDate = javascriptModTime.getTime() < coffeeModTime.getTime();
    console.log("    javascriptOutOfDate = " + javascriptOutOfDate);
    if (javascriptOutOfDate) {
      fs.unlinkSync(javascriptFileName);
      compileNeeded = true;
    }
  }
  else {
    console.log("  " + javascriptFileName + " does not exist");
    compileNeeded = true;
  }
  if (compileNeeded) {
    console.log("Compiling " + coffeeFileName + " ...");
    var process = spawn('coffee', ["-c", coffeeFileName], { stdio: 'inherit' });
    process.on('close', function (code) {
      if (code != 0) {
        console.log(" compilation of " + coffeeFileName + " failed");
      }
    });
  }
}

compileCoffeeFilesInDir(__dirname);
