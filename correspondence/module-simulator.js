/* A script to manage require/exports in Javascript files loaded by the browser, so that the
   same files can be synchronously loaded and executed in either Node or the browser */

/** Javascript files to be loaded can (and should) be wrapped in anonymous function calls, which use
    "require" and "exports" as global variables, which this library manipulates directly. */

var MODULE_SIMULATOR = window.MODULE_SIMULATOR || {};

(function() {
  function inspect(object) {return JSON.stringify(object);}

  /** exports as filled in by each module */
  exports={};  // create empty exports map ready for first script to be loaded

  /** Accumulated list of loaded modules */
  var requires={};
  
  var scriptUrl;
  
  function ScriptUrl(url) {
    this.url = url;
    this.urlParts = url.split("/");
    this.pathParts = this.urlParts.slice(0, this.urlParts.length-1);
  }
  
  ScriptUrl.prototype = {
    toString: function() {
      return this.url;
    }, 
    resolveRelatively: function (relativeUrl) {
      var resolvedPath = [];
      for (var i=0; i<this.pathParts.length; i++) {
        var pathPart = this.pathParts[i];
        if(pathPart != ".") {
          resolvedPath.push(pathPart);
        }
      }
      var relativeUrlParts = relativeUrl.split("/");
      if (relativeUrlParts.length == 0) {
        throw new Error("Relative script URL " + inspect(relativeUrl.url) + " has no path elements"); 
      }
      var firstPart = relativeUrlParts[0];
      if (firstPart != "." && firstPart != "..") {
        throw new Error("Relative script URL " + inspect(relativeUrl.url) + " does not start with '.' or '..'");
      }
      for (var i=0; i<relativeUrlParts.length; i++) {
        var urlPart = relativeUrlParts[i];
        if(urlPart == ".") {
          // do nothing
        }
        else if (urlPart == "..") {
          if (resolvedPath.length == 0) {
            resolvedPath.push("..");
          }
          else {
            resolvedPath.pop();
          }
        }
        else {
          resolvedPath.push(urlPart);
        }
      }
      var resolvedPathParts = resolvedPath[0] == ".." ? resolvedPath : ["."].concat(resolvedPath);
      return resolvedPathParts.join("/");
    }
  };

  /** Call this method after loading a specific Javascript file, to save its
      CommonJS exports as a module with a name of your choice.*/
  function saveExports(moduleName) {
    requires[moduleName] = exports;
    exports = {}; // reset to empty exports map ready for next script to be loaded
  }

  /** Call this method before loading a specific Javascript file, to specify
      the resolution of all CommonJS "require" calls within the Javascript file.
      Each resolution entry maps a URL to a named module (as saved by saveExports) */
  function setRequires(requireMap) {
    require = function(url) {
      console.log("  requiring " + url + " ...");
      var moduleName = requireMap[url]; // look up module name by URL
      if (!moduleName) {
        moduleName = scriptUrl.resolveRelatively(url);
      }
      console.log("   resolved to " + moduleName);
      var module = requires[moduleName]; // look up module by module name
      if (!module) {
        throw new Error("Module " + moduleName + " does not exist");
      }
      return module;
    }
  }
  
  MODULE_SIMULATOR.startScript = function(url, requireMap) {
    console.log("MODULE_SIMULATOR.startScript " + url);
    setRequires(requireMap ? requireMap : {});
    scriptUrl = new ScriptUrl(url);
  }
  
  MODULE_SIMULATOR.endScript = function() {
    console.log("MODULE_SIMULATOR.endScript " + scriptUrl.url);
    saveExports(scriptUrl.url);
    scriptUrl = null;
  }

})();
