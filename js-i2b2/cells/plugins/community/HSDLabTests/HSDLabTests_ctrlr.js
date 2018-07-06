/**
 * @projectDescription	Visualizes locally computed Healthcare System Dynamics information using TimeGrid Heat Map.
 * @inherits	i2b2
 * @namespace	i2b2.HSDLabTests
 * @author		Nick Benik
 * @version 	1.0
 * ----------------------------------------------------------------------------------------
 * 2016-06-08:  Initial Launch [Nick Benik]
 */


i2b2.HSDLabTests.config = {
	rowSegmentor: null,  // these are set later
	colSegmentor: null,  // these are set later
	groupSize: 1000000
};

i2b2.HSDLabTests.Init = function(loadedDiv) {
	// allow multiple experiments to be dropped into the visualization
	i2b2.HSDLabTests.model.prsCohort = false;
	i2b2.HSDLabTests.model.concptLab = false;
	i2b2.HSDLabTests.model.concptOutcome = false;

	// register DIV as valid DragDrop target for Patient Record Sets (PRS) objects
	var op_trgt = {dropTarget:true};
	i2b2.sdx.Master.AttachType("HSDLabTests-concptDropLab", "CONCPT", op_trgt);
	i2b2.sdx.Master.AttachType("HSDLabTests-concptDropOutcome", "CONCPT", op_trgt);
	i2b2.sdx.Master.AttachType("HSDLabTests-prsDropCohort", "PRS", op_trgt);

	// drop event handlers used by this plugin
	i2b2.sdx.Master.setHandlerCustom("HSDLabTests-concptDropLab", "CONCPT", "DropHandler", i2b2.HSDLabTests.concptDroppedLab);
	i2b2.sdx.Master.setHandlerCustom("HSDLabTests-concptDropOutcome", "CONCPT", "DropHandler", i2b2.HSDLabTests.concptDroppedOutcome);
	i2b2.sdx.Master.setHandlerCustom("HSDLabTests-prsDropCohort", "PRS", "DropHandler", i2b2.HSDLabTests.prsDroppedCohort);


	// use D3js to population our visualization segmentors
	var segmentorsX = d3.select("#segmentorX").selectAll("div")
		.data(i2b2.HSDLabTests.dataengine.axisXCalcs)
		.enter()
		.append("div");
	var temp = segmentorsX.append('input')
		.attr('type', 'radio')
		.attr('name', 'HSDHeatMapXCalc')
		.attr('value', function(v,i) { return i; })
	d3.select(temp[0][0]).attr('checked', '');
	segmentorsX.append('span')
		.text(function(v,i) { return v.dispName; });
	delete segmentorsX;

	var segmentorsY = d3.select("#segmentorY").selectAll("div")
		.data(i2b2.HSDLabTests.dataengine.axisYCalcs)
		.enter()
		.append("div");
	var temp = segmentorsY.append('input')
		.attr('type', 'radio')
		.attr('name', 'HSDHeatMapYCalc')
		.attr('value', function(v,i) { return i; });
	d3.select(temp[0][0]).attr('checked', '');
	segmentorsY.append('span')
		.text(function(v,i) { return v.dispName; });
	delete segmentorsY;

	


	// manage YUI tabs
	this.yuiTabs = new YAHOO.widget.TabView("HSDLabTests-TABS", {activeIndex:0});
	this.yuiTabs.on('activeTabChange', function(ev) { 
		//Tabs have changed 
		if (ev.newValue.get('id')=="HSDLabTests-TAB1") {
			// user switched to Results tab

			if (i2b2.HSDLabTests.model.prsCohort === false || i2b2.HSDLabTests.model.concptLab === false || i2b2.HSDLabTests.model.concptOutcome === false) {
				console.warn("You must provide a cohort, lab test and an outcome concept");
				return true;
			} else {
 				if (i2b2.HSDLabTests.model.dirtyResultsData != true) { return true; }
			
//				setTimeout(i2b2.HSDLabTests.dataReturned, 500);

				// GUI changes (while working)
				jQuery('#HSDLabTests-mainDiv .results-directions').css('display', 'none');
				jQuery('#HSDLabTests-mainDiv .results-working').css('display', '');
				jQuery('#HSDLabTests-mainDiv .results-finished').css('display', 'none');
				jQuery('#HSDLabTests-mainDiv .hsd-tabs').css('display', 'none');

				// configure the segmentor objects
				var temp = jQuery('input[name=HSDHeatMapXCalc]:checked').val();
				temp = i2b2.HSDLabTests.dataengine.axisXCalcs[temp].funcName;
				i2b2.HSDLabTests.config.colSegmentor = i2b2.HSDLabTests.dataengine.segmentors[temp];
				var temp = jQuery('input[name=HSDHeatMapYCalc]:checked').val();
				temp = i2b2.HSDLabTests.dataengine.axisYCalcs[temp].funcName;
				i2b2.HSDLabTests.config.rowSegmentor = i2b2.HSDLabTests.dataengine.segmentors[temp];
				

				// data model
				i2b2.HSDLabTests.model.cohortValuesBoolean = [];
				i2b2.HSDLabTests.model.cohortValuesCounts = {pos:[], neg:[]};

				// create scoped callback for the positive PRS (the JoiningMutex is managed via the callback scope)
				var scopedCallback1 = new i2b2_scopedCallback();
				scopedCallback1.callback = function(results) {
					// save the positive results and then run a query for the negative results
					i2b2.HSDLabTests.model.ajaxRetPositive = results;

					// save the negative results and then run the stats calculation
					i2b2.HSDLabTests.model.ajaxRetNegative = results;
					i2b2.HSDLabTests.DataRetrieved();
					return false;
				};
				

				// fire off the positive cohort request
				var options1  = { 	patient_limit: i2b2.HSDLabTests.config.groupSize,
							PDO_Request: '<input_list>\n'+
							'	<patient_list max="'+i2b2.HSDLabTests.config.groupSize+'" min="1">\n'+
							'		<patient_set_coll_id>'+i2b2.HSDLabTests.model.prsCohort.sdxInfo.sdxKeyValue+'</patient_set_coll_id>\n'+
							'	</patient_list>\n'+
							'</input_list>\n'+
							'<filter_list>\n'+
							'	<panel name="lab_tests">\n'+
							'		<panel_number>0</panel_number>\n'+
							'		<panel_accuracy_scale>0</panel_accuracy_scale>\n'+
							'		<invert>0</invert>\n'+
							'		<item>\n'+
							'			<hlevel>'+i2b2.HSDLabTests.model.concptLab.origData.level+'</hlevel>\n'+
							'			<item_key>'+i2b2.HSDLabTests.model.concptLab.origData.key+'</item_key>\n'+
							'			<dim_tablename>'+i2b2.HSDLabTests.model.concptLab.origData.table_name+'</dim_tablename>\n'+
							'			<dim_dimcode>'+i2b2.HSDLabTests.model.concptLab.origData.dim_code+'</dim_dimcode>\n'+
							'			<item_is_synonym>'+i2b2.HSDLabTests.model.concptLab.origData.synonym_cd+'</item_is_synonym>\n'+
							'		</item>\n'+
							'	</panel>\n'+
							'	<panel name="cohort_outcome">\n'+
							'		<panel_number>1</panel_number>\n'+
							'		<panel_accuracy_scale>0</panel_accuracy_scale>\n'+
							'		<invert>0</invert>\n'+
							'		<item>\n'+
							'			<hlevel>'+i2b2.HSDLabTests.model.concptOutcome.origData.level+'</hlevel>\n'+
							'			<item_key>'+i2b2.HSDLabTests.model.concptOutcome.origData.key+'</item_key>\n'+
							'			<dim_tablename>'+i2b2.HSDLabTests.model.concptOutcome.origData.table_name+'</dim_tablename>\n'+
							'			<dim_dimcode>'+i2b2.HSDLabTests.model.concptOutcome.origData.dim_code+'</dim_dimcode>\n'+
							'			<item_is_synonym>'+i2b2.HSDLabTests.model.concptOutcome.origData.synonym_cd+'</item_is_synonym>\n'+
							'		</item>\n'+
							'	</panel>\n'+
							'</filter_list>\n'+
							'<output_option>\n'+
							'	<patient_set select="using_input_list" onlykeys="true"/>\n'+
							'	<observation_set blob="false" onlykeys="false"/>\n'+
							'</output_option>'
						};
				i2b2.CRC.ajax.getPDO_fromInputList("PLUGIN:HSDLabTests", options1, scopedCallback1);
			}
		}
	});
	
	// setup inital visual state
	jQuery('#HSDLabTests-mainDiv .results-directions').css('display', '');
	jQuery('#HSDLabTests-mainDiv .results-working').css('display', 'none');
	jQuery('#HSDLabTests-mainDiv .results-finished').css('display', 'none');
	jQuery('#HSDLabTests-mainDiv .hsd-tabs').css('display', 'none');

	z = $('anaPluginViewFrame').getHeight() - 34;
	$$('DIV#HSDLabTests-TABS DIV.HSDLabTests-MainContent')[0].style.height = z;
	$$('DIV#HSDLabTests-TABS DIV.HSDLabTests-MainContent')[1].style.height = z;
	$$('DIV#HSDLabTests-TABS DIV.HSDLabTests-MainContent')[2].style.height = z;

	// connect click controllers to the results display tabs
	jQuery('#HSDLabTests-mainDiv .hsd-tabs li.tab').on('click', function(e) {
		// handling hiding/showing of display elements
		jQuery('#HSDLabTests-mainDiv .hsd-tabs li.tab').removeClass("selected");
		jQuery('#HSDLabTests-mainDiv .hsd-tabs li.tab[data-tabnum="'+this.dataset.tabnum+'"]').addClass("selected");
		jQuery('#HSDLabTests-mainDiv .results-finished').css('display', 'none');
		jQuery('#HSDLabTests-mainDiv .results-finished[data-results-disp="'+this.dataset.tabnum+'"]').css('display', '');
	});
	jQuery('#HSDLabTests-mainDiv #segmentorX input, #HSDLabTests-mainDiv #segmentorY input').on('click', function(e) {
		i2b2.HSDLabTests.dirtyData();
	});
	
};


i2b2.HSDLabTests.Unload = function() {
	// purge old data
	i2b2.HSDLabTests.dirtyData();
	i2b2.HSDLabTests.model.prsCohort = false;
	i2b2.HSDLabTests.model.concptLab = false;
	i2b2.HSDLabTests.model.concptOutcome = false;
	return true;
};


i2b2.HSDLabTests.dirtyData = function() {
	i2b2.HSDLabTests.model.dirtyResultsData = true;
};


i2b2.HSDLabTests.prsDroppedCohort = function(sdxData) {
	sdxData = sdxData[0];	// only interested in first record
	i2b2.HSDLabTests.model.prsCohort = sdxData;
	jQuery("#HSDLabTests-prsDropCohort").empty();
	jQuery("#"+sdxData.renderData.htmlID).clone().attr('data-prsid',sdxData.sdxInfo.sdxKeyValue).appendTo("#HSDLabTests-prsDropCohort");
	i2b2.HSDLabTests.dirtyData();
};


i2b2.HSDLabTests.concptDroppedLab = function(sdxData) {
	i2b2.HSDLabTests.dirtyData();
	jQuery("#HSDLabTests-concptDropLab").empty();

	// process dropped record
	sdxData = sdxData[0];	// only interested in first record
	var cdetails = i2b2.ONT.ajax.GetTermInfo("PLUGIN:HSDLabTests", {concept_key_value:sdxData.origData.key, ont_synonym_records: true, ont_hidden_records: true} );
	if (i2b2.h.XPath(cdetails.refXML, "//metadataxml").length > 0) {
		i2b2.HSDLabTests.model.concptLab = sdxData;
		jQuery("#"+sdxData.renderData.htmlID).clone().attr('data-prsID',sdxData.sdxInfo.sdxKeyValue).appendTo("#HSDLabTests-concptDropLab");
		return true;
	}
	// execution arrives here on failure
	jQuery("#HSDLabTests-concptDropLab").append('<div class="psDropMsg">Drop one lab test here</div>');
};


i2b2.HSDLabTests.concptDroppedOutcome = function(sdxData) {
	i2b2.HSDLabTests.dirtyData();
	jQuery("#HSDLabTests-concptDropOutcome").empty();

	// process dropped record
	sdxData = sdxData[0];	// only interested in first record
	var cdetails = i2b2.ONT.ajax.GetTermInfo("PLUGIN:HSDLabTests", {concept_key_value:sdxData.origData.key, ont_synonym_records: true, ont_hidden_records: true} );
	if (i2b2.h.XPath(cdetails.refXML, "//metadataxml").length == 0) {
		i2b2.HSDLabTests.model.concptOutcome = sdxData;
		jQuery("#"+sdxData.renderData.htmlID).clone().attr('data-prsID',sdxData.sdxInfo.sdxKeyValue).appendTo("#HSDLabTests-concptDropOutcome");
		return true;
	}
	// execution arrives here on failure
	jQuery("#HSDLabTests-concptDropOutcome").append('<div class="psDropMsg">Drop one concept here as an outcome</div>');
};


i2b2.HSDLabTests.getPrsRecord = function(JoiningMutexThreadReference, prsData) {

	var msg_filter = '<input_list>\n' +
		'	<patient_list max="99999" min="0">\n' +
		'		<patient_set_coll_id>'+prsData.prsKey+'</patient_set_coll_id>\n'+
		'	</patient_list>\n'+
		'</input_list>\n'+
		'<filter_list />\n'+
		'<output_option><patient_set select="using_input_list" onlykeys="false"/></output_option>\n';

	// callback processor
	var scopedCallback = new i2b2_scopedCallback();
	scopedCallback.scope = JoiningMutexThreadReference;
	scopedCallback.callback = function(results) {
		// THIS function is used to process the AJAX results of the getChild call
		//		results data object contains the following attributes:
		//			refXML: xmlDomObject <--- for data processing
		//			msgRequest: xml (string)
		//			msgResponse: xml (string)
		//			error: boolean
		//			errorStatus: string [only with error=true]
		//			errorMsg: string [only with error=true]
		
		// check for errors
		if (results.error) {
			alert('The results from the server could not be understood.  Press F12 for more information.');
			console.error("Bad Results from Cell Communicator: ",results);
			return false;
		}

		if (typeof i2b2.HSDLabTests.model.attribNames === 'undefined') { i2b2.HSDLabTests.model.attribNames = {}; }

		// get all the patient records
		var pData = i2b2.h.XPath(results.refXML, 'descendant::patient/param[@column]/text()/..');
		var hData = new Hash();
		for (var i1=0; i1<pData.length; i1++) {
			var n = pData[i1].getAttribute('column');
			if (typeof i2b2.HSDLabTests.model.attribNames[n] === 'undefined') {
				if (pData[i1].getAttribute('column_descriptor') !== null) {
					i2b2.HSDLabTests.model.attribNames[n] = pData[i1].getAttribute('column_descriptor');
				} else {
					i2b2.HSDLabTests.model.attribNames[n] = n;
				}
			}
			var t1 = hData.get(n);
			if (!t1) { t1 = new Hash(); }
			var v = pData[i1].firstChild.nodeValue;
			if (n=="birth_date") {
				v = v.substring(0, v.indexOf("T"));
			}
			var t2 = t1.get(v);
			if (!t2) {
				t2 = 1;
			} else {
				t2++;
			}
			t1.set(v, t2);
			hData.set(n, t1);
		}
			
		// collapse the hash objects to regular objects and save to the Plugin's data model
		if (typeof i2b2.HSDLabTests.model.sumCounts == 'undefined') { i2b2.HSDLabTests.model.sumCounts = {} }
		if (typeof i2b2.HSDLabTests.model.attribNames == 'undefined') { i2b2.HSDLabTests.model.attribNames = {} }
		i2b2.HSDLabTests.model.sumCounts[prsData.prsKey] = eval("(" + Object.toJSON(hData) +")"); 

		// remove the topics that are to be ignored
		var keys = d3.keys(i2b2.HSDLabTests.cfg.displayData.ignore);
		while (keys.length) {
			try {
				var t = keys.pop();
				delete i2b2.HSDLabTests.model.attribNames[t];
				delete i2b2.HSDLabTests.model.sumCounts[prsData.prsKey][t];
			} catch (e) {}
		}

		// Indicate to the JoiningMutex that this thread is finished
		this.ThreadFinished();
	};
				
	// AJAX CALL USING THE EXISTING CRC CELL COMMUNICATOR
	i2b2.CRC.ajax.getPDO_fromInputList("Plugin:HSDLabTests", {PDO_Request: msg_filter}, scopedCallback);	
};


i2b2.HSDLabTests.DataRetrieved = function() {
	// optimization - only requery when the input data is changed
	i2b2.HSDLabTests.model.dirtyResultsData = false;

	// THIS GETS THE LAB VALUES
	// i2b2.h.XPath(i2b2.HSDLabTests.model.ajaxRetNegative.refXML, '//observation[../@panel_name="lab_tests"]')

	// REBUILD THE SVG DISPLAY DOM
    var dim_x = i2b2.HSDLabTests.config.colSegmentor.getDimSize();
    var dim_y = i2b2.HSDLabTests.config.rowSegmentor.getDimSize();
    var svgs = d3.selectAll("svg.HeatMap01")[0];
    i2b2.HSDLabTests.render.build(svgs[0], dim_x, dim_y);
    i2b2.HSDLabTests.render.build(svgs[1], dim_x, dim_y);

	// Get list of all patients
	var patient_cohorts = {};
	var patient_nodes = i2b2.h.XPath(i2b2.HSDLabTests.model.ajaxRetNegative.refXML, '//patient/patient_id/text()')
	var l = patient_nodes.length;
	for (var i=0; i<l; i++) {
		patient_cohorts[patient_nodes[i].nodeValue] = false;
	}
	// mark the positive outcome cohorts
	var cohorts = i2b2.h.XPath(i2b2.HSDLabTests.model.ajaxRetNegative.refXML, '//observation[../@panel_name="cohort_outcome"]');
	cohorts.forEach((function(d, i) { this[i2b2.h.getXNodeVal(d,'patient_id')] = true; }).bind(patient_cohorts));


	// initialize statistic arrays
	var pt_matrix = [];
	var totals_matrix = [];
	var dim_x = i2b2.HSDLabTests.config.colSegmentor.getDimRange();
	var dim_y = i2b2.HSDLabTests.config.rowSegmentor.getDimRange();
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
		var pt_labs = i2b2.h.XPath(i2b2.HSDLabTests.model.ajaxRetNegative.refXML, '//observation[../@panel_name="lab_tests" and patient_id = "'+patient_id+'"]');

		// clear the patient matrix
		pt_matrix = JSON.parse(jsonBlankMatrix);

		// process labs into patient matrix
		while (pt_labs.length > 0) {
			var pt_lab = pt_labs.pop();
			pt_matrix[i2b2.HSDLabTests.config.colSegmentor.doSegment(pt_lab)][i2b2.HSDLabTests.config.rowSegmentor.doSegment(pt_lab)] = 1;
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

	
	// save to the plugin model namespace for later use
	i2b2.HSDLabTests.model.stats = {
		summaryCounts: {},
		matrixData: totals_matrix
	};

	// All data has been processed, generate summary counts
	var apply_cell_function = function(matrix, apply_func) {
		matrix.forEach(function(col, x) {
			col.forEach(function(xy_val, y) {
				apply_func(matrix, x, y, xy_val);
			});
		});
	}

	apply_cell_function(
		i2b2.HSDLabTests.model.stats.matrixData,
		function(matrix, x, y, cell_val) {
			matrix[x][y].cohort = cell_val.pos + cell_val.neg;
			matrix[x][y].pos_outcome_percent = cell_val.pos / (cell_val.pos + cell_val.neg);
			if (isNaN(matrix[x][y].pos_outcome_percent)) { matrix[x][y].pos_outcome_percent = 0; }
		}
	);

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
	
	i2b2.HSDLabTests.model.stats.summaryCounts = apply_col_row_function(
		i2b2.HSDLabTests.model.stats.matrixData,
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


	// inject values into the visualization HTML/SVG
	jQuery("#HSDLabTests-mainDiv text[class~='HSDLabTests-svgYAxis']").text(i2b2.HSDLabTests.config.rowSegmentor.getAxisLabel(i2b2.HSDLabTests.model.prsCohort, i2b2.HSDLabTests.model.concptLab, i2b2.HSDLabTests.model.concptOutcome))
	jQuery("#HSDLabTests-mainDiv text[class~='HSDLabTests-svgXAxis']").text(i2b2.HSDLabTests.config.colSegmentor.getAxisLabel(i2b2.HSDLabTests.model.prsCohort, i2b2.HSDLabTests.model.concptLab, i2b2.HSDLabTests.model.concptOutcome));

	// change Y Axis labels
	var labels = i2b2.HSDLabTests.config.rowSegmentor.getDimLabels();
	var css_finder = "#HSDLabTests-mainDiv .yaxis-{i}";
	for (var i=0; i < labels.length; i++) {
		var find = css_finder.replace("{i}", String(i));
		jQuery(find + " text").text(labels[i]);
	}
	// change X Axis labels
	var labels = i2b2.HSDLabTests.config.colSegmentor.getDimLabels();
	var css_finder = "#HSDLabTests-mainDiv .xaxis-{i}";
	for (var i=0; i < labels.length; i++) {
		var find = css_finder.replace("{i}", String(i));
		jQuery(find + " text").text(labels[i]);
	}



	// deal with legend values
	var max_temp = i2b2.HSDLabTests.model.stats.summaryCounts.cols.reduce(function(acc, val) { if (acc > val.max_outcome_percent) {return acc}  else {return val.max_outcome_percent} }, 0);
	var min_temp = i2b2.HSDLabTests.model.stats.summaryCounts.cols.reduce(function(acc, val) { if (acc < val.min_outcome_percent) {return acc}  else {return val.min_outcome_percent} }, Infinity);
	jQuery("#HSDLabTests-mainDiv div[data-results-disp] .legend-item:nth-child(1) svg g text[text-anchor='start']").text(i2b2.HSDLabTests.safePercent(i2b2.HSDLabTests.toPrecision(min_temp, 4)));
	jQuery("#HSDLabTests-mainDiv div[data-results-disp] .legend-item:nth-child(1) svg g text[text-anchor='end']").text(i2b2.HSDLabTests.safePercent(i2b2.HSDLabTests.toPrecision(max_temp, 4)));

	// color gradient setup
//	var colorScheme = d3.schemeRdYlGn;
//	var colorGradient = d3.scale.ordinal(colorScheme);
	var colorGradient = d3.scale.linear()
		.domain([min_temp, ((max_temp - min_temp) /2), max_temp])
		.range(["#9b524d", "#ffffa8", "#87a26d"]);

	// the main matrix values
	var matrix = i2b2.HSDLabTests.model.stats.matrixData;
	var cx = matrix.length;
	var cy = matrix[0].length;
	var css_finder = "#HSDLabTests-mainDiv div[data-results-disp='{#}'] .cell-{x}-{y}";
	for (var x=0; x < cx; x++) {
		for (var y=0; y < cy; y++) {
			if (matrix[x][y].cohort == 0) {
				var disp_val1 = "-";
				var disp_fill1 = "lightgrey";
				var disp_val2 = "-";
				var disp_fill2 = "lightgrey";
			} else {
				var disp_val1 = i2b2.HSDLabTests.safePercent(i2b2.HSDLabTests.toPrecision(matrix[x][y].pos_outcome_percent, 4));
				var fill = colorGradient(matrix[x][y].pos / matrix[x][y].cohort);
				var disp_fill1 = fill;
				var disp_val2 = matrix[x][y].pos + "/" + matrix[x][y].cohort;
				var disp_fill2 = fill;
			}
			// first tab
			var find = css_finder.replace("{#}", "1").replace("{x}", String(x)).replace("{y}", String(y));
			jQuery(find + " text").text(disp_val1);
			jQuery(find + " rect").attr("fill", disp_fill1);
			// second tab
			var find = css_finder.replace("{#}", "2").replace("{x}", String(x)).replace("{y}", String(y));
			jQuery(find + " text").text(disp_val2);
			jQuery(find + " rect").attr("fill", disp_fill2);
		}
	}


	// deal with row summary stats
	var max_temp = i2b2.HSDLabTests.model.stats.summaryCounts.rows.reduce(function(acc, val) { var t = (val.count_pos / val.count_cohort); if (isNaN(t)) {t=0;}  if (acc > t) {return acc; } else {return t; } }, 0);
	jQuery("#HSDLabTests-mainDiv div[data-results-disp='1'] .legend-item:nth-child(3) svg g text[text-anchor='end']").text(i2b2.HSDLabTests.safePercent(i2b2.HSDLabTests.toPrecision(max_temp, 4)));
	var max_temp = i2b2.HSDLabTests.model.stats.summaryCounts.rows.reduce(function(acc, val) { if (acc > val.count_cohort) {return acc}  else {return val.count_cohort} }, 0);
	jQuery("#HSDLabTests-mainDiv div[data-results-disp='2'] .legend-item:nth-child(3) svg g text[text-anchor='end']").text(max_temp);
	jQuery("#HSDLabTests-mainDiv div[data-results-disp='2'] .legend-item:nth-child(3) svg g text[text-anchor='start']").text("0");
	// deal with summary bar tick location and label
	var legend_bar = i2b2.HSDLabTests.toSinglePrecision(max_temp);
	jQuery('#HSDLabTests-mainDiv .results-finished[data-results-disp="2"] svg g.y.axis g.tick:last').attr('transform', 'translate('+parseInt((legend_bar / max_temp ) * 100)+',0)');
	jQuery('#HSDLabTests-mainDiv .results-finished[data-results-disp="2"] svg g.y.axis g.tick:last text').text((d3.format("s"))(legend_bar));
    // make sure there is only one minor tick line on the second screen
    while (jQuery('#HSDLabTestsSvr-mainDiv .results-finished[data-results-disp="2"] svg g.y.axis g.tick.minor').length > 1) {
        jQuery('#HSDLabTestsSvr-mainDiv .results-finished[data-results-disp="2"] svg g.y.axis g.tick.minor:first').remove();
    }

	// color gradient setup
//	var colorScheme = d3.schemeBlues;
//	var colorGradient = d3.scale.ordinal(colorScheme);
	var colorGradient = d3.scale.linear()
		.domain([0,0.5,1])
		.range(["#dfeef8", "#a9cde7", "#76a7ca"]);

	// each summary stat
	for (var y=0; y < cy; y++) {
		var segment = i2b2.HSDLabTests.model.stats.summaryCounts.rows[y];
		var temp = (segment.count_pos / segment.count_cohort)
		if (isNaN(temp)) {
			temp = 0;
			var fill = colorGradient(0);
		} else {
			var fill = colorGradient(temp);
			temp = temp * 100;
		}
		jQuery("#HSDLabTests-mainDiv div[data-results-disp='1'] .row-bar-"+y+" rect").attr("width", Math.round(temp));
		jQuery("#HSDLabTests-mainDiv div[data-results-disp='1'] .row-bar-"+y+" rect").attr("fill", fill);
		jQuery("#HSDLabTests-mainDiv div[data-results-disp='1'] .row-bar-"+y+" text").text(i2b2.HSDLabTests.safePercent(i2b2.HSDLabTests.toPrecision(temp/100, 4)));
		jQuery("#HSDLabTests-mainDiv div[data-results-disp='2'] .row-bar-"+y+" rect").attr("width", Math.round((segment.count_cohort / max_temp)*100));
		jQuery("#HSDLabTests-mainDiv div[data-results-disp='2'] .row-bar-"+y+" rect").attr("fill", colorGradient(segment.count_cohort / max_temp));
		jQuery("#HSDLabTests-mainDiv div[data-results-disp='2'] .row-bar-"+y+" text").text(String(segment.count_cohort));
	}
	jQuery("#HSDLabTests-mainDiv div[data-results-disp='2'] .legend-item:nth-child(3) svg g text[text-anchor='end']")[0]
    delete colorGradient;

	// deal with column summary stats
	var max_temp = i2b2.HSDLabTests.model.stats.summaryCounts.cols.reduce(function(acc, val) { var t = (val.count_pos / val.count_cohort); if (isNaN(t)) {t=0;} if (acc > t) {return acc; } else {return t; } }, 0);
	jQuery("#HSDLabTests-mainDiv div[data-results-disp='1'] .legend-item:nth-child(2) svg g text[text-anchor='end']").text(i2b2.HSDLabTests.safePercent(i2b2.HSDLabTests.toPrecision(max_temp, 4)));
	var max_temp = i2b2.HSDLabTests.model.stats.summaryCounts.cols.reduce(function(acc, val) { if (acc > val.count_cohort) {return acc}  else {return val.count_cohort} }, 0);
	jQuery("#HSDLabTests-mainDiv div[data-results-disp='2'] .legend-item:nth-child(2) svg g text[text-anchor='end']").text(max_temp);
	jQuery("#HSDLabTests-mainDiv div[data-results-disp='2'] .legend-item:nth-child(2) svg g text[text-anchor='start']").text("0");
	// deal with summary bar tick location and label
	var legend_bar = i2b2.HSDLabTests.toSinglePrecision(max_temp);
	jQuery('#HSDLabTests-mainDiv .results-finished[data-results-disp="2"] svg g.x.axis g.tick:last').attr('transform', 'translate(0,'+parseInt((legend_bar / max_temp) * 100)+')');
	jQuery('#HSDLabTests-mainDiv .results-finished[data-results-disp="2"] svg g.x.axis g.tick:last text').text((d3.format("s"))(legend_bar));
	// make sure there is only one minor tick line on the second screen
	while (jQuery('#HSDLabTests-mainDiv .results-finished[data-results-disp="2"] svg g.x.axis g.tick.minor').length > 1) {
		jQuery('#HSDLabTests-mainDiv .results-finished[data-results-disp="2"] svg g.x.axis g.tick.minor:first').remove();
	}

	// color gradient setup
//	var colorScheme = d3.schemePurples;
//	var colorGradient = d3.scale.ordinal(colorScheme);
	var colorGradient = d3.scale.linear()
		.domain([0,0.5,1])
		.range(["#f1e4fb", "#d4b6ec", "#b188d2"]);

	// each summary stat
	for (var x=0; x < cx; x++) {
		var segment = i2b2.HSDLabTests.model.stats.summaryCounts.cols[x];
		var temp = (segment.count_pos / segment.count_cohort)
		if (isNaN(temp)) {
			var fill = colorGradient(0);
			temp = 0;
		} else {
			var fill = colorGradient(temp);
			temp = temp * 100;
		}
		jQuery("#HSDLabTests-mainDiv div[data-results-disp='1'] .col-bar-"+x+" rect").attr("height", Math.round(temp));
		jQuery("#HSDLabTests-mainDiv div[data-results-disp='1'] .col-bar-"+x+" rect").attr("fill", fill);
		jQuery("#HSDLabTests-mainDiv div[data-results-disp='1'] .col-bar-"+x+" text").text(i2b2.HSDLabTests.safePercent(i2b2.HSDLabTests.toPrecision(temp/100, 4)));
		jQuery("#HSDLabTests-mainDiv div[data-results-disp='2'] .col-bar-"+x+" rect").attr("height", Math.round((segment.count_cohort / max_temp)*100));
		jQuery("#HSDLabTests-mainDiv div[data-results-disp='2'] .col-bar-"+x+" rect").attr("fill", colorGradient(segment.count_cohort / max_temp));
		jQuery("#HSDLabTests-mainDiv div[data-results-disp='2'] .col-bar-"+x+" text").text(String(segment.count_cohort));
	}


	// hide the "working" status screen
	jQuery('#HSDLabTests-mainDiv .results-working').css('display', 'none');
	// show visualization selector tab bar (and select first tab)
	jQuery('#HSDLabTests-mainDiv .hsd-tabs').css('display', '');
	jQuery('#HSDLabTests-mainDiv .hsd-tabs li.tab').removeClass("selected");
	jQuery('#HSDLabTests-mainDiv .hsd-tabs li.tab:first').addClass("selected");
	// display first visualization
	jQuery('#HSDLabTests-mainDiv .results-finished').css('display', 'none');
	jQuery('#HSDLabTests-mainDiv .results-finished[data-results-disp="1"]').css('display', '');

};


i2b2.HSDLabTests.toSinglePrecision = function(value) {
	var temp = String(value);
	return parseInt(temp.substring(0,1)) * Math.pow(10, temp.length - 1);
};


i2b2.HSDLabTests.toPrecision = function(value, precision) {
	var prec = Math.pow(10, precision);
	return Math.round(value * prec) / prec;
};

i2b2.HSDLabTests.safePercent = function(value) {
	// this is a bug fix for floating point precision errors when converting to a percentage
	var t = String(value * 100);
	if (t.length > 5) {
		// fix this stuff
		var t = String((value * 100).toFixed(2)).toArray();
		var t2 = t.pop();
		while (t2 === "0" || t2 === ".") {
			var t2 = t.pop();
		}
		t.push(t2);
		t = t.join("");
	}
	return t+"%";
};