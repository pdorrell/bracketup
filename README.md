Bracketup
=========

**Bracketup** is a simple generic markup language which provides a framework
for defining application-specific markup languages.

It's main intended use is to create structured content that supports specific
interaction models in a web browser.

The one current working example is **correspondence-bracketup**, which provides
markup to support [Correspondence](http://pdorrell.github.io/correspondence/).
An actual page example is at http://pdorrell.github.io/bracketup/correspondence/rhoScriptExample.html,
and the markup can be seen inside the source for that web page.

Syntax Rules
------------

The syntax rules for **Bracketup** are very simple:

* A **Bracketup** document consists of an element, which contains the following:
  * Opening square bracket, i.e. **[**.
  * Zero or more comma-separated **identifiers** (with no whitespace before or after the commas)
  * Optional whitespace following the identifiers. (If the identifiers
    are followed by alphabet plain text, then there has to be at least one whitespace character between
    the last identifier and the beginning of the plain text.)
  * One or more **children**.
  * Closing square bracket, i.e. **]**.

**Children** can be either of the following:
  * Plain text
  * Elements

Plain text consists of any characters, but the characters "]", "[" and "\" must be quoted
by the backslash character "\".

Identifiers may contain any alphabetic characters, digits, or the characters "_" "-".
The character "_" at the beginning of an identifier is given a special meaning. Identifiers are suitable
for specifying things such as HTML element ids and CSS class names. Application data requiring a larger
character set, for example URLs, can be nested within appropriate child elements.

Every element has a **function**, which is specified by the first identifier in the comma-separated
list. Any other identifiers in the list are passed as arguments to the functions.

However, a function may specify a default function for child elements, in which case this function
does not need to be specified, and any identifiers given in child elements are treated as arguments
to the default function.

Where there is a default child element function, a function can be specified explicitly by prepending
"_" to the function name. This initial "_" will be removed, and the remainder of the name specifies the
actual function name. (It follows that "_" should not be used as a prefix for argument values, as this
will lead to confusion in certain cases.)

Interpretation
--------------

The syntax and markup structure given above does not specify any particular interpretation of the data.
However the **Bracketup** Javascript code provided in this project does support a specify type of interpretation.

Typically, an element will correspond to a Javascript object which is used to generate a DOM element
in the browser. Most child elements will represent child DOM elements of the parent's DOM element.
However in some cases a child element may indicate an action performed on the parent element, for example
setting an attribute value that cannot be specified as a function argument (because it requires a larger
character set than allowed for identifiers). A specific example would be specifying the "href" attribute 
on an element that generates an **<a>** HTML link element.

**bracketup.js** provides a simple implementation of functions, where the function names are mapped to
Javascript constructor functions, and the constructors construct Javascript objects, which, by default,
have a **createDom** element, which given a suitable **document** object, generates an HTML DOM element.
Default child element functions are specified by the **defaultChildFunction** property
on the parent element's constructor prototype.
