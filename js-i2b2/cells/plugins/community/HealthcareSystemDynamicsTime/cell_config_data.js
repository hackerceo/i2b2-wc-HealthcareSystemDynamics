// this file contains a list of all files that need to be loaded dynamically for this i2b2 Cell
// every file in this list will be loaded after the cell's Init function is called
{
	files:[
		"HSDTime_render.js",
		"HSDTime_dataengine.js",
		"HSDTime_ctrlr.js",
		"lib/colorbrewer.js",
		"lib/d3-color.v1.min.js",
		"lib/d3-interpolate.v1.min.js",
		"lib/d3-scale-chromatic.v1.min.js"
	],
	css:[ 
		"vwHSDTime.css",
		"vizHSDTime.css"
	],
	config: {
		// additional configuration variables that are set by the system
		short_name: "Healthcare System Dynamics (Time Chart)",
		name: "Healthcare System Dynamics - HeatMap Time Chart Visualization",
		description: "This plugin displays Healthcare System Dynamics information using the HeatMap Time Chart Visualization",
		category: ["celless","plugin"],
		icons: { size32x32 : "HSDHeatMap_icon_32x32.png" },
		plugin: {
			isolateHtml: false,  // this means do not use an IFRAME
			isolateComm: false,  // this means to expect the plugin to use AJAX communications provided by the framework
			standardTabs: true,  // this means the plugin uses standard tabs at top
			html: {
				source: 'injected_screens.html',
				mainDivId: 'HSDTime-mainDiv'
			}
		},
		dropMsg: '<div class="psDropMsg">Drop the Control Patient Set here</div>'
	}
}