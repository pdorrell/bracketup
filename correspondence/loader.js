function inspect(object) {return JSON.stringify(object);}

$(function () {
  new ScriptLoader([new ScriptDescriptor("test.js"), 
                    new ScriptDescriptor("test2.js")]).load(function () {
                      console.log("finished loading all the scripts");
                    });
});

function ScriptDescriptor(url) {
  this.url = url;
  this.loaded = false;
}

function ScriptLoader(descriptors) {
  this.descriptors = descriptors;
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
    console.log(" numloaded = " + this.numLoaded + ", from " + descriptor.url + ", loaded " + inspect(text));
    if (this.numLoaded == this.descriptors.length) {
      this.allScriptsLoaded(finished);
    }
  }, 
  allScriptsLoaded: function(finished) {
    console.log("ScriptLoader.allScriptsLoaded, now run the finish function ...");
    finished();
  }
};



