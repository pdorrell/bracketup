
utils = require("./utils.js")
merge = utils.merge
inspect = utils.inspect

class SourceFileName
  constructor: (@fileName) ->
    
  toString: ->
    @fileName
    
  line: (string, lineNumber, SourceLine) ->
    new SourceLine(this, string, lineNumber)
    
  endOfFilePosition: (lines, EndOfSourceFilePosition) ->
    numLines = lines.length
    lastLine = if numLines > 0 then lines[numLines-1] else null
    new EndOfSourceFilePosition(this, numLines, lastLine)

class EndOfSourceFilePosition
  constructor: (@sourceFileName, @numLines, @lastLine) ->
  toString: ->
    @sourceFileName + ":" + @numLines;

exports.SourceFileName = SourceFileName
exports.EndOfSourceFilePosition = EndOfSourceFilePosition
