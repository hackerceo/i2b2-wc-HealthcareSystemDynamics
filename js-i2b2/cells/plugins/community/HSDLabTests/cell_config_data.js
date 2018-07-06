// this file contains a list of all files that need to be loaded dynamically for this i2b2 Cell
// every file in this list will be loaded after the cell's Init function is called
{
	files:[
		"HSDLabTests_render.js",
		"HSDLabTests_dataengine.js",
		"HSDLabTests_ctrlr.js",
		"lib/colorbrewer.js",
		"lib/d3-color.v1.min.js",
		"lib/d3-interpolate.v1.min.js",
		"lib/d3-scale-chromatic.v1.min.js"
	],
	css:[ 
		"vwHSDLabTests.css",
		"vizHSDLabTests.css"
	],
	config: {
		// additional configuration variables that are set by the system
		short_name: "HSD - Laboratory Tests",
		name: "Healthcare System Dynamics - Laboratory Tests",
		description: "This plugin demonstrates how Healthcare System Dynamics can aid in the interpretation of laboratory test results.",
		category: ["celless","plugin","HSD"],
		plugin: {
			isolateHtml: false,  // this means do not use an IFRAME
			isolateComm: false,  // this means to expect the plugin to use AJAX communications provided by the framework
			standardTabs: true,  // this means the plugin uses standard tabs at top
			html: {
				source: 'injected_screens.html',
				mainDivId: 'HSDLabTests-mainDiv'
			}
		}
	}
}