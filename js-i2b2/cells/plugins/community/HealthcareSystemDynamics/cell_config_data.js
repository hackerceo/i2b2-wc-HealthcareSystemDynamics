// this file contains a list of all files that need to be loaded dynamically for this i2b2 Cell
// every file in this list will be loaded after the cell's Init function is called
{
	files:[
		"HealthcareSystemDynamics_ctrlr.js",
		"HealthcareSystemDynamics_data_engine.js",
		"HealthcareSystemDynamics_vizIsobars.js",
		"HealthcareSystemDynamics_vizHistogram.js",
		"colorbrewer.js"
	],
	css:[ 
		"vwHealthcareSystemDynamics.css",
		"vizHealthcareSystemDynamics.css"
	],
	config: {
		// additional configuration variables that are set by the system
		short_name: "Healthcare System Dynamics (Local)",
		name: "Healthcare System Dynamics",
		description: "This plugin displays locally computed Healthcare System Dynamics information",
		category: ["celless","plugin"],
		icons: { size32x32 : "HSDFactCount_icon_32x32.png" },
		plugin: {
			isolateHtml: false,  // this means do not use an IFRAME
			isolateComm: false,  // this means to expect the plugin to use AJAX communications provided by the framework
			standardTabs: true,  // this means the plugin uses standard tabs at top
			html: {
				source: 'injected_screens.html',
				mainDivId: 'HealthcareSystemDynamics-mainDiv'
			}
		},
		dropMsg: '<div class="psDropMsg">Drop the Control Patient Set here</div>'
	},
}