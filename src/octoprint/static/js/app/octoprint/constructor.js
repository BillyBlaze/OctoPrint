var _octoprint = function(options) {
    this.viewModels._init.call(this);
    return this;
}

_octoprint.prototype = {
    constructor: _octoprint,

    options: {
        //default options
    },

    viewModels: {
        all: {},
        construct: {},
        bind: {}
    }
}
