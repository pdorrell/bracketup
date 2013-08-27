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
  }
};

var lexerRegex = /(?:(\[)([A-Za-z0-9_\-,]*)([\s]*))|(\])|(\\(.))|([^[\]\\]+)/g;

var testLine = "[correspondence  [_title \\[Queens\\] Puzzle] " + 
  "[_text,rhoscript [_title rhoScript] [A [_word,1 8] [2 range]]";

function BracketupScanner(string) {
  this.string = string;
}

BracketupScanner.prototype = {
  regex: /(?:(\[)([A-Za-z0-9_\-,]*)([\s]*))|(\])|(\\(.))|([^[\]\\]+)/g, 
  
  sendAnyTexts: function(tokenReceiver) {
    if (this.textPortions.length > 0) {
      tokenReceiver.text(this.textPortions.join(""));
      this.textPortions = [];
    }
  }, 
  
  scan: function(tokenReceiver) {
    var scanningRegex = new RegExp(this.regex.source, "g");
    console.log("Scanning " + inspect(this.string) + "\n  with " + scanningRegex + " ..."); 
    var matchedSubstrings = [];
    this.textPortions = [];
    while ((match = scanningRegex.exec(this.string)) !== null) {
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

    var reconstitutedMatches = matchedSubstrings.join("");
    if (reconstitutedMatches != this.string) {
      throw new Error("Reconstituted " + inspect(reconstitutedMatches) + 
                    "\n                  != " + inspect(this.string));
    }
    console.log("matched substrings = " + inspect(matchedSubstrings.join("")));
  }
};
  

function scan(string, regex, tokenReceiver) {
  var match;
  var scanningRegex = new RegExp(regex.source, "g");
}

var testRegex = /([A-Z]+)|([^A-Z]+)/g;
var testLine2 = "ABCabcDEFghi";

var bracketupScanner = new BracketupScanner(testLine);

bracketupScanner.scan(new TestTokenReceiver());





