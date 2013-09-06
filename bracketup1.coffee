
utils = require("./utils.js")
merge = utils.merge
inspect = utils.inspect

class SourceFileName
  constructor: (@fileName) ->
    
  toString: ->
    @fileName
    
  line: (string, lineNumber) ->
    new SourceLine this, string, lineNumber
    
  endOfFilePosition: (lines) ->
    numLines = lines.length
    lastLine = if numLines > 0 then lines[numLines-1] else null
    new EndOfSourceFilePosition this, numLines, lastLine

class EndOfSourceFilePosition
  constructor: (@sourceFileName, @numLines, @lastLine) ->
  toString: ->
    @sourceFileName + ":" + @numLines

class SourceLine
  constructor: (@sourceFileName, @line, @lineNumber) ->
  toString: ->
    @sourceFileName + ":" + @lineNumber
  position: (linePosition) ->
    new SourceLinePosition this, linePosition

repeatedString = (string, numRepeats) ->
  return (string for i in [0..numRepeats]).join ""

class SourceLinePosition
  constructor: (@sourceLine, @position) ->
  toString: ->
    @sourceLine + ":" + @position
  logLineAndPosition: () ->
    linePrefix = @toString() + ":"
    line1 = linePrefix + @sourceLine.line
    line2 = repeatedString(" ", linePrefix.length + @position - 1) + "^"
    [line1, line2]

class TextNode
  constructor: (@string, @sourceLinePosition) ->
  toString: ->
    "[TextNode " + inspect(@.string) + "]"
  addToResult: (compiler, result) ->
    compiler.compileTextChild result, @string

class EndOfLineNode
  constructor: (@sourceLinePosition) ->
  toString: ->
    "[EndOfLineNode]"
  addToResult: (compiler, result) ->
    compiler.compileEndOfLineChild result

class ElementNode
  constructor: (@args, @whitespace, @sourceLinePosition) ->
    @children = []
  addChild: (child) ->
    child.parent = this
    @children.push child
  toString: ->
    childStrings = (child.toString() for child in @children)
    "[ElementNode(" + @args.join(", ") + ") " + childStrings.join(", ") + "]"
  addToResult: (compiler, result) ->
    compiler.compileElementChild(result, this)

class CustomError
  constructor: (className, @message) ->
    this.error = new Error message
    this.stack = @error.stack.replace(/^Error:/g, className + ":")
  logSourceError: ->
    if @sourceLinePosition
      console.log ""
      console.log @getMessageLine()
      console.log ""
      console.log @sourceLinePosition.logLineAndPosition().join("\n")

class CompileError extends CustomError
  constructor: (message, @sourceLinePosition) ->
    super "CompileError", message
  getMessageLine: ->
    "Compile error: " + @message

class NodeCompiler
  constructor: (@topLevelClassMap) ->

  createFromFunctionClass: (functionClass, constructorArgs, initialWhitespace,
                            childNodes, sourceLinePosition) ->
    object = Object.create(functionClass.prototype)
    functionClass.apply(object, constructorArgs)
    if object.prependWhitespace
      object.prependWhitespace(initialWhitespace)
    for childNode in childNodes
      @compileChild(object, childNode)
    object.sourceLinePosition = sourceLinePosition
    object

  compile: (rootElementNode) ->
    elementArgs = rootElementNode.args;
    if elementArgs.length == 0
      throw new CompileError("No node function name given for root element", 
                             rootElementNode.sourceLinePosition)
    functionName = elementArgs[0]
    if functionName.match(/^_/)
      functionName = functionName.substring(1)
    nodeFunctionClass = @topLevelClassMap[functionName]
    if !nodeFunctionClass
      throw new CompileError("Unknown top-level function for root element: " + functionName, 
                             rootElementNode.sourceLinePosition)
    rootObject = @createFromFunctionClass(nodeFunctionClass, elementArgs.slice(1), 
                                          rootElementNode.whitespace, 
                                          rootElementNode.children, 
                                          rootElementNode.sourceLinePosition);
    if rootObject.setIndentInsertString
      rootObject.setIndentInsertString("\n");
    rootObject

  compileChild: (parentObject, childNode) ->
    childNode.addToResult(this, parentObject)

  compileTextChild: (parentObject, string) ->
    parentObject.addTextChild(string)

  compileEndOfLineChild: (parentObject) ->
    parentObject.addEndOfLineChild()

  compileElementChild: (parentObject, childNode) ->
    elementArgs = childNode.args.slice(0);
    if elementArgs.length>0 && elementArgs[0].match(/^_/)
      elementArgs[0] = elementArgs[0].substring(1)
    else
      if parentObject.defaultChildFunction
        elementArgs = [parentObject.defaultChildFunction].concat(elementArgs)
    if elementArgs.length == 0
      throw new CompileError("No function argument given and no default child function for parent element", 
                             childNode.sourceLinePosition)
    functionName = elementArgs[0]
    elementArgs = elementArgs.slice(1)
    childFunctionClass = null
    if parentObject.classMap
      childFunctionClass = parentObject.classMap[functionName]
    if !childFunctionClass
      childFunctionClass = this.topLevelClassMap[functionName]
    if !childFunctionClass
      throw new CompileError("No function class found for " + inspect(functionName) + 
                             " in either parent class map or top-level class map", 
                             childNode.sourceLinePosition)
    childObject = this.createFromFunctionClass(childFunctionClass, elementArgs, 
                                               childNode.whitespace, 
                                               childNode.children, 
                                               childNode.sourceLinePosition)
    if childObject.addToParent
      childObject.addToParent(parentObject)
    else
      parentObject.addChild(childObject)

class NodeParseException extends CustomError
  constructor: (message, @sourceLinePosition) ->
    super("NodeParseException", message)

  getMessageLine: ->
    "Syntax error: " + @message

class NodeParser
  constructor: ->
    @nodesStack = []
    @currentElementNode = null
    @rootElements = []

  startItem: (itemArguments, whitespace, sourceLinePosition) ->
    elementNode = new ElementNode(itemArguments, whitespace, sourceLinePosition)
    if @currentElementNode == null
      @rootElements.push(elementNode)
    else
      @currentElementNode.addChild(elementNode)
      @nodesStack.push(@currentElementNode)
    @currentElementNode = elementNode


  endItem: (sourceLinePosition) ->
    if @currentElementNode != null
      if @nodesStack.length > 0
        @currentElementNode = @nodesStack.pop()
      else
        @currentElementNode = null
    else
      throw new NodeParseException("Unexpected end of element node", sourceLinePosition)

  text: (string, sourceLinePosition) ->
    if @currentElementNode != null
      @currentElementNode.addChild(new TextNode(string, sourceLinePosition))
    else
      if string.match("^\s*$")
        #console.log("Ignoring whitespace outside of root element: " + inspect(string))
      else
        throw new NodeParseException("Unexpected text outside of root element: " + inspect(string), 
                                     sourceLinePosition)

  endOfLine: (sourceLinePosition) ->
    if @currentElementNode != null
      @currentElementNode.addChild(new EndOfLineNode(sourceLinePosition))
    else
      # console.log("Ignoring end-of-line outside of root element")

exports.SourceFileName = SourceFileName
exports.TextNode = TextNode
exports.EndOfLineNode = EndOfLineNode
exports.ElementNode = ElementNode
exports.CustomError = CustomError
exports.CompileError = CompileError
exports.NodeCompiler = NodeCompiler
exports.NodeParseException = NodeParseException
exports.NodeParser = NodeParser
