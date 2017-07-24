/**
 * @projectDescription	Processors that return bucket coordinates for the visualization to process the data.
 * @inherits	i2b2
 * @namespace	i2b2.HealthcareSystemDynamicsTime
 * @author		Nick Benik
 * @version 	1.0
 * ----------------------------------------------------------------------------------------
 * 2016-06-08:  Initial Launch [Nick Benik]
 */


i2b2.HealthcareSystemDynamicsTime.dataengine = {
	segmentors: {}, // This is extended below
	axisXCalcs: [	{funcName:"segmentTestHNL", dispName:"Low / Normal / High (Lab Flag)"},
			{funcName:"segmentTestNA", dispName:"Normal / Abnormal (Lab Flag)"} ],
	axisYCalcs: [	{funcName:"segment24Hours", dispName:"Hourly (24 hrs)"},
			{funcName:"segment8Hours", dispName:"By Shift (8 hr blocks)"},
			{funcName:"segmentDayOfWeek", dispName:"Day of Week"},
			{funcName:"segmentWeekdayWeekend", dispName:"Weekend vs Weekday"},
			{funcName:"segmentMonthly", dispName:"Monthly"},
			{funcName:"segmentSeasons", dispName:"By 3 Month Blocks"}]
};


/* ======================================================================================================================= */

i2b2.HealthcareSystemDynamicsTime.dataengine.segmentors.segmentMonthly = {
	getDimRange: function() {
		return [0,11];
	},
	getDimSize: function() {
		return 12;
	},
	getAxisLabel: function(patientset, labtest, outcome) {
		return "HSD: Monthly";
	},
	getDimLabels: function() {
		return ["January",
			 "February",
			 "March",
			 "April",
			 "May",
			 "June",
			 "July",
			 "August",
			 "September",
			 "October",
			 "November",
			 "December"];
	},
	doSegment: function(xmlNode) {
		var temp = new Date(Date.parse(i2b2.h.getXNodeVal(xmlNode, 'start_date')));
		return temp.getMonth();
	}
};


i2b2.HealthcareSystemDynamicsTime.dataengine.segmentors.segmentSeasons = {
	getDimRange: function() {
		return [0,3];
	},
	getDimSize: function() {
		return 4;
	},
	getAxisLabel: function(patientset, labtest, outcome) {
		return "HSD: Monthly - 3 Month Blocks";
	},
	getDimLabels: function() {
		return ["Winter",
			 "Spring",
			 "Summer",
			 "Fall"];
	},
	doSegment: function(xmlNode) {
		var temp = new Date(Date.parse(i2b2.h.getXNodeVal(xmlNode, 'start_date')));
		temp = temp.getMonth();
		switch(temp) {
			case 0:
			case 1:
			case 2:
				// Winter
				return 0; 
			case 3:
			case 4:
			case 5:
				// Spring
				return 1;
			case 6:
			case 7:
			case 8:
				// Summer
				return 2;
			case 9:
			case 10:
			case 11:
				// Fall
				return 3;
		}
	}
};



i2b2.HealthcareSystemDynamicsTime.dataengine.segmentors.segment24Hours = {
	getDimRange: function() {
		return [0,23];
	},
	getDimSize: function() {
		return 24;
	},
	getAxisLabel: function(patientset, labtest, outcome) {
		return "HSD: Time of Day - Hourly View";
	},
	getDimLabels: function() {
		return ["Midnight-1am",
			 "1am-2am",
			 "2am-3am",
			 "3am-4am",
			 "4am-5am",
			 "5am-6am",
			 "6am-7am",
			 "7am-8am",
			 "8am-9am",
			 "9am-10am",
			 "10am-11am",
			 "11am-Noon",
			 "Noon-1pm",
			 "1pm-2pm",
			 "2pm-3pm",
			 "3pm-4pm",
			 "4pm-5pm",
			 "5pm-6pm",
			 "6pm-7pm",
			 "7pm-8pm",
			 "8pm-9pm",
			 "9pm-10pm",
			 "10pm-11pm",
			 "11pm-Midnight" ];
	},
	doSegment: function(xmlNode) {
		var temp = new Date(Date.parse(i2b2.h.getXNodeVal(xmlNode, 'start_date')));
		return temp.getHours();
	}
};



i2b2.HealthcareSystemDynamicsTime.dataengine.segmentors.segment8Hours = {
	getDimRange: function() {
		return [0,2];
	},
	getDimSize: function() {
		return 3;
	},
	getAxisLabel: function(patientset, labtest, outcome) {
		return "HSD: Time of Day";
	},
	getDimLabels: function() {
		return ["Midnight-8am",
			 "8am-4pm",
			 "4pm-Midnight" ];
	},
	doSegment: function(xmlNode) {
		var temp = new Date(Date.parse(i2b2.h.getXNodeVal(xmlNode, 'start_date')));
		temp = temp.getHours();
		if (temp <= 8) 		 { return 0; }
		if (temp > 8 && temp <= 16) { return 1; }
		if (temp > 16) 		 { return 2; }
	}
};




i2b2.HealthcareSystemDynamicsTime.dataengine.segmentors.segmentDayOfWeek = {
	getDimRange: function() {
		return [0,6];
	},
	getDimSize: function() {
		return 7;
	},
	getAxisLabel: function(patientset, labtest, outcome) {
		return "HSD: Day of Week";
	},
	getDimLabels: function() {
		return ["Sunday",
			 "Monday",
			 "Tuesday",
			 "Wednesday",
			 "Thursday",
			 "Friday",
			 "Saturday"];
	},
	doSegment: function(xmlNode) {
		var temp = new Date(Date.parse(i2b2.h.getXNodeVal(xmlNode, 'start_date')));
		return temp.getDay();
	}
};



i2b2.HealthcareSystemDynamicsTime.dataengine.segmentors.segmentWeekdayWeekend = {
	getDimRange: function() {
		return [0,1];
	},
	getDimSize: function() {
		return 2;
	},
	getAxisLabel: function(patientset, labtest, outcome) {
		return "HSD: Weekend vs. Weekday";
	},
	getDimLabels: function() {
		return ["Weekend",
			 "Weekday"];
	},
	doSegment: function(xmlNode) {
		var temp = new Date(Date.parse(i2b2.h.getXNodeVal(xmlNode, 'start_date')));
		temp = temp.getDay();
		if (temp == 0 || temp == 6) { 
			return 0; 
		} else {
			return 1;
		}
	
	}
};



/* ======================================================================================================================= */



i2b2.HealthcareSystemDynamicsTime.dataengine.segmentors.segmentTestHNL = {
	getDimRange: function() {
		return [0,2];
	},
	getDimSize: function() {
		return 3;
	},
	getAxisLabel: function(patientset, labtest, outcome) {
		return "Pathophysiology: "+labtest.sdxInfo.sdxDisplayName;
	},
	getDimLabels: function() {
		return ["Low Lab Results",
			 "Normal Lab Results",
			 "High Lab Results"];
	},
	doSegment: function(xmlNode) {
		switch (i2b2.h.getXNodeVal(xmlNode, 'valueflag_cd')) {
			case "L":
				return 0;
				break;
			case "H":
				return 2;
				break;
			default:
				return 1;
				break;
		}
	}
};


i2b2.HealthcareSystemDynamicsTime.dataengine.segmentors.segmentTestNA = {
	getDimRange: function() {
		return [0,1];
	},
	getDimSize: function() {
		return 2;
	},
	getAxisLabel: function(patientset, labtest, outcome) {
		return "Pathophysiology: "+labtest.sdxInfo.sdxDisplayName;
	},
	getDimLabels: function() {
		return ["Normal Lab Results",
			 "Abnormal Lab Results"];
	},
	doSegment: function(xmlNode) {
		if (i2b2.h.getXNodeVal(xmlNode, 'valueflag_cd') == "A") {
			// ABNORMAL
			return 1;
		} else {
			// NORMAL
			return 0;
		}
	}
};


