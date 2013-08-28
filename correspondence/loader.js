function inspect(object) {return JSON.stringify(object);}

$(function () {
  new ScriptLoader([new ScriptDescriptor("test.js"), 
                    new ScriptDescriptor("test2.js"), 
                    new ScriptDescriptor("test3.js")]).load(function () {
                      console.log("finished loading all the scripts");
                    });
});

function ScriptDescriptor(url) {
  this.url = url;
}

ScriptDescriptor.prototype = {
  runScript: function(descriptorByUrl) {
    window.exports = {};
    console.log("Running " + this.url + " ...");
    eval(this.source);
    this.exports = window.exports;
    window.require = function(url) {
      var requiredDescriptor = descriptorByUrl[url];
      if (!requiredDescriptor) {
        throw new Error("Fail to resolve required URL " + url + " from within script " + this.url);
      }
      return descriptorByUrl[url].exports;
    }
    for (name in this.exports) {
      console.log(" exported " + name + " = " + window.exports[name]);
    }
    console.log("");
  }
};

function ScriptLoader(descriptors) {
  this.descriptors = descriptors;
  this.descriptorByUrl = {};
  for (var i=0; i<descriptors.length; i++) {
    var descriptor = descriptors[i];
    this.descriptorByUrl[descriptor.url] = descriptor;
  }
  this.numLoaded = 0;
}
  
ScriptLoader.prototype = {
  load: function(finished) {
    console.log("ScriptLoader.load ...");
    for (var i=0; i<this.descriptors.length; i++) {
      this.loadScript(this.descriptors[i], finished);
    }
  }, 
  loadScript: function(descriptor, finished) {
    var $this = this;
    $.get(descriptor.url, null, function(text) {
      $this.scriptLoaded(descriptor, text, finished);
    });
  }, 
  scriptLoaded: function(descriptor, text, finished) {
    this.numLoaded++;
    //console.log(" numloaded = " + this.numLoaded + ", from " + descriptor.url + ", loaded " + inspect(text));
    descriptor.source = text;
    if (this.numLoaded == this.descriptors.length) {
      this.allScriptsLoaded(finished);
    }
  }, 
  allScriptsLoaded: function(finished) {
    console.log("");
    for (var i=0; i<this.descriptors.length; i++) {
      this.descriptors[i].runScript(this.descriptorByUrl);
    }
    console.log("ScriptLoader.allScriptsLoaded, now run the finish function ...");
    finished();
  }
};



