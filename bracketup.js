function inspect(object) {
  return JSON.stringify(object);
}

var testTokenReceiver = {
  startItem: function(itemArguments, whitespace) {
    console.log("Start item " + inspect(itemArguments) + ", whitespace = " + inspect(whitespace));
  }, 
  endItem: function() {
    console.log("End item");
  }, 
  text: function(string) {
    console.log("Text: " + inspect(string));
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
    this.textPortions = [];
    var scanningRegex = new RegExp(this.regex.source, "g");
    console.log("Scanning " + inspect(this.string) + "\n  with " + scanningRegex + " ..."); 
    var matchedSubstrings = [];
    var textPortions = [];
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
        textPortions.push(match[6]);
      }
      else if (match[7]) {
        textPortions.push(match[7]);
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

bracketupScanner.scan(testTokenReceiver);





