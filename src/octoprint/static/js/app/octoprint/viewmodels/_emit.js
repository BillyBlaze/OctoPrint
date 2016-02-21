_octoprint.prototype.viewModels._emit = function(allViewModels, method, callback) {
    this._emitIf( allViewModels, method, undefined, callback );
}

_octoprint.prototype.viewModels._emitIf = function(allViewModels, method, condition, callback) {
    if (condition == undefined || !_.isFunction(condition)) {
        condition = function() { return true; };
    }

    var parameters = undefined;
    if (!_.isFunction(callback)) {
        // if callback is not a function that means we are supposed to directly
        // call the view model method instead of providing it to the callback
        // - let's figure out how

        if (callback == undefined) {
            // directly call view model method with no parameters
            parameters = undefined;
            log.trace("Calling method", method, "on view models");
        } else if (_.isArray(callback)) {
            // directly call view model method with these parameters
            parameters = callback;
            log.trace("Calling method", method, "on view models with specified parameters", parameters);
        } else {
            // ok, this doesn't make sense, callback is neither undefined nor
            // an array, we'll return without doing anything
            return;
        }

        // we reset this here so we now further down that we want to call
        // the method directly
        callback = undefined;
    } else {
        log.trace("Providing method", method, "on view models to specified callback", callback);
    }

    _.each(allViewModels, function(viewModel) {
		viewModel = viewModel.construct;
        if (viewModel.hasOwnProperty(method) && condition(viewModel, method)) {
            if (callback == undefined) {
                if (parameters != undefined) {
                    // call the method with the provided parameters
                    viewModel[method].apply(viewModel, parameters);
                } else {
                    // call the method without parameters
                    viewModel[method]();
                }
            } else {
                // provide the method to the callback
                callback(viewModel[method]);
            }
        }
    });
}
