/**
 * @projectDescription	Visualizes locally computed Healthcare System Dynamics information using TimeGrid Heat Map.
 * @inherits	i2b2
 * @namespace	i2b2.HealthcareSystemDynamicsTime
 * @author		Nick Benik
 * @version 	1.0
 * ----------------------------------------------------------------------------------------
 * 2016-06-08:  Initial Launch [Nick Benik]
 */


i2b2.HealthcareSystemDynamicsTime.config = {
	rowSegmentor: null,  // these are set later
	colSegmentor: null,  // these are set later
	groupSize: 1000000
};

i2b2.HealthcareSystemDynamicsTime.Init = function(loadedDiv) {
	// allow multiple experiments to be dropped into the visualization
	i2b2.HealthcareSystemDynamicsTime.model.prsCohort = false;
	i2b2.HealthcareSystemDynamicsTime.model.concptLab = false;
	i2b2.HealthcareSystemDynamicsTime.model.concptOutcome = false;

	// register DIV as valid DragDrop target for Patient Record Sets (PRS) objects
	var op_trgt = {dropTarget:true};
	i2b2.sdx.Master.AttachType("HSDTime-concptDropLab", "CONCPT", op_trgt);
	i2b2.sdx.Master.AttachType("HSDTime-concptDropOutcome", "CONCPT", op_trgt);
	i2b2.sdx.Master.AttachType("HSDTime-prsDropCohort", "PRS", op_trgt);

	// drop event handlers used by this plugin
	i2b2.sdx.Master.setHandlerCustom("HSDTime-concptDropLab", "CONCPT", "DropHandler", i2b2.HealthcareSystemDynamicsTime.concptDroppedLab);
	i2b2.sdx.Master.setHandlerCustom("HSDTime-concptDropOutcome", "CONCPT", "DropHandler", i2b2.HealthcareSystemDynamicsTime.concptDroppedOutcome);
	i2b2.sdx.Master.setHandlerCustom("HSDTime-prsDropCohort", "PRS", "DropHandler", i2b2.HealthcareSystemDynamicsTime.prsDroppedCohort);


	// use D3js to population our visualization segmentors
	var segmentorsX = d3.select("#segmentorX").selectAll("div")
		.data(i2b2.HealthcareSystemDynamicsTime.dataengine.axisXCalcs)
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
		.data(i2b2.HealthcareSystemDynamicsTime.dataengine.axisYCalcs)
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
	this.yuiTabs = new YAHOO.widget.TabView("HSDTime-TABS", {activeIndex:0});
	this.yuiTabs.on('activeTabChange', function(ev) { 
		//Tabs have changed 
		if (ev.newValue.get('id')=="HSDTime-TAB1") {
			// user switched to Results tab

			if (i2b2.HealthcareSystemDynamicsTime.model.prsCohort === false || i2b2.HealthcareSystemDynamicsTime.model.concptLab === false || i2b2.HealthcareSystemDynamicsTime.model.concptOutcome === false) {
				console.warn("You must provide a cohort, lab test and an outcome concept");
				return true;
			} else {
 				if (i2b2.HealthcareSystemDynamicsTime.model.dirtyResultsData != true) { return true; }
			
//				setTimeout(i2b2.HealthcareSystemDynamicsTime.dataReturned, 500);

				// GUI changes (while working)
				jQuery('#HSDTime-mainDiv .results-directions').css('display', 'none');
				jQuery('#HSDTime-mainDiv .results-working').css('display', '');
				jQuery('#HSDTime-mainDiv .results-finished').css('display', 'none');
				jQuery('#HSDTime-mainDiv .hsd-tabs').css('display', 'none');

				// configure the segmentor objects
				var temp = jQuery('input[name=HSDHeatMapXCalc]:checked').val();
				temp = i2b2.HealthcareSystemDynamicsTime.dataengine.axisXCalcs[temp].funcName;
				i2b2.HealthcareSystemDynamicsTime.config.colSegmentor = i2b2.HealthcareSystemDynamicsTime.dataengine.segmentors[temp];
				var temp = jQuery('input[name=HSDHeatMapYCalc]:checked').val();
				temp = i2b2.HealthcareSystemDynamicsTime.dataengine.axisYCalcs[temp].funcName;
				i2b2.HealthcareSystemDynamicsTime.config.rowSegmentor = i2b2.HealthcareSystemDynamicsTime.dataengine.segmentors[temp];
				

				// data model
				i2b2.HealthcareSystemDynamicsTime.model.cohortValuesBoolean = [];
				i2b2.HealthcareSystemDynamicsTime.model.cohortValuesCounts = {pos:[], neg:[]};

				// create scoped callback for the positive PRS (the JoiningMutex is managed via the callback scope)
				var scopedCallback1 = new i2b2_scopedCallback();
				scopedCallback1.callback = function(results) {
					// save the positive results and then run a query for the negative results
					i2b2.HealthcareSystemDynamicsTime.model.ajaxRetPositive = results;

// save the negative results and then run the stats calculation
i2b2.HealthcareSystemDynamicsTime.model.ajaxRetNegative = results;
i2b2.HealthcareSystemDynamicsTime.DataRetrieved();
return false;

					var scopedCallback2 = new i2b2_scopedCallback();
					scopedCallback2.callback = function(results) {
						// save the negative results and then run the stats calculation
						i2b2.HealthcareSystemDynamicsTime.model.ajaxRetNegative = results;
						i2b2.HealthcareSystemDynamicsTime.DataRetrieved();
					}

					// fire off the negative cohort request
					var options2  = { 	patient_limit: i2b2.HealthcareSystemDynamicsTime.config.groupSize,
						PDO_Request: '<input_list>\n'+
							'	<patient_list max="'+i2b2.HealthcareSystemDynamicsTime.config.groupSize+'" min="1">\n'+
							'		<patient_set_coll_id>'+i2b2.HealthcareSystemDynamicsTime.model.prsCohort.sdxInfo.sdxKeyValue+'</patient_set_coll_id>\n'+
							'	</patient_list>\n'+
							'</input_list>\n'+
							'<filter_list>\n'+
							'	<panel name="lab_tests">\n'+
							'		<panel_number>0</panel_number>\n'+
							'		<panel_accuracy_scale>0</panel_accuracy_scale>\n'+
							'		<invert>0</invert>\n'+
							'		<item>\n'+
							'			<hlevel>'+i2b2.HealthcareSystemDynamicsTime.model.concptLab.origData.level+'</hlevel>\n'+
							'			<item_key>'+i2b2.HealthcareSystemDynamicsTime.model.concptLab.origData.key+'</item_key>\n'+
							'			<dim_tablename>'+i2b2.HealthcareSystemDynamicsTime.model.concptLab.origData.table_name+'</dim_tablename>\n'+
							'			<dim_dimcode>'+i2b2.HealthcareSystemDynamicsTime.model.concptLab.origData.dim_code+'</dim_dimcode>\n'+
							'			<item_is_synonym>'+i2b2.HealthcareSystemDynamicsTime.model.concptLab.origData.synonym_cd+'</item_is_synonym>\n'+
							'		</item>\n'+
							'	</panel>\n'+
							'	<panel name="cohort_outcome">\n'+
							'		<panel_number>1</panel_number>\n'+
							'		<panel_accuracy_scale>0</panel_accuracy_scale>\n'+
							'		<invert>1</invert>\n'+
							'		<item>\n'+
							'			<hlevel>'+i2b2.HealthcareSystemDynamicsTime.model.concptOutcome.origData.level+'</hlevel>\n'+
							'			<item_key>'+i2b2.HealthcareSystemDynamicsTime.model.concptOutcome.origData.key+'</item_key>\n'+
							'			<dim_tablename>'+i2b2.HealthcareSystemDynamicsTime.model.concptOutcome.origData.table_name+'</dim_tablename>\n'+
							'			<dim_dimcode>'+i2b2.HealthcareSystemDynamicsTime.model.concptOutcome.origData.dim_code+'</dim_dimcode>\n'+
							'			<item_is_synonym>'+i2b2.HealthcareSystemDynamicsTime.model.concptOutcome.origData.synonym_cd+'</item_is_synonym>\n'+
							'		</item>\n'+
							'	</panel>\n'+
							'</filter_list>\n'+
							'<output_option>\n'+
							'	<patient_set select="using_input_list" onlykeys="true"/>\n'+
							'	<observation_set blob="false" onlykeys="false"/>\n'+
							'</output_option>'
					};
					i2b2.CRC.ajax.getPDO_fromInputList("PLUGIN:HealthcareSystemDynamicsTime", options2, scopedCallback2);
				};
				

				// fire off the positive cohort request
				var options1  = { 	patient_limit: i2b2.HealthcareSystemDynamicsTime.config.groupSize,
							PDO_Request: '<input_list>\n'+
							'	<patient_list max="'+i2b2.HealthcareSystemDynamicsTime.config.groupSize+'" min="1">\n'+
							'		<patient_set_coll_id>'+i2b2.HealthcareSystemDynamicsTime.model.prsCohort.sdxInfo.sdxKeyValue+'</patient_set_coll_id>\n'+
							'	</patient_list>\n'+
							'</input_list>\n'+
							'<filter_list>\n'+
							'	<panel name="lab_tests">\n'+
							'		<panel_number>0</panel_number>\n'+
							'		<panel_accuracy_scale>0</panel_accuracy_scale>\n'+
							'		<invert>0</invert>\n'+
							'		<item>\n'+
							'			<hlevel>'+i2b2.HealthcareSystemDynamicsTime.model.concptLab.origData.level+'</hlevel>\n'+
							'			<item_key>'+i2b2.HealthcareSystemDynamicsTime.model.concptLab.origData.key+'</item_key>\n'+
							'			<dim_tablename>'+i2b2.HealthcareSystemDynamicsTime.model.concptLab.origData.table_name+'</dim_tablename>\n'+
							'			<dim_dimcode>'+i2b2.HealthcareSystemDynamicsTime.model.concptLab.origData.dim_code+'</dim_dimcode>\n'+
							'			<item_is_synonym>'+i2b2.HealthcareSystemDynamicsTime.model.concptLab.origData.synonym_cd+'</item_is_synonym>\n'+
							'		</item>\n'+
							'	</panel>\n'+
							'	<panel name="cohort_outcome">\n'+
							'		<panel_number>1</panel_number>\n'+
							'		<panel_accuracy_scale>0</panel_accuracy_scale>\n'+
							'		<invert>0</invert>\n'+
							'		<item>\n'+
							'			<hlevel>'+i2b2.HealthcareSystemDynamicsTime.model.concptOutcome.origData.level+'</hlevel>\n'+
							'			<item_key>'+i2b2.HealthcareSystemDynamicsTime.model.concptOutcome.origData.key+'</item_key>\n'+
							'			<dim_tablename>'+i2b2.HealthcareSystemDynamicsTime.model.concptOutcome.origData.table_name+'</dim_tablename>\n'+
							'			<dim_dimcode>'+i2b2.HealthcareSystemDynamicsTime.model.concptOutcome.origData.dim_code+'</dim_dimcode>\n'+
							'			<item_is_synonym>'+i2b2.HealthcareSystemDynamicsTime.model.concptOutcome.origData.synonym_cd+'</item_is_synonym>\n'+
							'		</item>\n'+
							'	</panel>\n'+
							'</filter_list>\n'+
							'<output_option>\n'+
							'	<patient_set select="using_input_list" onlykeys="true"/>\n'+
							'	<observation_set blob="false" onlykeys="false"/>\n'+
							'</output_option>'
						};
				i2b2.CRC.ajax.getPDO_fromInputList("PLUGIN:HealthcareSystemDynamicsTime", options1, scopedCallback1);
			}
		}
	});
	
	// setup inital visual state
	jQuery('#HSDTime-mainDiv .results-directions').css('display', '');
	jQuery('#HSDTime-mainDiv .results-working').css('display', 'none');
	jQuery('#HSDTime-mainDiv .results-finished').css('display', 'none');
	jQuery('#HSDTime-mainDiv .hsd-tabs').css('display', 'none');

	z = $('anaPluginViewFrame').getHeight() - 34;
	$$('DIV#HSDTime-TABS DIV.HSDTime-MainContent')[0].style.height = z;
	$$('DIV#HSDTime-TABS DIV.HSDTime-MainContent')[1].style.height = z;
	$$('DIV#HSDTime-TABS DIV.HSDTime-MainContent')[2].style.height = z;

	// connect click controllers to the results display tabs
	jQuery('#HSDTime-mainDiv .hsd-tabs li.tab').on('click', function(e) {
		// handling hiding/showing of display elements
		jQuery('#HSDTime-mainDiv .hsd-tabs li.tab').removeClass("selected");
		jQuery('#HSDTime-mainDiv .hsd-tabs li.tab[data-tabnum="'+this.dataset.tabnum+'"]').addClass("selected");
		jQuery('#HSDTime-mainDiv .results-finished').css('display', 'none');
		jQuery('#HSDTime-mainDiv .results-finished[data-results-disp="'+this.dataset.tabnum+'"]').css('display', '');
	});
	jQuery('#HSDTime-mainDiv #segmentorX input, #HSDTime-mainDiv #segmentorY input').on('click', function(e) {
		i2b2.HealthcareSystemDynamicsTime.dirtyData();
	});
	
};


i2b2.HealthcareSystemDynamicsTime.Unload = function() {
	// purge old data
	i2b2.HealthcareSystemDynamicsTime.dirtyData();
	i2b2.HealthcareSystemDynamicsTime.model.prsCohort = false;
	i2b2.HealthcareSystemDynamicsTime.model.concptLab = false;
	i2b2.HealthcareSystemDynamicsTime.model.concptOutcome = false;
	return true;
};


i2b2.HealthcareSystemDynamicsTime.dirtyData = function() {
	i2b2.HealthcareSystemDynamicsTime.model.dirtyResultsData = true;
};


i2b2.HealthcareSystemDynamicsTime.prsDroppedCohort = function(sdxData) {
	sdxData = sdxData[0];	// only interested in first record
	i2b2.HealthcareSystemDynamicsTime.model.prsCohort = sdxData;
	jQuery("#HSDTime-prsDropCohort").empty();
	jQuery("#"+sdxData.renderData.htmlID).clone().attr('data-prsid',sdxData.sdxInfo.sdxKeyValue).appendTo("#HSDTime-prsDropCohort");
	i2b2.HealthcareSystemDynamicsTime.dirtyData();
};


i2b2.HealthcareSystemDynamicsTime.concptDroppedLab = function(sdxData) {
	i2b2.HealthcareSystemDynamicsTime.dirtyData();
	jQuery("#HSDTime-concptDropLab").empty();

	// process dropped record
	sdxData = sdxData[0];	// only interested in first record
	var cdetails = i2b2.ONT.ajax.GetTermInfo("PLUGIN:HSDTime", {concept_key_value:sdxData.origData.key, ont_synonym_records: true, ont_hidden_records: true} );
	if (i2b2.h.XPath(cdetails.refXML, "//metadataxml").length > 0) {
		i2b2.HealthcareSystemDynamicsTime.model.concptLab = sdxData;
		jQuery("#"+sdxData.renderData.htmlID).clone().attr('data-prsID',sdxData.sdxInfo.sdxKeyValue).appendTo("#HSDTime-concptDropLab");
		return true;
	}
	// execution arrives here on failure
	jQuery("#HSDTime-concptDropLab").append('<div class="psDropMsg">Drop one lab test here</div>');
};


i2b2.HealthcareSystemDynamicsTime.concptDroppedOutcome = function(sdxData) {
	i2b2.HealthcareSystemDynamicsTime.dirtyData();
	jQuery("#HSDTime-concptDropOutcome").empty();

	// process dropped record
	sdxData = sdxData[0];	// only interested in first record
	var cdetails = i2b2.ONT.ajax.GetTermInfo("PLUGIN:HSDTime", {concept_key_value:sdxData.origData.key, ont_synonym_records: true, ont_hidden_records: true} );
	if (i2b2.h.XPath(cdetails.refXML, "//metadataxml").length == 0) {
		i2b2.HealthcareSystemDynamicsTime.model.concptOutcome = sdxData;
		jQuery("#"+sdxData.renderData.htmlID).clone().attr('data-prsID',sdxData.sdxInfo.sdxKeyValue).appendTo("#HSDTime-concptDropOutcome");
		return true;
	}
	// execution arrives here on failure
	jQuery("#HSDTime-concptDropOutcome").append('<div class="psDropMsg">Drop one concept here as an outcome</div>');
};


i2b2.HealthcareSystemDynamicsTime.getPrsRecord = function(JoiningMutexThreadReference, prsData) {

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

		if (typeof i2b2.HealthcareSystemDynamicsTime.model.attribNames === 'undefined') { i2b2.HealthcareSystemDynamicsTime.model.attribNames = {}; }

		// get all the patient records
		var pData = i2b2.h.XPath(results.refXML, 'descendant::patient/param[@column]/text()/..');
		var hData = new Hash();
		for (var i1=0; i1<pData.length; i1++) {
			var n = pData[i1].getAttribute('column');
			if (typeof i2b2.HealthcareSystemDynamicsTime.model.attribNames[n] === 'undefined') {
				if (pData[i1].getAttribute('column_descriptor') !== null) {
					i2b2.HealthcareSystemDynamicsTime.model.attribNames[n] = pData[i1].getAttribute('column_descriptor');
				} else {
					i2b2.HealthcareSystemDynamicsTime.model.attribNames[n] = n;
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
		if (typeof i2b2.HealthcareSystemDynamicsTime.model.sumCounts == 'undefined') { i2b2.HealthcareSystemDynamicsTime.model.sumCounts = {} }
		if (typeof i2b2.HealthcareSystemDynamicsTime.model.attribNames == 'undefined') { i2b2.HealthcareSystemDynamicsTime.model.attribNames = {} }
		i2b2.HealthcareSystemDynamicsTime.model.sumCounts[prsData.prsKey] = eval("(" + Object.toJSON(hData) +")"); 

		// remove the topics that are to be ignored
		var keys = d3.keys(i2b2.HealthcareSystemDynamicsTime.cfg.displayData.ignore);
		while (keys.length) {
			try {
				var t = keys.pop();
				delete i2b2.HealthcareSystemDynamicsTime.model.attribNames[t];
				delete i2b2.HealthcareSystemDynamicsTime.model.sumCounts[prsData.prsKey][t];
			} catch (e) {}
		}

		// Indicate to the JoiningMutex that this thread is finished
		this.ThreadFinished();
	};
				
	// AJAX CALL USING THE EXISTING CRC CELL COMMUNICATOR
	i2b2.CRC.ajax.getPDO_fromInputList("Plugin:HealthcareSystemDynamicsTime", {PDO_Request: msg_filter}, scopedCallback);	
};


i2b2.HealthcareSystemDynamicsTime.DataRetrieved = function() {
	// optimization - only requery when the input data is changed
	i2b2.HealthcareSystemDynamicsTime.model.dirtyResultsData = false;

	// THIS GETS THE LAB VALUES
	// i2b2.h.XPath(i2b2.HealthcareSystemDynamicsTime.model.ajaxRetNegative.refXML, '//observation[../@panel_name="lab_tests"]')

	// Get list of all patients
	var patient_cohorts = {};
	var patient_nodes = i2b2.h.XPath(i2b2.HealthcareSystemDynamicsTime.model.ajaxRetNegative.refXML, '//patient/patient_id/text()')
	var l = patient_nodes.length;
	for (var i=0; i<l; i++) {
		patient_cohorts[patient_nodes[i].nodeValue] = false;
	}
	// mark the positive outcome cohorts
	var cohorts = i2b2.h.XPath(i2b2.HealthcareSystemDynamicsTime.model.ajaxRetNegative.refXML, '//observation[../@panel_name="cohort_outcome"]');
	cohorts.forEach((function(d, i) { this[i2b2.h.getXNodeVal(d,'patient_id')] = true; }).bind(patient_cohorts));


	// initialize statistic arrays
	var pt_matrix = [];
	var totals_matrix = [];
	var dim_x = i2b2.HealthcareSystemDynamicsTime.config.colSegmentor.getDimRange();
	var dim_y = i2b2.HealthcareSystemDynamicsTime.config.rowSegmentor.getDimRange();
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
		var pt_labs = i2b2.h.XPath(i2b2.HealthcareSystemDynamicsTime.model.ajaxRetNegative.refXML, '//observation[../@panel_name="lab_tests" and patient_id = "'+patient_id+'"]');

		// clear the patient matrix
		pt_matrix = JSON.parse(jsonBlankMatrix);

		// process labs into patient matrix
		while (pt_labs.length > 0) {
			var pt_lab = pt_labs.pop();
			pt_matrix[i2b2.HealthcareSystemDynamicsTime.config.colSegmentor.doSegment(pt_lab)][i2b2.HealthcareSystemDynamicsTime.config.rowSegmentor.doSegment(pt_lab)] = 1;
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
	i2b2.HealthcareSystemDynamicsTime.model.stats = {
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
		i2b2.HealthcareSystemDynamicsTime.model.stats.matrixData,
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
	
	i2b2.HealthcareSystemDynamicsTime.model.stats.summaryCounts = apply_col_row_function(
		i2b2.HealthcareSystemDynamicsTime.model.stats.matrixData,
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
	jQuery("#HSDTime-mainDiv text[class~='HSDTime-svgYAxis']").text(i2b2.HealthcareSystemDynamicsTime.config.rowSegmentor.getAxisLabel(i2b2.HealthcareSystemDynamicsTime.model.prsCohort, i2b2.HealthcareSystemDynamicsTime.model.concptLab, i2b2.HealthcareSystemDynamicsTime.model.concptOutcome))
	jQuery("#HSDTime-mainDiv text[class~='HSDTime-svgXAxis']").text(i2b2.HealthcareSystemDynamicsTime.config.colSegmentor.getAxisLabel(i2b2.HealthcareSystemDynamicsTime.model.prsCohort, i2b2.HealthcareSystemDynamicsTime.model.concptLab, i2b2.HealthcareSystemDynamicsTime.model.concptOutcome));

	// change Y Axis labels
	var labels = i2b2.HealthcareSystemDynamicsTime.config.rowSegmentor.getDimLabels();
	var css_finder = "#HSDTime-mainDiv .yaxis-{i}";
	for (var i=0; i < labels.length; i++) {
		var find = css_finder.replace("{i}", String(i));
		jQuery(find + " text").text(labels[i]);
	}
	// change X Axis labels
	var labels = i2b2.HealthcareSystemDynamicsTime.config.colSegmentor.getDimLabels();
	var css_finder = "#HSDTime-mainDiv .xaxis-{i}";
	for (var i=0; i < labels.length; i++) {
		var find = css_finder.replace("{i}", String(i));
		jQuery(find + " text").text(labels[i]);
	}



	// deal with legend values
	var max_temp = i2b2.HealthcareSystemDynamicsTime.model.stats.summaryCounts.cols.reduce(function(acc, val) { if (acc > val.max_outcome_percent) {return acc}  else {return val.max_outcome_percent} }, 0);
	var min_temp = i2b2.HealthcareSystemDynamicsTime.model.stats.summaryCounts.cols.reduce(function(acc, val) { if (acc < val.min_outcome_percent) {return acc}  else {return val.min_outcome_percent} }, Infinity);
	jQuery("#HSDTime-mainDiv div[data-results-disp] .legend-item:nth-child(1) svg g text[text-anchor='start']").text(i2b2.HealthcareSystemDynamicsTime.safePercent(i2b2.HealthcareSystemDynamicsTime.toPrecision(min_temp, 4)));
	jQuery("#HSDTime-mainDiv div[data-results-disp] .legend-item:nth-child(1) svg g text[text-anchor='end']").text(i2b2.HealthcareSystemDynamicsTime.safePercent(i2b2.HealthcareSystemDynamicsTime.toPrecision(max_temp, 4)));

	// color gradient setup
//	var colorScheme = d3.schemeRdYlGn;
//	var colorGradient = d3.scale.ordinal(colorScheme);
	var colorGradient = d3.scale.linear()
		.domain([min_temp, ((max_temp - min_temp) /2), max_temp])
		.range(["#9b524d", "#ffffa8", "#87a26d"]);

	// the main matrix values
	var matrix = i2b2.HealthcareSystemDynamicsTime.model.stats.matrixData;
	var cx = matrix.length;
	var cy = matrix[0].length;
	var css_finder = "#HSDTime-mainDiv div[data-results-disp='{#}'] .cell-{x}-{y}";
	for (var x=0; x < cx; x++) {
		for (var y=0; y < cy; y++) {
			if (matrix[x][y].cohort == 0) {
				var disp_val1 = "-";
				var disp_fill1 = "lightgrey";
				var disp_val2 = "-";
				var disp_fill2 = "lightgrey";
			} else {
				var disp_val1 = i2b2.HealthcareSystemDynamicsTime.safePercent(i2b2.HealthcareSystemDynamicsTime.toPrecision(matrix[x][y].pos_outcome_percent, 4));
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
	var max_temp = i2b2.HealthcareSystemDynamicsTime.model.stats.summaryCounts.rows.reduce(function(acc, val) { var t = (val.count_pos / val.count_cohort); if (acc > t) {return acc; } else {return t; } }, 0);
	jQuery("#HSDTime-mainDiv div[data-results-disp='1'] .legend-item:nth-child(3) svg g text[text-anchor='end']").text(i2b2.HealthcareSystemDynamicsTime.safePercent(i2b2.HealthcareSystemDynamicsTime.toPrecision(max_temp, 4)));
	var max_temp = i2b2.HealthcareSystemDynamicsTime.model.stats.summaryCounts.rows.reduce(function(acc, val) { if (acc > val.count_cohort) {return acc}  else {return val.count_cohort} }, 0);
	jQuery("#HSDTime-mainDiv div[data-results-disp='2'] .legend-item:nth-child(3) svg g text[text-anchor='end']").text(max_temp);
	// deal with summary bar tick location and label
	var legend_bar = i2b2.HealthcareSystemDynamicsTime.toSinglePrecision(max_temp);
	jQuery('#HSDTime-mainDiv .results-finished[data-results-disp="2"] svg g.y.axis g.tick:last').attr('transform', 'translate('+parseInt((legend_bar / max_temp ) * 100)+',0)');
	jQuery('#HSDTime-mainDiv .results-finished[data-results-disp="2"] svg g.y.axis g.tick:last text').text((d3.format("s"))(legend_bar));
	// color gradient setup
//	var colorScheme = d3.schemeBlues;
//	var colorGradient = d3.scale.ordinal(colorScheme);
	var colorGradient = d3.scale.linear()
		.domain([0,0.5,1])
		.range(["#dfeef8", "#a9cde7", "#76a7ca"]);

	// each summary stat
	for (var y=0; y < cy; y++) {
		var temp = (i2b2.HealthcareSystemDynamicsTime.model.stats.summaryCounts.rows[y].count_pos / i2b2.HealthcareSystemDynamicsTime.model.stats.summaryCounts.rows[y].count_cohort)
		if (isNaN(temp)) {
			temp = 0;
			var fill = colorGradient(0);
		} else {
			var fill = colorGradient(temp);
			temp = temp * 100;
		}
		jQuery("#HSDTime-mainDiv div[data-results-disp='1'] .row-bar-"+y+" rect").attr("width", Math.round(temp));
		jQuery("#HSDTime-mainDiv div[data-results-disp='1'] .row-bar-"+y+" rect").attr("fill", fill);
		jQuery("#HSDTime-mainDiv div[data-results-disp='1'] .row-bar-"+y+" text").text(i2b2.HealthcareSystemDynamicsTime.safePercent(i2b2.HealthcareSystemDynamicsTime.toPrecision(temp/100, 4)));
		jQuery("#HSDTime-mainDiv div[data-results-disp='2'] .row-bar-"+y+" rect").attr("width", Math.round((i2b2.HealthcareSystemDynamicsTime.model.stats.summaryCounts.rows[y].count_cohort / max_temp)*100));
		jQuery("#HSDTime-mainDiv div[data-results-disp='2'] .row-bar-"+y+" rect").attr("fill", colorGradient(i2b2.HealthcareSystemDynamicsTime.model.stats.summaryCounts.rows[y].count_cohort / max_temp));
		jQuery("#HSDTime-mainDiv div[data-results-disp='2'] .row-bar-"+y+" text").text(String(i2b2.HealthcareSystemDynamicsTime.model.stats.summaryCounts.rows[y].count_cohort));
	}
	jQuery("#HSDTime-mainDiv div[data-results-disp='2'] .legend-item:nth-child(3) svg g text[text-anchor='end']")[0]

	// deal with column summary stats
	var max_temp = i2b2.HealthcareSystemDynamicsTime.model.stats.summaryCounts.cols.reduce(function(acc, val) { var t = (val.count_pos / val.count_cohort); if (acc > t) {return acc; } else {return t; } }, 0);
	jQuery("#HSDTime-mainDiv div[data-results-disp='1'] .legend-item:nth-child(2) svg g text[text-anchor='end']").text(i2b2.HealthcareSystemDynamicsTime.safePercent(i2b2.HealthcareSystemDynamicsTime.toPrecision(max_temp, 4)));
	var max_temp = i2b2.HealthcareSystemDynamicsTime.model.stats.summaryCounts.cols.reduce(function(acc, val) { if (acc > val.count_cohort) {return acc}  else {return val.count_cohort} }, 0);
	jQuery("#HSDTime-mainDiv div[data-results-disp='2'] .legend-item:nth-child(2) svg g text[text-anchor='end']").text(max_temp);
	// deal with summary bar tick location and label
	var legend_bar = i2b2.HealthcareSystemDynamicsTime.toSinglePrecision(max_temp);
	jQuery('#HSDTime-mainDiv .results-finished[data-results-disp="2"] svg g.x.axis g.tick:last').attr('transform', 'translate(0,'+parseInt((legend_bar / max_temp) * 100)+')');
	jQuery('#HSDTime-mainDiv .results-finished[data-results-disp="2"] svg g.x.axis g.tick:last text').text((d3.format("s"))(legend_bar));
	// color gradient setup
//	var colorScheme = d3.schemePurples;
//	var colorGradient = d3.scale.ordinal(colorScheme);
	var colorGradient = d3.scale.linear()
		.domain([0,0.5,1])
		.range(["#f1e4fb", "#d4b6ec", "#b188d2"]);

	// each summary stat
	for (var x=0; x < cx; x++) {
		var temp = (i2b2.HealthcareSystemDynamicsTime.model.stats.summaryCounts.cols[x].count_pos / i2b2.HealthcareSystemDynamicsTime.model.stats.summaryCounts.cols[x].count_cohort)
		if (isNaN(temp)) {
			var fill = colorGradient(0);
			temp = 0;
		} else {
			var fill = colorGradient(temp);
			temp = temp * 100;
		}
		jQuery("#HSDTime-mainDiv div[data-results-disp='1'] .col-bar-"+x+" rect").attr("height", Math.round(temp));
		jQuery("#HSDTime-mainDiv div[data-results-disp='1'] .col-bar-"+x+" rect").attr("fill", fill);
		jQuery("#HSDTime-mainDiv div[data-results-disp='1'] .col-bar-"+x+" text").text(i2b2.HealthcareSystemDynamicsTime.safePercent(i2b2.HealthcareSystemDynamicsTime.toPrecision(temp/100, 4)));
		jQuery("#HSDTime-mainDiv div[data-results-disp='2'] .col-bar-"+x+" rect").attr("height", Math.round((i2b2.HealthcareSystemDynamicsTime.model.stats.summaryCounts.cols[x].count_cohort / max_temp)*100));
		jQuery("#HSDTime-mainDiv div[data-results-disp='2'] .col-bar-"+x+" rect").attr("fill", colorGradient(i2b2.HealthcareSystemDynamicsTime.model.stats.summaryCounts.cols[x].count_cohort / max_temp));
		jQuery("#HSDTime-mainDiv div[data-results-disp='2'] .col-bar-"+x+" text").text(String(i2b2.HealthcareSystemDynamicsTime.model.stats.summaryCounts.cols[x].count_cohort));
	}


	// hide the "working" status screen
	jQuery('#HSDTime-mainDiv .results-working').css('display', 'none');
	// show visualization selector tab bar (and select first tab)
	jQuery('#HSDTime-mainDiv .hsd-tabs').css('display', '');
	jQuery('#HSDTime-mainDiv .hsd-tabs li.tab').removeClass("selected");
	jQuery('#HSDTime-mainDiv .hsd-tabs li.tab:first').addClass("selected");
	// display first visualization
	jQuery('#HSDTime-mainDiv .results-finished').css('display', 'none');
	jQuery('#HSDTime-mainDiv .results-finished[data-results-disp="1"]').css('display', '');

};


i2b2.HealthcareSystemDynamicsTime.toSinglePrecision = function(value) {
	var temp = String(value);
	return parseInt(temp.substring(0,1)) * Math.pow(10, temp.length - 1);
};


i2b2.HealthcareSystemDynamicsTime.toPrecision = function(value, precision) {
	var prec = Math.pow(10, precision);
	return Math.round(value * prec) / prec;
};

i2b2.HealthcareSystemDynamicsTime.safePercent = function(value) {
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