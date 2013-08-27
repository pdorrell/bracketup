var fs = require('fs');

function inspect(object) {
  return JSON.stringify(object);
}

function TestTokenReceiver() {
  this.indent = "";
}

TestTokenReceiver.prototype = {
  indentIncrement: "  ", 
  
  startItem: function(itemArguments, whitespace) {
    console.log(this.indent + "START " + inspect(itemArguments) + 
                "  (whitespace = " + inspect(whitespace) + ")");
    this.indent = this.indent + this.indentIncrement;
  }, 
  endItem: function() {
    if (this.indent.length < this.indentIncrement.length) {
      throw new Error("Unexpected end of item");
    }
    this.indent = this.indent.substring(this.indentIncrement.length);
    console.log(this.indent + "END");
  }, 
  text: function(string) {
    console.log(this.indent + "TEXT " + inspect(string));
  }, 
  endOfLine: function() {
    console.log(this.indent + "EOLN");
  }
};

var testLine = "[correspondence  [_title \\[Queens\\] Puzzle] " + 
  "[_text,rhoscript [_title rhoScript] [A [_word,1 8] [2 range]]";

function BracketupScanner() {
}

BracketupScanner.prototype = {
  regex: /(?:(\[)([A-Za-z0-9_\-,]*)([\s]*))|(\])|(\\(.))|([^[\]\\]+)/g, 
  
  sendAnyTexts: function(tokenReceiver) {
    if (this.textPortions.length > 0) {
      tokenReceiver.text(this.textPortions.join(""));
      this.textPortions = [];
    }
  }, 
  
  scanLine: function(tokenReceiver, line) {
    var scanningRegex = new RegExp(this.regex.source, "g");
    // console.log("Scanning " + inspect(line) + "\n  with " + scanningRegex + " ..."); 
    var matchedSubstrings = [];
    this.textPortions = [];
    while ((match = scanningRegex.exec(line)) !== null) {
      // console.log("  match = " + inspect(match));
      matchedSubstrings.push(match[0]);
      // console.log("==> " + inspect(match[0]));
      if(match[1]) {
        this.sendAnyTexts(tokenReceiver);
        var itemArguments = match[2].split(",");
        var whitespace = match[3];
        tokenReceiver.startItem(itemArguments, whitespace);
      }
      else if (match[4]) {
        this.sendAnyTexts(tokenReceiver);
        tokenReceiver.endItem();
      }
      else if (match[5]) {
        this.textPortions.push(match[6]);
      }
      else if (match[7]) {
        this.textPortions.push(match[7]);
      }
      else {
        console.log("match = " + inspect(match));
        throw new Error("No match found");
      }
    }
    this.sendAnyTexts(tokenReceiver);
    tokenReceiver.endOfLine();

    var reconstitutedMatches = matchedSubstrings.join("");
    if (reconstitutedMatches != line) {
      throw new Error("Reconstituted " + inspect(reconstitutedMatches) + 
                    "\n                  != " + inspect(line));
    }
    // console.log("matched substrings = " + inspect(matchedSubstrings.join("")));
  }, 
  
  scanSource: function(tokenReceiver, source) {
    var lines = source.split("\n");
    for (var i=0; i<lines.length; i++) {
      this.scanLine(tokenReceiver, lines[i]);
    }
  }
};
  
var bracketupScanner = new BracketupScanner();

//bracketupScanner.scanLine(new TestTokenReceiver(), testLine);

var testFileName = "sample.bracketup";

var fileContents = fs.readFileSync(testFileName, {encoding: "utf-8"});

//var fileLines = fileContents.split("\n");

//console.log("fileLines = " + inspect(fileLines));

bracketupScanner.scanSource(new TestTokenReceiver(), fileContents);

