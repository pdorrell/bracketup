// Generated by CoffeeScript 1.6.3
(function() {
  var EndOfSourceFilePosition, SourceFileName, inspect, merge, utils;

  utils = require("./utils.js");

  merge = utils.merge;

  inspect = utils.inspect;

  SourceFileName = (function() {
    function SourceFileName(fileName) {
      this.fileName = fileName;
    }

    SourceFileName.prototype.toString = function() {
      return this.fileName;
    };

    SourceFileName.prototype.line = function(string, lineNumber, SourceLine) {
      return new SourceLine(this, string, lineNumber);
    };

    SourceFileName.prototype.endOfFilePosition = function(lines, EndOfSourceFilePosition) {
      var lastLine, numLines;
      numLines = lines.length;
      lastLine = numLines > 0 ? lines[numLines - 1] : null;
      return new EndOfSourceFilePosition(this, numLines, lastLine);
    };

    return SourceFileName;

  })();

  EndOfSourceFilePosition = (function() {
    function EndOfSourceFilePosition(sourceFileName, numLines, lastLine) {
      this.sourceFileName = sourceFileName;
      this.numLines = numLines;
      this.lastLine = lastLine;
    }

    EndOfSourceFilePosition.prototype.toString = function() {
      return this.sourceFileName + ":" + this.numLines;
    };

    return EndOfSourceFilePosition;

  })();

  exports.SourceFileName = SourceFileName;

  exports.EndOfSourceFilePosition = EndOfSourceFilePosition;

}).call(this);

/*
//@ sourceMappingURL=bracketup1.map
*/
