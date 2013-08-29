var utils = require("./utils.js");
var assert = require("assert");
var merge = utils.merge;
var inspect = utils.inspect;

var fs = require('fs');
var correspondenceBracketup = require("./correspondence-bracketup.js");

var testFileName = "sample.bracketup";
var fileContents = fs.readFileSync(testFileName, {encoding: "utf-8"});

var compiledObjects = correspondenceBracketup.compileCorrespondence(fileContents);

var jsdom = require("jsdom").jsdom;
var jsdomDocument = jsdom(null, null, {});

var document = new correspondenceBracketup.Document(jsdomDocument);

assert.equal(compiledObjects.length, 1);

var expectedOutputFileName = "sample-bracket.output.html";
var expectedOutput = fs.readFileSync(expectedOutputFileName, {encoding: "utf-8"});

var correspondence = compiledObjects[0];
var correspondenceDom = correspondence.createDom(document);
var correspondenceDomHtml = correspondenceDom.outerHTML;

assert.equal(expectedOutput, correspondenceDomHtml);

