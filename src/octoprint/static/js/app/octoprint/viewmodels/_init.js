_octoprint.prototype.viewModels._init = function() {
    var self = this;

    this.viewModels.all = this.viewModels.construct._init.call(this);

    //TODO: Do something with this
    var dataUpdaterViewModel = new DataUpdater(this.viewModels.all);

    this.viewModels._emit(this.viewModels.all, "onStartup");

    if (!this.viewModels.all.settingsViewModel) {
        throw new Error("settingsViewModel is missing, can't run UI");
    }

    this.viewModels.all.settingsViewModel.construct.requestData()
        .done(function() {
            self.viewModels.bind._init.call(self);
        });

}
