var utils = require("./utils.js");
var merge = utils.merge;
var inspect = utils.inspect;

var fs = require('fs');
var bracketup1 = require("./bracketup1.js");
var bracketup = require("./bracketup.js");

console.log("bracketup = " + inspect(bracketup));

var bracketupScanner = new bracketup.BracketupScanner();

//bracketupScanner.scanLine(new TestTokenReceiver(), testLine);

var testFileName = "test/data/sample.bracketup";

var fileContents = fs.readFileSync(testFileName, {encoding: "utf-8"});

//var fileLines = fileContents.split("\n");

//console.log("fileLines = " + inspect(fileLines));

var testTokenReceiver = new bracketup.TestTokenReceiver();

bracketupScanner.scanSource(testTokenReceiver, fileContents, testFileName);

var nodeParser = new bracketup1.NodeParser();
bracketupScanner.scanSource(nodeParser, fileContents, testFileName);

var rootElements = nodeParser.rootElements;
console.log("Read in " + rootElements.length + " root elements from " + testFileName);
console.log("");

for (var i=0; i<rootElements.length; i++) {
  console.log("ROOT ELEMENT:\n  " + rootElements[i] + "\n");
}
