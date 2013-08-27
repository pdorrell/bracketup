function inspect(object) {
  return JSON.stringify(object);
}

var lexerRegex = /((\[)([A-Za-z0-9_\-,]*)([\s]*))|(\])|(\\.)|([^[\]\\]+)/g;

var testLine = "[correspondence  [_title \\[Queens\\] Puzzle] " + 
  "[_text,rhoscript [_title rhoScript] [A [_word,1 8] [2 range]]";

function scan(string, regex) {
  var match;
  var scanningRegex = new RegExp(regex.source, "g");
  console.log("Scanning " + inspect(string) + "\n  with " + scanningRegex + " ..."); 
  var count = 0;
  var matchedSubstrings = [];
  while ((match = scanningRegex.exec(string)) !== null && count < 100) {
    console.log("  match = " + inspect(match));
    console.log("  remainder = " + inspect(string.substr(scanningRegex.lastIndex)));
    matchedSubstrings.push(match[0]);
    count++;
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

scan(testLine, lexerRegex);





