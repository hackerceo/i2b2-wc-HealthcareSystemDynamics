// this file contains a list of all files that need to be loaded dynamically for this i2b2 Cell
// every file in this list will be loaded after the cell's Init function is called
{
	files:[
		"HSDFactCounts_ctrlr.js",
		"HSDFactCounts_data_engine.js",
		"HSDFactCounts_vizIsobars.js",
		"HSDFactCounts_vizHistogram.js",
		"colorbrewer.js"
	],
	css:[ 
		"vwHSDFactCounts.css",
		"vizHSDFactCounts.css"
	],
	config: {
		// additional configuration variables that are set by the system
		short_name: "HSD - Fact Count",
		name: "Healthcare System Dynamics - Fact Count",
		description: "This plugin compares the fact count distributions (the total number of data points in a patient record) of multiple patient cohorts.",
		category: ["celless","plugin","HSD"],
		plugin: {
			isolateHtml: false,  // this means do not use an IFRAME
			isolateComm: false,  // this means to expect the plugin to use AJAX communications provided by the framework
			standardTabs: true,  // this means the plugin uses standard tabs at top
			html: {
				source: 'injected_screens.html',
				mainDivId: 'HSDFactCounts-mainDiv'
			}
		},
		dropMsg: '<div class="psDropMsg">Drop the Control Patient Set here</div>'
	}
}