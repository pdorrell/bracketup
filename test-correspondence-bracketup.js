var utils = require("./utils.js");
var assert = require("assert");
var merge = utils.merge;
var inspect = utils.inspect;

var fs = require('fs');
var bracketup = require("./bracketup.js");
var correspondenceBracketup = require("./correspondence-bracketup.js");

var jsdom = require("jsdom").jsdom;

var correspondenceCompiler = correspondenceBracketup.correspondenceCompiler;

function compileSourceIntoDoms(sourceFileName) {
  var fileContents = readUtf8TextFile(sourceFileName);
  var jsdomDocument = jsdom(null, null, {});
  return correspondenceCompiler.compileDoms(fileContents, jsdomDocument, sourceFileName);
}

function readUtf8TextFile(fileName) {
  return fs.readFileSync(fileName, {encoding: "utf-8"});
}

var correspondenceTests = {
  testCompilation: function() {
    try {
      var compiledDoms = compileSourceIntoDoms("test/data/sample.bracketup");
      assert.equal(compiledDoms.length, 1);
      var correspondenceDom = compiledDoms[0];
      var correspondenceDomHtml = correspondenceDom.outerHTML;
      
      var expectedOutput = readUtf8TextFile("test/data/sample-bracket.output.html");
      assert.equal(expectedOutput, correspondenceDomHtml);
    }
    catch (error) {
      if (error.logSourceError) {
        error.logSourceError();
      }
      throw error;
    }
  }, 
  testBadBracketupSyntax: function() {
    assert.throws( function() {
      var compiledDoms = compileSourceIntoDoms("test/data/sample.bad.bracketup");
    }, 
                   function(err) {
                     assert.equal(err.sourceLinePosition.toString(), "test/data/sample.bad.bracketup:8:19");
                     assert.equal(err.message, "Unexpected ']'");
                     return true;
                   });
  }
}

function runTests(tests) {
  var numTests = 0;
  var numTestsPassed = 0;
  var numTestsFailed = 0;
  
  for (testName in tests) {
    numTests++;
    console.log("Running " + testName + " ...");
    try {
      tests[testName]();
      numTestsPassed++;
      console.log(" passed.");
    }
    catch (error) {
      numTestsFailed++;
      console.log(error.stack);
    }
  }
  console.log("\nRan " + numTests + " tests, " + numTestsPassed + " passed" + 
              (numTestsFailed > 0 ? ", " + numTestsFailed + " FAILED" : "") + ".");
}

runTests(correspondenceTests);

