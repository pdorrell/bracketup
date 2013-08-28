function inspect(object) {return JSON.stringify(object);}

$(function () {
  new ScriptLoader([new ScriptDescriptor("test.js"), 
                    new ScriptDescriptor("test2.js")]).load();
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
  load: function() {
    for (var i=0; i<this.descriptors.length; i++) {
      this.loadScript(this.descriptors[i]);
    }
  }, 
  loadScript: function(descriptor) {
    var $this = this;
    $.get(descriptor.url, null, function(text) {
      $this.scriptLoaded(descriptor, text);
    });
  }, 
  scriptLoaded: function(descriptor, text) {
    this.numLoaded++;
    console.log("numloaded = " + this.numLoaded + ", from " + descriptor.url + ", loaded " + inspect(text));
  }
};



