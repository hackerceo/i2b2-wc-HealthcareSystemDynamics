{
	urlProxy: "index.php",
	urlFramework: "js-i2b2/",
	//-------------------------------------------------------------------------------------------
	// THESE ARE ALL THE DOMAINS A USER CAN LOGIN TO
	lstDomains: [
		{ domain: "i2b2demo",
		  name: "HarvardDemo",
		  urlCellPM: "http://services.i2b2.org/i2b2/services/PMService/",
		  allowAnalysis: true,
		  //installer: "/webclient/plugin_installer/",
		  debug: true
		},
		{ domain: "i2b2demo",
		  name: "WeberLabDemo-HSD",
		  urlCellPM: "http://staging.connects.catalyst.harvard.edu/i2b2demo/services/?/PMService/",
		  allowAnalysis: true,
		  //installer: "/webclient/plugin_installer/",
		  debug: true
		},
		{ domain: "i2b2demo",
		  name: "WeberLab-HSD_Latest",
		  urlCellPM: "http://weber.hms.harvard.edu/HealthcareSystemDynamics/i2b2dev/services/?/PMService/",
		  allowAnalysis: true,
		  debug: true
		}
	]
	//-------------------------------------------------------------------------------------------
}
