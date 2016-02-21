_octoprint.prototype.viewModels.bind = {
    _init: function() {
        var self = this;

        log.info("Going to bind " + _.size(this.viewModels.all) + " view models...");
        _.each(this.viewModels.all, function(viewModelData) {
            if (!viewModelData.elements.length) {
                return;
            }

            var viewModel = viewModelData.construct;
            var targets = viewModelData.elements;

            if (targets === undefined) {
                return;
            }

            if (!_.isArray(targets)) {
                targets = [targets];
            }

            if (viewModel.hasOwnProperty("onBeforeBinding")) {
                viewModelData.construct.onBeforeBinding.call(viewModel);
            }

            if (targets != undefined) {
                if (!_.isArray(targets)) {
                    targets = [targets];
                }

                viewModel._bindings = [];

                _.each(targets, function(target) {
                    if (target == undefined) {
                        return;
                    }

                    var object;
                    if (!(target instanceof jQuery)) {
                        object = $(target);
                    } else {
                        object = target;
                    }

                    if (object == undefined || !object.length) {
                        log.info("Did not bind view model", viewModel.constructor.name, "to target", target, "since it does not exist");
                        return;
                    }

                    var element = object.get(0);
                    if (element == undefined) {
                        log.info("Did not bind view model", viewModel.constructor.name, "to target", target, "since it does not exist");
                        return;
                    }

                    try {
                        ko.applyBindings(viewModel, element);
                        viewModel._bindings.push(target);

                        if (viewModel.hasOwnProperty("onBoundTo")) {
                            viewModel.onBoundTo.call(viewModel, target, element);
                        }

                        log.debug("View model", viewModel.constructor.name, "bound to", target);
                    } catch (exc) {
                        log.error("Could not bind view model", viewModel.constructor.name, "to target", target, ":", (exc.stack || exc));
                    }
                });
            }

            viewModel._unbound = viewModel._bindings != undefined && viewModel._bindings.length == 0;

            if (viewModel.hasOwnProperty("onAfterBinding")) {
                viewModel.onAfterBinding.call(viewModel);
            }
        });

        this.viewModels._emit(this.viewModels.all, "onAllBound", [this.viewModels.all]);
        log.info("... binding done");

        // startup complete
        this.viewModels._emit(this.viewModels.all, "onStartupComplete");

        // make sure we can track the browser tab visibility
        OctoPrint.coreui.onBrowserVisibilityChange(function(status) {
            log.debug("Browser tab is now " + (status ? "visible" : "hidden"));
            self.viewModels._emit(self.viewModels.all, "onBrowserTabVisibilityChange", [status]);
        });

    }
}
