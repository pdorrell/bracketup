var utils = require("./utils.js");
var assert = require("assert");
var merge = utils.merge;
var inspect = utils.inspect;

var fs = require('fs');
var bracketup = require("./bracketup.js");
var correspondenceBracketup = require("./correspondence-bracketup.js");

var testFileName = "sample.bracketup";
var fileContents = fs.readFileSync(testFileName, {encoding: "utf-8"});

var jsdom = require("jsdom").jsdom;
var jsdomDocument = jsdom(null, null, {});

var compiledDoms = correspondenceBracketup.compileCorrespondenceIntoDoms(fileContents, jsdomDocument);

assert.equal(compiledDoms.length, 1);

var expectedOutputFileName = "sample-bracket.output.html";
var expectedOutput = fs.readFileSync(expectedOutputFileName, {encoding: "utf-8"});

var correspondenceDom = compiledDoms[0];
var correspondenceDomHtml = correspondenceDom.outerHTML;

assert.equal(expectedOutput, correspondenceDomHtml);

