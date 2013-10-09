#A class to receive output from BracketupScanner and display it nicely described and indented.
class TestTokenReceiver
  constructor: ->
    this.indent = ""
  
  indentIncrement: "  "
    
  startItem: (itemArguments, whitespace, sourceLinePosition) ->
    console.log(@indent + "START " + inspect(itemArguments) + 
                "  (whitespace = " + inspect(whitespace) + ") [" + sourceLinePosition + "]")
    @indent = @indent + @indentIncrement

  endItem: (sourceLinePosition) ->
    if @indent.length < @indentIncrement.length
      throw new CompileError("Unexpected end of item", sourceLinePosition)
    @indent = @indent.substring(@indentIncrement.length)
    console.log(@indent + "END [" + sourceLinePosition + "]")

  text: (string, sourceLinePosition) ->
    console.log(@indent + "TEXT " + inspect(string) + " [" + sourceLinePosition + "]")

  endOfLine: (sourceLinePosition) ->
    console.log(@indent + "EOLN [" + sourceLinePosition + "]")

