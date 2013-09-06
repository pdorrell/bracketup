
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
  return (string for i in [1..numRepeats]).join ""

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
    this.error = new Error @message
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
      if string.match(/^\s*$/)
        #console.log("Ignoring whitespace outside of root element: " + inspect(string))
      else
        throw new NodeParseException("Unexpected text outside of root element: " + inspect(string), 
                                     sourceLinePosition)

  endOfLine: (sourceLinePosition) ->
    if @currentElementNode != null
      @currentElementNode.addChild(new EndOfLineNode(sourceLinePosition))
    else
      # console.log("Ignoring end-of-line outside of root element")

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

class BracketupScanner
  constructor: ->

  regex: /(?:(\[)([A-Za-z0-9_\-,]*)([\s]*))|(\])|(\\(.))|([^[\]\\]+)/g
  
  sendAnyTexts: (tokenReceiver) ->
    if @textPortions.length > 0
      tokenReceiver.text(@textPortions.join(""), @textPortionsSourceLinePosition)
      @textPortions = []

  saveTextPortion: (textPortion, sourceLinePosition) ->
    if @textPortions.length == 0
      @textPortionsSourceLinePosition = sourceLinePosition
    @textPortions.push(textPortion)

  scanLine: (tokenReceiver, line, sourceLine) ->
    scanningRegex = new RegExp(@regex.source, "g")
    #console.log("Scanning " + inspect(line) + "\n  with " + scanningRegex + " ..."); 
    matchedSubstrings = []
    @textPortions = []
    linePosition = 1
    sourceLinePosition = sourceLine.position(linePosition)
    while (match = scanningRegex.exec(line))
      #console.log("  match = " + inspect(match))
      matchedSubstring = match[0]
      matchedSubstrings.push(matchedSubstring)
      #console.log("==> " + inspect(match[0]))
      if match[1]
        @sendAnyTexts(tokenReceiver)
        itemArguments = match[2].split(",")
        whitespace = match[3]
        tokenReceiver.startItem(itemArguments, whitespace, sourceLinePosition)
        @depth++
      else if match[4]
        @sendAnyTexts(tokenReceiver)
        if @depth <= 0
          throw new NodeParseException("Unexpected ']'", sourceLinePosition)
        tokenReceiver.endItem(sourceLinePosition)
        @depth--
      else if match[5]
        @saveTextPortion(match[6], sourceLinePosition)
      else if match[7]
        @saveTextPortion(match[7], sourceLinePosition)
      else
        console.log("match = " + inspect(match))
        throw new NodeParseException("No match found in lexer", sourceLinePosition)
      linePosition += matchedSubstring.length
      sourceLinePosition = sourceLine.position(linePosition)
    @sendAnyTexts(tokenReceiver)
    tokenReceiver.endOfLine(sourceLinePosition)

    reconstitutedMatches = matchedSubstrings.join("")
    if reconstitutedMatches != line
      throw new NodeParseException("Reconstituted " + inspect(reconstitutedMatches) + 
                                   "\n                  != " + inspect(line), sourceLinePosition)
    # console.log("matched substrings = " + inspect(matchedSubstrings.join("")))
  
  scanSource: (tokenReceiver, source, sourceFileName) ->
    @depth = 0
    lines = source.split("\n")
    sourceFileName = new SourceFileName(sourceFileName)
    for i in [0...lines.length]
      line = lines[i]
      @scanLine(tokenReceiver, line, sourceFileName.line(line, i+1))
    if @depth != 0
      throw new NodeParseException(@depth + " unbalanced '['s at end of file", sourceFileName.endOfFilePosition(lines))

class TextElement
  constructor: (@string) ->

  createDom: (document) ->
    document.createTextNode(@string)

#Base and generic classes for application-specific Bracketup interpreters
class BaseNode
  constructor: ->
    @children = []
    @attributes = {}

  classMap: {}
  
  addChild: (child) ->
    @children.push(child)
    child.parent = this

  addTextChild: (string) ->
    if !(@ignoreWhiteSpaceText && string.match(/^\s*$/))
      @children.push(new TextElement(string))
  
  setIndentInsertString: (parentIndentInsertString) ->
    if @childIndent
      @indentInsertString = parentIndentInsertString + @childIndent
      for child in @children
        if child.setIndentInsertString
          child.setIndentInsertString(@indentInsertString)

  addEndOfLineChild: () ->
    if @endOfLineNode
      @children.push(@endOfLineNode)

  setAttribute: (attributeName, value) ->
    @attributes[attributeName] = value

  createDom: (document) ->
    if @createInitialDom
      dom = @createInitialDom(document)
      for i in [0...@children.length]
        child = @children[i]
        if child.createDom
          childDom = child.createDom(document)
          if childDom
            if @indentInsertString && (@indentAllChildren || i == 0)
              document.addTextNode(dom, @indentInsertString)
            dom.appendChild(childDom)
      if @indentInsertString
        document.addTextNode(dom, if @parent then @parent.indentInsertString else "\n")
      dom
    else
      null

# A wrapper for a browser DOM with convenience methods for creating nodes
class Document
  constructor: (@document) ->

  createNode: (tag, options) ->
    if !options
      options = {}
    dom = @document.createElement(tag)
    parent = options.parent
    if parent
      parent.appendChild(dom)
    className = options.className
    if className
      dom.className = className
    attributes = options.attributes
    if attributes
      for key, value of attributes
        dom.setAttribute(key, value)
    text = options.text
    if text
      dom.appendChild(@document.createTextNode(text))
    dom

  createTextNode: (text) ->
    @document.createTextNode(text)

  addTextNode: (dom, text) ->
    dom.appendChild(@document.createTextNode(text))


class BaseAttribute
  constructor: (@attributeName) ->
    @value = ""

  addTextChild: (string) ->
    @value = @value + string
 
  addChild: (child) ->
    throw new CompileError("Unexpected non-text element inside " + @attributeName + " attribute node", 
                           child.sourceLinePosition)
 
  addEndOfLineChild: ->
    @addTextChild("\n")
 
  addToParent: (parent) ->
    parent.setAttribute(@attributeName, @value)


class Bold extends BaseNode

  createInitialDom: (document) ->
    document.createNode("b")


class Italic extends BaseNode

  createInitialDom: (document) ->
    document.createNode("i")


class HrefAttribute extends BaseAttribute
  constructor: ->
    super("href")


class Link extends BaseNode

  classMap:
    href: HrefAttribute
  
  createInitialDom: (document) ->
    dom = document.createNode("a")
    href = @attributes.href
    if href
      dom.setAttribute("href", href)
    dom


exports.CompileError = CompileError
exports.NodeCompiler = NodeCompiler
exports.NodeParser = NodeParser
exports.TestTokenReceiver = TestTokenReceiver
exports.BracketupScanner = BracketupScanner
exports.Document = Document
exports.TextElement = TextElement
exports.BaseNode = BaseNode
exports.BaseAttribute = BaseAttribute
exports.Bold = Bold
exports.Italic = Italic
exports.HrefAttribute = HrefAttribute
exports.Link = Link
