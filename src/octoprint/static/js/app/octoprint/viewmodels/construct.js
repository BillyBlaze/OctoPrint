_octoprint.prototype.viewModels.construct = {

    defaults: {
        construct: null,
        dependencies: [],
        elements: [],
        optional: [],
        isConstructed: false,
        tries: 0
    },

    _init: function() {
        var self = this;

        // the view model map is our basic look up table for dependencies that may be injected into other view models
        var viewModelMap = {};

        // Fix Function#name on browsers that do not support it (IE):
        // see: http://stackoverflow.com/questions/6903762/function-name-not-supported-in-ie
        if (!(function f() {}).name) {
            Object.defineProperty(Function.prototype, 'name', {
                get: function() {
                    return this.toString().match(/^\s*function\s*(\S*)\s*\(/)[1];
                }
            });
        }

        // map any additional view model bindings we might need to make
        var additionalBindings = {};
        _.each(OCTOPRINT_ADDITIONAL_BINDINGS, function(bindings) {
            var viewModelId = bindings[0];
            var viewModelBindTargets = bindings[1];
            if (!_.isArray(viewModelBindTargets)) {
                viewModelBindTargets = [viewModelBindTargets];
            }

            if (!additionalBindings.hasOwnProperty(viewModelId)) {
                additionalBindings[viewModelId] = viewModelBindTargets;
            } else {
                additionalBindings[viewModelId] = additionalBindings[viewModelId].concat(viewModelBindTargets);
            }
        });

        // helper for translating the name of a view model class into an identifier for the view model map
        var _getViewModelId = function(name){
            return name.substr(0, 1).toLowerCase() + name.substr(1); // FooBarViewModel => fooBarViewModel
        };

        // instantiation loop, will make multiple passes over the list of unprocessed view models until all
        // view models have been successfully instantiated with all of their dependencies or no changes can be made
        // any more which means not all view models can be instantiated due to missing dependencies
        var unprocessedViewModels = OCTOPRINT_VIEWMODELS.slice();
            unprocessedViewModels = unprocessedViewModels.concat(ADDITIONAL_VIEWMODELS);

        var allViewModels = {},
            arrayMap = ["construct", "dependencies", "elements", "optional"]

        // store all viewModels into an object after setting defaults values
        _.each(unprocessedViewModels, function(viewModel, i) {

            viewModel = (_.isArray(viewModel)) ? _.object(arrayMap, viewModel) : viewModel;
            viewModel = (_.isFunction(viewModel)) ? { construct: viewModel } : viewModel;

            viewModel = _.defaults(viewModel, self.viewModels.construct.defaults);

            // make sure we have atleast a function
            if (!_.isFunction(viewModel.construct)) {
                log.error("No function to instantiate with", viewModel);
                return;
            }

            // if name is not set, get name from constructor, if it's an anonymous function generate one
            viewModel.name = viewModel.name || _getViewModelId(viewModel.construct.name) || _.uniqueId("unnamedViewModel");

            // make sure all value's are in an array
            viewModel.dependencies = (_.isArray(viewModel.dependencies)) ? viewModel.dependencies : [viewModel.dependencies];
            viewModel.elements = (_.isArray(viewModel.elements)) ? viewModel.elements : [viewModel.elements];
            viewModel.optional = (_.isArray(viewModel.optional)) ? viewModel.optional : [viewModel.optional];

            // store into main variable
            allViewModels[viewModel.name] = viewModel;
        });

        // sort viewModels by least dependecies required to high
        var processList =_.sortBy(allViewModels, function(e) {
            return e.dependencies.length;
        });

        while (processList.length > 0) {
            var viewModel = processList.shift();

            // if we have dependecies to process
            if(viewModel.dependencies.length) {
                var availableDeps = _.mapValues(_.pick(allViewModels, viewModel.dependencies), 'isConstructed');

                // check if any of the required dependecies is not yet constructed and postpone it
                if(_.values(availableDeps).indexOf(false) !== -1) {
                    viewModel.tries++;
                    processList.push(viewModel);
                    log.debug("Postponing", viewModel.name, "due to missing parameters:", _.keys(_.omit(availableDeps, _.identity)));
                    continue;
                }

            }

             try {

                // mirror the requested dependencies with an array of the viewModels
                var viewModelParametersMap = function(parameter) {
                    // check if parameter is found within optional array and if all conditions are met return null instead of undefined
                    if (viewModel.optional.indexOf(parameter) !== -1 && !allViewModels[parameter]) {
                        log.debug("Resolving optional parameter", [parameter], "without viewmodel");
                        return null;
                    }

                    return (allViewModels[parameter]) ? allViewModels[parameter].construct : undefined;
                };

                // try to resolve all of the view model's constructor parameters via our view model map
                var constructorParameters = _.map(viewModel.dependencies, viewModelParametersMap) || [];

                // throw an error if a viewModel returned undefined
                if(constructorParameters.indexOf(undefined) !== -1) {
                    delete allViewModels[viewModel.name];
                    log.error("Could not instantiate the following view models due to unresolvable dependencies:");
                    log.error(viewModel.name + " missing: ", _.keys(_.pick(_.object(viewModel.dependencies, constructorParameters), _.isUndefined)));
                    continue;
                }

                // transform array into object if a plugin wants it as an object
                constructorParameters = (viewModel.returnObject) ? _.object(viewModel.dependencies, constructorParameters) : constructorParameters;

                // if we came this far then we could resolve all constructor parameters, so let's construct that view model
                allViewModels[viewModel.name].construct = new viewModel.construct(constructorParameters);
                allViewModels[viewModel.name].isConstructed = true;
                log.debug("Constructing", viewModel.name, "with parameters:", viewModel.dependencies);

            } catch(err) {

                log.error("Failed constructing", viewModel.name);
                throw err;

                delete allViewModels[viewModel.name];
                allViewModels[viewModel.name].isConstructed = false;

            }
        }

        return allViewModels;
    }
}
