i2b2.HSDIntro.Init = function(loadedDiv) {
	// manage YUI tabs
	this.yuiTabs = new YAHOO.widget.TabView("HSDIntro-TABS", {activeIndex:0});

	// fix the directory of the icons
	jQuery("img",loadedDiv).attr("src", (function(i,d) {
		return this.cfg.baseDir+"assets/"+d;
	}).bind(this))

	// load the correct plugin on click of its load button
	jQuery("button",loadedDiv).click(function() {
		alert(this.dataset.i2b2Plugincode);
		i2b2.PLUGINMGR.ctrlr.main.selectPlugin(this.dataset.i2b2Plugincode);
	});
};

