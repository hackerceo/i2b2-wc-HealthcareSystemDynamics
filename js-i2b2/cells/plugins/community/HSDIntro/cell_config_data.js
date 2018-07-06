// this file contains a list of all files that need to be loaded dynamically for this i2b2 Cell
// every file in this list will be loaded after the cell's Init function is called
{
	files:[
		"HSDIntro_ctrlr.js"
	],
	css:[
		"HSDIntro.css"
	],
	config: {
		// additional configuration variables that are set by the system
		short_name: "HSD - Introduction",
		name: "Healthcare System Dynamics - Introduction",
		description: "This plugin introduces the concept of Healthcare System Dynamics and provides an index to the data analysis and visualization plugins included in this package.",
		category: ["celless","plugin", "HSD"],
		plugin: {
			isolateHtml: false,  // this means do not use an IFRAME
			isolateComm: false,  // this means to expect the plugin to use AJAX communications provided by the framework
			standardTabs: true,  // this means the plugin uses standard tabs at top
			html: {
				source: 'injected_screens.html',
				mainDivId: 'HSDIntro-mainDiv'
			}
		}
	}
}