// this file contains a list of all files that need to be loaded dynamically for this i2b2 Cell
// every file in this list will be loaded after the cell's Init function is called
{
	files:[
		"HSDLabTestsSvr_render.js",
		"HSDLabTestsSvr_dataengine.js",
		"HSDLabTestsSvr_ctrlr.js",
        "HSD_server_comm.js",
		"lib/colorbrewer.js",
		"lib/d3-color.v1.min.js",
		"lib/d3-interpolate.v1.min.js",
		"lib/d3-scale-chromatic.v1.min.js"
	],
	css:[ 
		"vwHSDLabTestsSvr.css",
		"vizHSDLabTestsSvr.css"
	],
	config: {
		// additional configuration variables that are set by the system
		short_name: "HSD - Laboratory Tests (server-stats)",
		name: "Healthcare System Dynamics - Laboratory Tests (server-calculated)",
		description: "This plugin demonstrates how Healthcare System Dynamics can aid in the interpretation of laboratory test results. This plugin uses server-calculated statistics.",
		category: ["celless","plugin", "HSD"],
		plugin: {
			isolateHtml: false,  // this means do not use an IFRAME
			isolateComm: false,  // this means to expect the plugin to use AJAX communications provided by the framework
			standardTabs: true,  // this means the plugin uses standard tabs at top
			html: {
				source: 'injected_screens.html',
				mainDivId: 'HSDLabTestsSvr-mainDiv'
			}
		}
	}
}