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

function scan(string, regex, tokenReceiver) {
  var match;
  var scanningRegex = new RegExp(regex.source, "g");
  console.log("Scanning " + inspect(string) + "\n  with " + scanningRegex + " ..."); 
  var matchedSubstrings = [];
  while ((match = scanningRegex.exec(string)) !== null) {
    // console.log("  match = " + inspect(match));
    matchedSubstrings.push(match[0]);
    // console.log("==> " + inspect(match[0]));
    if(match[1]) {
      var itemArguments = match[2].split(",");
      var whitespace = match[3];
      tokenReceiver.startItem(itemArguments, whitespace);
    }
    else if (match[4]) {
      tokenReceiver.endItem();
    }
    else if (match[5]) {
      tokenReceiver.text(match[6]);
    }
    else if (match[7]) {
      tokenReceiver.text(match[7]);
    }
    else {
      console.log("match = " + inspect(match));
      throw new Error("No match found");
    }
  }
  var reconstitutedMatches = matchedSubstrings.join("");
  if (reconstitutedMatches != string) {
    throw new Error("Reconstituted " + inspect(reconstitutedMatches) + 
                    "\n                  != " + inspect(string));
  }
  console.log("matched substrings = " + inspect(matchedSubstrings.join("")));
}

var testRegex = /([A-Z]+)|([^A-Z]+)/g;
var testLine2 = "ABCabcDEFghi";

scan(testLine, lexerRegex, testTokenReceiver);





