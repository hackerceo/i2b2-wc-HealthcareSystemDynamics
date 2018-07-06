/**
 * @projectDescription	Processors that return bucket coordinates for the visualization to process the data.
 * @inherits	i2b2
 * @namespace	i2b2.HSDLabTests
 * @author		Nick Benik
 * @version 	1.0
 * ----------------------------------------------------------------------------------------
 * 2016-06-08:  Initial Launch [Nick Benik]
 */


i2b2.HSDLabTests.dataengine = {
	segmentors: {}, // This is extended below
	axisXCalcs: [	{funcName:"segmentTestHNL", dispName:"Low / Normal / High (Lab Flag)"},
			{funcName:"segmentTestNA", dispName:"Normal / Abnormal (Lab Flag)"} ],
	axisYCalcs: [	{funcName:"segment24Hours", dispName:"Hourly (24 hrs)"},
			{funcName:"segment8Hours", dispName:"By Shift (8 hr blocks)"},
			{funcName:"segmentDayOfWeek", dispName:"Day of Week"},
			{funcName:"segmentWeekdayWeekend", dispName:"Weekend vs Weekday"},
			{funcName:"segmentMonthly", dispName:"Monthly"},
			{funcName:"segmentSeasons", dispName:"By 3 Month Blocks"}],


	process: function(data, rowSegmentor, colSegmentor, patientset, labtest, outcome) {
		var ret = { // processed data to be returned
			axis: {
				x:{
                    label: rowSegmentor.getAxisLabel(patientset, labtest, outcome),
					segments: []
				},
				y:{
					label: colSegmentor.getAxisLabel(patientset, labtest, outcome),
                    segments: []
				}
			},
            cells: []
        };

	if (data.refXML !== "undefined") {
		data = data.refXML;
	}

        // Get list of all patients
        var patient_cohorts = {};
        var patient_nodes = i2b2.h.XPath(data, '//patient/patient_id/text()')
        var l = patient_nodes.length;
        for (var i=0; i<l; i++) {
            patient_cohorts[patient_nodes[i].nodeValue] = false;
        }
        // mark the positive outcome cohorts
        var cohorts = i2b2.h.XPath(data, '//observation[../@panel_name="cohort_outcome"]');
        cohorts.forEach((function(d, i) { this[i2b2.h.getXNodeVal(d,'patient_id')] = true; }).bind(patient_cohorts));

        // initialize statistic arrays
        var pt_matrix = [];
        var totals_matrix = [];
        var dim_x = colSegmentor.getDimRange();
        var dim_y = rowSegmentor.getDimRange();
        for (var x=dim_x[0]; x <= dim_x[1]; x++) {
            totals_matrix[x] = [];
            pt_matrix[x] = [];
            for (var y=dim_y[0]; y <= dim_y[1]; y++) {
                totals_matrix[x][y] = {pos:0, neg:0};
                pt_matrix[x][y] = 0;
            }
        }
        var jsonBlankMatrix = JSON.stringify(pt_matrix);


        // now process each patent and create a matrix of lab test values and times
        pids = d3.keys(patient_cohorts);
        while (pids.length) {
            // get the patient's lab observations
            var patient_id = pids.pop();
            var pt_labs = i2b2.h.XPath(data, '//observation[../@panel_name="lab_tests" and patient_id = "'+patient_id+'"]');

            // clear the patient matrix
            pt_matrix = JSON.parse(jsonBlankMatrix);

            // process labs into patient matrix
            while (pt_labs.length > 0) {
                var pt_lab = pt_labs.pop();
                pt_matrix[colSegmentor.doSegment(pt_lab)][rowSegmentor.doSegment(pt_lab)] = 1;
            }

            // merge the paient values into the running dataset
            if (patient_cohorts[patient_id]) {
                var pt_cohort = "pos";
            } else {
                var pt_cohort = "neg";
            }
            pt_matrix.forEach(function(col, x) {
                col.forEach(function(xy_val, y) {
                    totals_matrix[x][y][pt_cohort] = totals_matrix[x][y][pt_cohort] + xy_val;
                });
            });
        }

        // All data has been processed, generate summary counts
        var apply_cell_function = function(matrix, apply_func) {
            matrix.forEach(function(col, x) {
                col.forEach(function(xy_val, y) {
                    apply_func(matrix, x, y, xy_val);
                });
            });
        }

        apply_cell_function(
            totals_matrix,
            function(matrix, x, y, cell_val) {
                matrix[x][y].cohort = cell_val.pos + cell_val.neg;
                matrix[x][y].pos_outcome_percent = cell_val.pos / (cell_val.pos + cell_val.neg);
                if (isNaN(matrix[x][y].pos_outcome_percent)) { matrix[x][y].pos_outcome_percent = 0; }
            }
        );
		// save results to the return variable
        ret.cells = totals_matrix;

        // generate summary data for columns and rows
        var apply_col_row_function = function(matrix, apply_func) {
            var ret = {rows: [], cols: []};
            var cx = matrix.length;
            var cy = matrix[0].length;
            // -- run against columns
            for (var x=0; x < cx; x++) {
                var list = [];
                for (var y=0; y < cy; y++) {
                    list.push(matrix[x][y]);
                }
                ret.cols[x] = apply_func(list);
            }
            // -- run against rows
            for (var y=0; y < cy; y++) {
                var list = [];
                for (var x=0; x < cx; x++) {
                    list.push(matrix[x][y]);
                }
                ret.rows[y] = apply_func(list);
            }
            return ret;
        };

		var summaryCounts = apply_col_row_function(
            totals_matrix,
            function(values_list) {
                var ret = {
                    min_outcome_percent: Infinity,
                    max_outcome_percent: -Infinity,
                    count_cohort: 0,
                    count_pos: 0,
                    count_neg: 0
                };
                while (values_list.length > 0) {
                    var temp = values_list.pop();
                    ret.count_pos = ret.count_pos + temp.pos;
                    ret.count_neg = ret.count_neg + temp.neg;
                    ret.min_outcome_percent = Math.min(temp.pos_outcome_percent, ret.min_outcome_percent);
                    ret.max_outcome_percent = Math.max(temp.pos_outcome_percent, ret.max_outcome_percent);
                }
                ret.count_cohort = ret.count_pos + ret.count_neg;
                return ret;
            }
        );

		//  save the summary counts to the return variable
        ret.axis.x.segments = summaryCounts.cols;
        ret.axis.y.segments = summaryCounts.rows;

        // get the segment labels
		var temp = rowSegmentor.getDimLabels();
		for (var i = 0; i < temp.length; i++) {
            ret.axis.y.segments[i].label = temp[i];
		}
        var temp = colSegmentor.getDimLabels();
        for (var i = 0; i < temp.length; i++) {
            ret.axis.x.segments[i].label = temp[i];
        }


        return ret;
    }
};


/* ======================================================================================================================= */

i2b2.HSDLabTests.dataengine.segmentors.segmentMonthly = {
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


i2b2.HSDLabTests.dataengine.segmentors.segmentSeasons = {
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



i2b2.HSDLabTests.dataengine.segmentors.segment24Hours = {
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
		return ["12am-1am",
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
			 "11am-12pm",
			 "12pm-1pm",
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
			 "11pm-12am" ];
	},
	doSegment: function(xmlNode) {
		var temp = new Date(Date.parse(i2b2.h.getXNodeVal(xmlNode, 'start_date')));
		return temp.getHours();
	}
};



i2b2.HSDLabTests.dataengine.segmentors.segment8Hours = {
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
		return ["12am-8am",
			 "8am-4pm",
			 "4pm-12am" ];
	},
	doSegment: function(xmlNode) {
		var temp = new Date(Date.parse(i2b2.h.getXNodeVal(xmlNode, 'start_date')));
		temp = temp.getHours();
		if (temp <= 8) 		 { return 0; }
		if (temp > 8 && temp <= 16) { return 1; }
		if (temp > 16) 		 { return 2; }
	}
};




i2b2.HSDLabTests.dataengine.segmentors.segmentDayOfWeek = {
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



i2b2.HSDLabTests.dataengine.segmentors.segmentWeekdayWeekend = {
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



i2b2.HSDLabTests.dataengine.segmentors.segmentTestHNL = {
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


i2b2.HSDLabTests.dataengine.segmentors.segmentTestNA = {
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
		switch (i2b2.h.getXNodeVal(xmlNode, 'valueflag_cd')) {
			case "L":
			case "H":
			case "A":
				return 1;
				break;
			default:
				return 0;
				break;
		}
	}
};


