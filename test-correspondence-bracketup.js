var utils = require("./utils.js");
var merge = utils.merge;
var inspect = utils.inspect;

var fs = require('fs');
var correspondenceBracketup = require("./correspondence-bracketup.js");

var testFileName = "sample.bracketup";

var fileContents = fs.readFileSync(testFileName, {encoding: "utf-8"});

correspondenceBracketup.compileCorrespondence(fileContents);

