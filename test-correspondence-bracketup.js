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

var correspondenceCompiler = correspondenceBracketup.correspondenceCompiler;

var correspondenceTests = {
  testCompilation: function() {
    try {
      var compiledDoms = correspondenceCompiler.compileDoms(fileContents, jsdomDocument, testFileName);
      
      assert.equal(compiledDoms.length, 1);
      
      var expectedOutputFileName = "sample-bracket.output.html";
      var expectedOutput = fs.readFileSync(expectedOutputFileName, {encoding: "utf-8"});
      
      var correspondenceDom = compiledDoms[0];
      var correspondenceDomHtml = correspondenceDom.outerHTML;
      
      assert.equal(expectedOutput, correspondenceDomHtml);
    }
    catch (error) {
      if (error.logSourceError) {
        error.logSourceError();
      }
      throw error;
    }
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

