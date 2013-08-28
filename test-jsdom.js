var utils = require("./utils.js");
var merge = utils.merge;
var inspect = utils.inspect;

var jsdom = require("jsdom").jsdom;

console.log("jsdom = " + inspect(jsdom));

var document = jsdom(null, null, {});
          
console.log("document = " + document.outerHTML);

var body = document.body;

var p = document.createElement("p");
p.className = "myClass";
p.dataset = {};
p.setAttribute("data-goodness", 35);
body.appendChild(p);

var t=document.createTextNode("Hello World");
p.appendChild(t);

console.log("document = " + document.outerHTML);
