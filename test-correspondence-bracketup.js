var utils = require("./utils.js");
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

for (var i=0; i<compiledObjects.length; i++) {
  var correspondence = compiledObjects[i];
  console.log("correspondence = " + inspect(correspondence));
  var correspondenceDom = correspondence.createDom(document);
  console.log("correspondenceDom = " + correspondenceDom.outerHTML);
}
