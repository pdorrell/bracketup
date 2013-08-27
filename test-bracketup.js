function inspect(object) {return JSON.stringify(object);}

var fs = require('fs');
var bracketup = require("./bracketup.js");

console.log("bracketup = " + inspect(bracketup));

var bracketupScanner = new bracketup.BracketupScanner();

//bracketupScanner.scanLine(new TestTokenReceiver(), testLine);

var testFileName = "sample.bracketup";

var fileContents = fs.readFileSync(testFileName, {encoding: "utf-8"});

//var fileLines = fileContents.split("\n");

//console.log("fileLines = " + inspect(fileLines));

var nodeParser = new bracketup.NodeParser();
bracketupScanner.scanSource(nodeParser, fileContents);

var rootElements = nodeParser.rootElements;
console.log("Read in " + rootElements.length + " root elements from " + testFileName);
console.log("");

for (var i=0; i<rootElements.length; i++) {
  console.log("ROOT ELEMENT:\n  " + rootElements[i] + "\n");
}
