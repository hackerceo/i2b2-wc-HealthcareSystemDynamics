// this file contains a list of all files that need to be loaded dynamically for this i2b2 Cell
// every file in this list will be loaded after the cell's Init function is called
{
	files:[
		"HSDFactCountsSvr_ctrlr.js",
		"HSDFactCountsSvr_data_engine.js",
		"HSDFactCountsSvr_vizIsobars.js",
		"HSDFactCountsSvr_vizHistogram.js",
		"HSDFactCountsSvr_server_comm.js",
		"lib/colorbrewer.js"
	],
	css:[ 
		"vwHSDFactCountsSvr.css",
		"vizHSDFactCountsSvr.css"
	],
	config: {
		// additional configuration variables that are set by the system
		short_name: "HSD - Fact Count (server-stats)",
		name: "Healthcare System Dynamics - Fact Count (server-calculated)",
		description: "This plugin compares the fact count distributions (the total number of data points in a patient record) of multiple patient cohorts. This plugin uses server-calculated statistics.",
		category: ["celless","plugin","HSD"],
		plugin: {
			isolateHtml: false,  // this means do not use an IFRAME
			isolateComm: false,  // this means to expect the plugin to use AJAX communications provided by the framework
			standardTabs: true,  // this means the plugin uses standard tabs at top
			html: {
				source: 'injected_screens.html',
				mainDivId: 'HSDFactCountsSvr-mainDiv'
			}
		},
		dropMsg: '<div class="psDropMsg">Drop the Control Patient Set here</div>'
	}
}