/**
 * @projectDescription	Visualizes locally computed Healthcare System Dynamics information using TimeGrid Heat Map.
 * @inherits	i2b2
 * @namespace	i2b2.HSDLabTestsSvr
 * @author		Nick Benik
 * @version 	1.0
 * ----------------------------------------------------------------------------------------
 * 2016-06-08:  Initial Launch [Nick Benik]
 */


i2b2.HSDLabTestsSvr.config = {
	rowSegmentor: null,  // these are set later
	colSegmentor: null,  // these are set later
	groupSize: 1000000
};

i2b2.HSDLabTestsSvr.Init = function(loadedDiv) {
	// This plugin uses a server-side plugin hosted by the CRC cell. We need to copy data over to make our custom communication calls work
    i2b2.HSDLabTestsSvr.cfg.cellURL = i2b2.CRC.cfg.cellURL;

	// allow multiple experiments to be dropped into the visualization
	i2b2.HSDLabTestsSvr.model.prsCohort = false;
	i2b2.HSDLabTestsSvr.model.concptLab = false;
	i2b2.HSDLabTestsSvr.model.concptOutcome = false;
    i2b2.HSDLabTestsSvr.model.qmPrevRun = false;
    i2b2.HSDLabTestsSvr.model.dataPrevRun = false;
    i2b2.HSDLabTestsSvr.model.stats = {};

    // register DIV as valid DragDrop target for Patient Record Sets (PRS) objects
	var op_trgt = {dropTarget:true};
	i2b2.sdx.Master.AttachType("HSDLabTestsSvr-concptDropLab", "CONCPT", op_trgt);
	i2b2.sdx.Master.AttachType("HSDLabTestsSvr-concptDropOutcome", "CONCPT", op_trgt);
	i2b2.sdx.Master.AttachType("HSDLabTestsSvr-prsDropCohort", "PRS", op_trgt);


	// drop event handlers used by this plugin
	i2b2.sdx.Master.setHandlerCustom("HSDLabTestsSvr-concptDropLab", "CONCPT", "DropHandler", i2b2.HSDLabTestsSvr.concptDroppedLab);
	i2b2.sdx.Master.setHandlerCustom("HSDLabTestsSvr-concptDropOutcome", "CONCPT", "DropHandler", i2b2.HSDLabTestsSvr.concptDroppedOutcome);
	i2b2.sdx.Master.setHandlerCustom("HSDLabTestsSvr-prsDropCohort", "PRS", "DropHandler", i2b2.HSDLabTestsSvr.prsDroppedCohort);

    i2b2.sdx.Master.AttachType("HSDLabTestsSvr-App", "QM", op_trgt);
    i2b2.sdx.Master.setHandlerCustom("HSDLabTestsSvr-App", "QM", "DropHandler", i2b2.HSDLabTestsSvr.qmDroppedPrevRun);


	// use D3js to population our visualization segmentors
	var segmentorsX = d3.select("#segmentorX").selectAll("div")
		.data(i2b2.HSDLabTestsSvr.dataengine.axisXCalcs)
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
		.data(i2b2.HSDLabTestsSvr.dataengine.axisYCalcs)
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
	this.yuiTabs = new YAHOO.widget.TabView("HSDLabTestsSvr-TABS", {activeIndex:0});
	this.yuiTabs.on('activeTabChange', function(ev) { 
		//Tabs have changed 
		if (ev.newValue.get('id')=="HSDLabTestsSvr-TAB1") {
			// user switched to Results tab

			if (i2b2.HSDLabTestsSvr.model.prsCohort === false || i2b2.HSDLabTestsSvr.model.concptLab === false || i2b2.HSDLabTestsSvr.model.concptOutcome === false) {
				console.warn("You must provide a cohort, lab test and an outcome concept");
				return true;
			} else {
 				if (i2b2.HSDLabTestsSvr.model.dirtyResultsData != true) { return true; }

				// GUI changes (while working)
				jQuery('#HSDLabTestsSvr-mainDiv .results-directions').css('display', 'none');
				jQuery('#HSDLabTestsSvr-mainDiv .results-working').css('display', '');
				jQuery('#HSDLabTestsSvr-mainDiv .results-finished').css('display', 'none');
				jQuery('#HSDLabTestsSvr-mainDiv .hsd-tabs').css('display', 'none');

				// configure the segmentor objects
				var temp = jQuery('input[name=HSDHeatMapXCalc]:checked').val();
				temp = i2b2.HSDLabTestsSvr.dataengine.axisXCalcs[temp].funcName;
				i2b2.HSDLabTestsSvr.config.colSegmentor = i2b2.HSDLabTestsSvr.dataengine.segmentors[temp];
				var temp = jQuery('input[name=HSDHeatMapYCalc]:checked').val();
				temp = i2b2.HSDLabTestsSvr.dataengine.axisYCalcs[temp].funcName;
				i2b2.HSDLabTestsSvr.config.rowSegmentor = i2b2.HSDLabTestsSvr.dataengine.segmentors[temp];

				// scoped callback for the running the server-side HSD calculations
				var scopedCB = new i2b2_scopedCallback();
				scopedCB.callback = function(results) {
					// we have a new query results instance ID that contains the statistics data
                    i2b2.HSDLabTestsSvr.model.dataPrevRun = results;
                    //
                    var result_instance_id = i2b2.h.XPath(results.refXML, 'descendant::query_result_instance/result_instance_id/text()/..')[0].firstChild.nodeValue
                    i2b2.CRC.ajax.getQueryResultInstanceList_fromQueryResultInstanceId("Plugin:HelloHSD", {qr_key_value: result_instance_id}, function(ajaxRet) {
                        // this is the statistical data
                        var resultEnvelopeXml = i2b2.h.XPath(ajaxRet.refXML, 'descendant::xml_value/text()/..')[0].firstChild.nodeValue;

                        i2b2.HSDLabTestsSvr.model.stats = {};
                        i2b2.HSDLabTestsSvr.model.stats.xml = i2b2.h.parseXml(resultEnvelopeXml);

                        // change from XML to standard format for visualization
                        i2b2.HSDLabTestsSvr.model.stats.matrixData = i2b2.HSDLabTestsSvr.dataengine.process(
                            i2b2.HSDLabTestsSvr.model.stats.xml,
                            i2b2.HSDLabTestsSvr.config.rowSegmentor,
                            i2b2.HSDLabTestsSvr.config.colSegmentor,
                            i2b2.HSDLabTestsSvr.model.prsCohort,
                            i2b2.HSDLabTestsSvr.model.concptLab,
                            i2b2.HSDLabTestsSvr.model.concptOutcome
                        );
                        i2b2.HSDLabTestsSvr.model.dirtyResultsData = false;
                        i2b2.HSDLabTestsSvr.StatisticsRetrieved();
                    });
					return false;
				};

				// fire off request to calculate server-calculated statistics (but only if not previously calculated)
                if (typeof i2b2.HSDLabTestsSvr.model.stats.xml === "undefined") {
                    try {
                        var PRS_id = i2b2.HSDLabTestsSvr.model.prsCohort.origData.PRS_id
                    } catch (e) {
                        var PRS_id = i2b2.HSDLabTestsSvr.model.prsCohort;
                    }
                    i2b2.HSDLabTestsSvr.ajax.getLabTestSummary("PLUGIN:HSDLabTestsSvr", {
                        result_instance_id: PRS_id,
                        lab_concept_path: i2b2.HSDLabTestsSvr.model.concptLab.origData.key,
                        outcome_concept_path: i2b2.HSDLabTestsSvr.model.concptOutcome.origData.key,
                    }, scopedCB);
                } else {
                    // statistics are already downloaded, just recalculate
                    // change from XML to standard format for visualization
                    i2b2.HSDLabTestsSvr.model.stats.matrixData = i2b2.HSDLabTestsSvr.dataengine.process(
                        i2b2.HSDLabTestsSvr.model.stats.xml,
                        i2b2.HSDLabTestsSvr.config.rowSegmentor,
                        i2b2.HSDLabTestsSvr.config.colSegmentor,
                        i2b2.HSDLabTestsSvr.model.prsCohort,
                        i2b2.HSDLabTestsSvr.model.concptLab,
                        i2b2.HSDLabTestsSvr.model.concptOutcome
                    );
                    i2b2.HSDLabTestsSvr.model.dirtyResultsData = false;
                    i2b2.HSDLabTestsSvr.StatisticsRetrieved();
                }
			}
		}
	});
	
	// setup inital visual state
	jQuery('#HSDLabTestsSvr-mainDiv .results-directions').css('display', '');
	jQuery('#HSDLabTestsSvr-mainDiv .results-working').css('display', 'none');
	jQuery('#HSDLabTestsSvr-mainDiv .results-finished').css('display', 'none');
	jQuery('#HSDLabTestsSvr-mainDiv .hsd-tabs').css('display', 'none');

	z = $('anaPluginViewFrame').getHeight() - 34;
	$$('DIV#HSDLabTestsSvr-TABS DIV.HSDLabTestsSvr-MainContent')[0].style.height = z;
	$$('DIV#HSDLabTestsSvr-TABS DIV.HSDLabTestsSvr-MainContent')[1].style.height = z;
	$$('DIV#HSDLabTestsSvr-TABS DIV.HSDLabTestsSvr-MainContent')[2].style.height = z;

	// connect click controllers to the results display tabs
	jQuery('#HSDLabTestsSvr-mainDiv .hsd-tabs li.tab').on('click', function(e) {
		// handling hiding/showing of display elements
		jQuery('#HSDLabTestsSvr-mainDiv .hsd-tabs li.tab').removeClass("selected");
		jQuery('#HSDLabTestsSvr-mainDiv .hsd-tabs li.tab[data-tabnum="'+this.dataset.tabnum+'"]').addClass("selected");
		jQuery('#HSDLabTestsSvr-mainDiv .results-finished').css('display', 'none');
		jQuery('#HSDLabTestsSvr-mainDiv .results-finished[data-results-disp="'+this.dataset.tabnum+'"]').css('display', '');
	});
	jQuery('#HSDLabTestsSvr-mainDiv #segmentorX input, #HSDLabTestsSvr-mainDiv #segmentorY input').on('click', function(e) {
		i2b2.HSDLabTestsSvr.dirtyData();
	});
	
};


i2b2.HSDLabTestsSvr.Unload = function() {
	// purge old data
	i2b2.HSDLabTestsSvr.dirtyData();
	i2b2.HSDLabTestsSvr.model.prsCohort = false;
	i2b2.HSDLabTestsSvr.model.concptLab = false;
	i2b2.HSDLabTestsSvr.model.concptOutcome = false;
    i2b2.HSDLabTestsSvr.model.qmPrevRun = false;
    i2b2.HSDLabTestsSvr.model.dataPrevRun = false;
	return true;
};


i2b2.HSDLabTestsSvr.dirtyData = function() {
	i2b2.HSDLabTestsSvr.model.dirtyResultsData = true;
};


i2b2.HSDLabTestsSvr.qmDroppedPrevRun = function(sdxData) {
    i2b2.HSDLabTestsSvr.dirtyData();
    i2b2.HSDLabTestsSvr.model.qmPrevRun = sdxData[0];
	// see if the query master has correct definition via "hsd_query_type" =  "HSD_GET_LAB"
    var scopedCB = new i2b2_scopedCallback();
    scopedCB.callback = function(results) {
        // save the results and then build a visualization
		var myXML = results.refXML;
        var hsd_query_type = i2b2.h.XPath(myXML, "//crc_analysis_input_param/param[@column = 'hsd_query_type']/text()");
        var toUse = false;
        if (hsd_query_type.length > 0) {
        	if (hsd_query_type[0].nodeValue == "HSD_GET_LAB") {
                // previous query is of correct type for this plugin, extract values
                try {
                    i2b2.HSDLabTestsSvr.model.prsCohort = false;
                    document.getElementById("HSDLabTestsSvr-prsDropCohort").innerHTML = "<div class='psDropMsg'>Drop a patient set here</div>";
                    i2b2.HSDLabTestsSvr.model.prsCohort = i2b2.h.XPath(myXML, "//crc_analysis_input_param/param[@column='resultInstanceID']/text()")[0].nodeValue;
                    document.getElementById("HSDLabTestsSvr-prsDropCohort").innerHTML = `<div class='psDropMsg'>${i2b2.HSDLabTestsSvr.model.prsCohort}</div>`;
                } catch (e) {}
                try {
                    i2b2.HSDLabTestsSvr.model.concptLab = false;
                    document.getElementById("HSDLabTestsSvr-concptDropLab").innerHTML = "<div class='psDropMsg'>Drop one lab test here</div>";
                    i2b2.HSDLabTestsSvr.model.concptLab = i2b2.h.XPath(myXML, "//crc_analysis_input_param/param[@column='labtestConceptPath']/text()")[0].nodeValue;
                    document.getElementById("HSDLabTestsSvr-concptDropLab").innerHTML = `<div class='psDropMsg'>${i2b2.HSDLabTestsSvr.model.concptLab}</div>`;

                    var scoped_callback = new i2b2_scopedCallback;
                    scoped_callback.scope = "concptLab";
                    scoped_callback.callback = function(cbResults){
                        if (cbResults.error === true) {
                            alert("An error has occured trying to load the name of the Lab concept!");
                            return true;
                        }
                        cbResults.parse();
                        var temp = cbResults.model[0];
                        var renderOptions = {
                            title: temp.sdxInfo.sdxDisplayName,
                            icon: {
                                root: "sdx_ONT_CONCPT_root.gif",
                                rootExp: "sdx_ONT_CONCPT_root-exp.gif",
                                branch: "sdx_ONT_CONCPT_branch.gif",
                                branchExp: "sdx_ONT_CONCPT_branch-exp.gif",
                                leaf: "sdx_ONT_CONCPT_leaf.gif"
                            }
                        };
                        var sdxDataNode = i2b2.sdx.Master.RenderHTML("HSDLabTestsSvr-concptDropLab",temp, renderOptions);
                        document.getElementById("HSDLabTestsSvr-concptDropLab").innerHTML = sdxDataNode.renderData.html;
                        i2b2.HSDLabTestsSvr.model.concptLab = sdxDataNode;
                    }
                    // fire the request
                    var tagValues = { "ont_synonym_records": "N",
                        "ont_hidden_records":"N",
                        "concept_key_value": i2b2.HSDLabTestsSvr.model.concptLab
                    };
                    i2b2.ONT.ajax.GetTermInfo("PLUGIN:HSDLabTest", tagValues, scoped_callback);
                } catch (e) {}
                try {
                    i2b2.HSDLabTestsSvr.model.concptOutcome = false;
                    document.getElementById("HSDLabTestsSvr-concptDropOutcome").innerHTML = "<div class='psDropMsg'>Drop one concept here as an outcome</div>";
                    i2b2.HSDLabTestsSvr.model.concptOutcome = i2b2.h.XPath(myXML, "//crc_analysis_input_param/param[@column='outcomeConceptPath']/text()")[0].nodeValue;
                    document.getElementById("HSDLabTestsSvr-concptDropOutcome").innerHTML = `<div class='psDropMsg'>${i2b2.HSDLabTestsSvr.model.concptOutcome}</div>`;
                    var scoped_callback = new i2b2_scopedCallback;
                    scoped_callback.scope = "concptLab";
                    scoped_callback.callback = function(cbResults){
                        if (cbResults.error === true) {
                            alert("An error has occured trying to load the name of the Outcome concept!");
                            return true;
                        }
                        cbResults.parse();
                        var temp = cbResults.model[0];
                        var renderOptions = {
                            title: temp.sdxInfo.sdxDisplayName,
                            icon: {
                                root: "sdx_ONT_CONCPT_root.gif",
                                rootExp: "sdx_ONT_CONCPT_root-exp.gif",
                                branch: "sdx_ONT_CONCPT_branch.gif",
                                branchExp: "sdx_ONT_CONCPT_branch-exp.gif",
                                leaf: "sdx_ONT_CONCPT_leaf.gif"
                            }
                        };
                        var sdxDataNode = i2b2.sdx.Master.RenderHTML("HSDLabTestsSvr-concptDropOutcome",temp, renderOptions);
                        document.getElementById("HSDLabTestsSvr-concptDropOutcome").innerHTML = sdxDataNode.renderData.html;
                        i2b2.HSDLabTestsSvr.model.concptOutcome = sdxDataNode;
                    }
                    // fire the request
                    var tagValues = { "ont_synonym_records": "N",
                        "ont_hidden_records":"N",
                        "concept_key_value": i2b2.HSDLabTestsSvr.model.concptOutcome
                    };
                    i2b2.ONT.ajax.GetTermInfo("PLUGIN:HSDLabTest", tagValues, scoped_callback);
                } catch (e) {}
                i2b2.HSDLabTestsSvr.model.dataPrevRun = false;
                return; // explicit end execution here to prevent clearing i2b2.HSDLabTestsSvr.model.qmPrevRun
            }
		}
        // invalid QM
		i2b2.HSDLabTestsSvr.model.qmPrevRun = false;
        // TODO: UI signal indicating it is not a previous HSD_GET_LAB query
        return false;
    };
	// get the information from the query's XML definition
    i2b2.CRC.ajax.getRequestXml_fromQueryMasterId("PLUGIN:HSDLabTestsSvr", {qm_key_value:i2b2.HSDLabTestsSvr.model.qmPrevRun.sdxInfo.sdxKeyValue}, scopedCB);
};

i2b2.HSDLabTestsSvr.prsDroppedCohort = function(sdxData) {
    i2b2.HSDLabTestsSvr.dirtyData();
	sdxData = sdxData[0];	// only interested in first record
	i2b2.HSDLabTestsSvr.model.prsCohort = sdxData;
	jQuery("#HSDLabTestsSvr-prsDropCohort").empty();
	jQuery("#"+sdxData.renderData.htmlID).clone().attr('data-prsid',sdxData.sdxInfo.sdxKeyValue).appendTo("#HSDLabTestsSvr-prsDropCohort");
};


i2b2.HSDLabTestsSvr.concptDroppedLab = function(sdxData) {
    i2b2.HSDLabTestsSvr.dirtyData();
	jQuery("#HSDLabTestsSvr-concptDropLab").empty();

	// process dropped record
	sdxData = sdxData[0];	// only interested in first record
	var cdetails = i2b2.ONT.ajax.GetTermInfo("PLUGIN:HSDLabTestsSvr", {concept_key_value:sdxData.origData.key, ont_synonym_records: true, ont_hidden_records: true} );
	if (i2b2.h.XPath(cdetails.refXML, "//metadataxml").length > 0) {
		i2b2.HSDLabTestsSvr.model.concptLab = sdxData;
		jQuery("#"+sdxData.renderData.htmlID).clone().attr('data-prsID',sdxData.sdxInfo.sdxKeyValue).appendTo("#HSDLabTestsSvr-concptDropLab");
		return true;
	}
	// execution arrives here on failure
	jQuery("#HSDLabTestsSvr-concptDropLab").append('<div class="psDropMsg">Drop one lab test here</div>');
};


i2b2.HSDLabTestsSvr.concptDroppedOutcome = function(sdxData) {
	i2b2.HSDLabTestsSvr.dirtyData();
	jQuery("#HSDLabTestsSvr-concptDropOutcome").empty();

	// process dropped record
	sdxData = sdxData[0];	// only interested in first record
	var cdetails = i2b2.ONT.ajax.GetTermInfo("PLUGIN:HSDLabTestsSvr", {concept_key_value:sdxData.origData.key, ont_synonym_records: true, ont_hidden_records: true} );
	if (i2b2.h.XPath(cdetails.refXML, "//metadataxml").length == 0) {
		i2b2.HSDLabTestsSvr.model.concptOutcome = sdxData;
		jQuery("#"+sdxData.renderData.htmlID).clone().attr('data-prsID',sdxData.sdxInfo.sdxKeyValue).appendTo("#HSDLabTestsSvr-concptDropOutcome");
		return true;
	}
	// execution arrives here on failure
	jQuery("#HSDLabTestsSvr-concptDropOutcome").append('<div class="psDropMsg">Drop one concept here as an outcome</div>');
};


i2b2.HSDLabTestsSvr.getPrsRecord = function(JoiningMutexThreadReference, prsData) {

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

		if (typeof i2b2.HSDLabTestsSvr.model.attribNames === 'undefined') { i2b2.HSDLabTestsSvr.model.attribNames = {}; }

		// get all the patient records
		var pData = i2b2.h.XPath(results.refXML, 'descendant::patient/param[@column]/text()/..');
		var hData = new Hash();
		for (var i1=0; i1<pData.length; i1++) {
			var n = pData[i1].getAttribute('column');
			if (typeof i2b2.HSDLabTestsSvr.model.attribNames[n] === 'undefined') {
				if (pData[i1].getAttribute('column_descriptor') !== null) {
					i2b2.HSDLabTestsSvr.model.attribNames[n] = pData[i1].getAttribute('column_descriptor');
				} else {
					i2b2.HSDLabTestsSvr.model.attribNames[n] = n;
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
		if (typeof i2b2.HSDLabTestsSvr.model.sumCounts == 'undefined') { i2b2.HSDLabTestsSvr.model.sumCounts = {} }
		if (typeof i2b2.HSDLabTestsSvr.model.attribNames == 'undefined') { i2b2.HSDLabTestsSvr.model.attribNames = {} }
		i2b2.HSDLabTestsSvr.model.sumCounts[prsData.prsKey] = eval("(" + Object.toJSON(hData) +")");

		// remove the topics that are to be ignored
		var keys = d3.keys(i2b2.HSDLabTestsSvr.cfg.displayData.ignore);
		while (keys.length) {
			try {
				var t = keys.pop();
				delete i2b2.HSDLabTestsSvr.model.attribNames[t];
				delete i2b2.HSDLabTestsSvr.model.sumCounts[prsData.prsKey][t];
			} catch (e) {}
		}

		// Indicate to the JoiningMutex that this thread is finished
		this.ThreadFinished();
	};
				
	// AJAX CALL USING THE EXISTING CRC CELL COMMUNICATOR
	i2b2.CRC.ajax.getPDO_fromInputList("Plugin:HSDLabTestsSvr", {PDO_Request: msg_filter}, scopedCallback);
};


i2b2.HSDLabTestsSvr.StatisticsRetrieved = function() {
	debugger;

    // REBUILD THE SVG DISPLAY DOM
    var dim_x = i2b2.HSDLabTestsSvr.config.colSegmentor.getDimSize();
    var dim_y = i2b2.HSDLabTestsSvr.config.rowSegmentor.getDimSize();
    var svgs = d3.selectAll("svg.HeatMap01")[0];
    i2b2.HSDLabTestsSvr.render.build(svgs[0], dim_x, dim_y);
    i2b2.HSDLabTestsSvr.render.build(svgs[1], dim_x, dim_y);

    // inject values into the visualization HTML/SVG
    jQuery("#HSDLabTestsSvr-mainDiv text[class~='HSDLabTestsSvr-svgYAxis']").text(i2b2.HSDLabTestsSvr.model.stats.matrixData.axis.y.label)
    jQuery("#HSDLabTestsSvr-mainDiv text[class~='HSDLabTestsSvr-svgXAxis']").text(i2b2.HSDLabTestsSvr.model.stats.matrixData.axis.x.label);

    // change Y Axis labels
    var labels = i2b2.HSDLabTestsSvr.config.rowSegmentor.getDimLabels();
    var css_finder = "#HSDLabTestsSvr-mainDiv .yaxis-{i}";
    for (var i=0; i < labels.length; i++) {
        var find = css_finder.replace("{i}", String(i));
        jQuery(find + " text").text(labels[i]);
    }
    // change X Axis labels
    var labels = i2b2.HSDLabTestsSvr.config.colSegmentor.getDimLabels();
    var css_finder = "#HSDLabTestsSvr-mainDiv .xaxis-{i}";
    for (var i=0; i < labels.length; i++) {
        var find = css_finder.replace("{i}", String(i));
        jQuery(find + " text").text(labels[i]);
    }

    // deal with legend values
    var max_temp = i2b2.HSDLabTestsSvr.model.stats.matrixData.axis.x.segments.reduce(function(acc, val) { if (acc > val.max_outcome_percent) {return acc}  else {return val.max_outcome_percent} }, 0);
    var min_temp = i2b2.HSDLabTestsSvr.model.stats.matrixData.axis.x.segments.reduce(function(acc, val) { if (acc < val.min_outcome_percent) {return acc}  else {return val.min_outcome_percent} }, Infinity);
    jQuery("#HSDLabTestsSvr-mainDiv div[data-results-disp] .legend-item:nth-child(1) svg g text[text-anchor='start']").text(i2b2.HSDLabTestsSvr.safePercent(i2b2.HSDLabTestsSvr.toPrecision(min_temp, 4)));
    jQuery("#HSDLabTestsSvr-mainDiv div[data-results-disp] .legend-item:nth-child(1) svg g text[text-anchor='end']").text(i2b2.HSDLabTestsSvr.safePercent(i2b2.HSDLabTestsSvr.toPrecision(max_temp, 4)));

    // color gradient setup
//	var colorScheme = d3.schemeRdYlGn;
//	var colorGradient = d3.scale.ordinal(colorScheme);
    var colorGradient = d3.scale.linear()
        .domain([min_temp, ((max_temp - min_temp) /2), max_temp])
        .range(["#9b524d", "#ffffa8", "#87a26d"]);

    // the main matrix values
    var matrix = i2b2.HSDLabTestsSvr.model.stats.matrixData.cells;
    var cx = matrix.length;
    var cy = matrix[0].length;
    var css_finder = "#HSDLabTestsSvr-mainDiv div[data-results-disp='{#}'] .cell-{x}-{y}";
    for (var x=0; x < cx; x++) {
        for (var y=0; y < cy; y++) {
            if (matrix[x][y].cohort == 0) {
                var disp_val1 = "-";
                var disp_fill1 = "lightgrey";
                var disp_val2 = "-";
                var disp_fill2 = "lightgrey";
            } else {
                var disp_val1 = i2b2.HSDLabTestsSvr.safePercent(i2b2.HSDLabTestsSvr.toPrecision(matrix[x][y].pos_outcome_percent, 4));
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
    delete colorGradient;

    // deal with row summary stats
    var max_temp = i2b2.HSDLabTestsSvr.model.stats.matrixData.axis.y.segments.reduce(function(acc, val) { var t = (val.count_pos / val.count_cohort); if (isNaN(t)) {t=0;} if (acc > t) {return acc; } else {return t; } }, 0);
    jQuery("#HSDLabTestsSvr-mainDiv div[data-results-disp='1'] .legend-item:nth-child(3) svg g text[text-anchor='end']").text(i2b2.HSDLabTestsSvr.safePercent(i2b2.HSDLabTestsSvr.toPrecision(max_temp, 4)));
    var max_temp = i2b2.HSDLabTestsSvr.model.stats.matrixData.axis.y.segments.reduce(function(acc, val) { if (acc > val.count_cohort) {return acc}  else {return val.count_cohort} }, 0);
    jQuery("#HSDLabTestsSvr-mainDiv div[data-results-disp='2'] .legend-item:nth-child(3) svg g text[text-anchor='end']").text(max_temp);
    jQuery("#HSDLabTestsSvr-mainDiv div[data-results-disp='2'] .legend-item:nth-child(3) svg g text[text-anchor='start']").text("0");
    // deal with summary bar tick location and label
    var legend_bar = i2b2.HSDLabTestsSvr.toSinglePrecision(max_temp);
    jQuery('#HSDLabTestsSvr-mainDiv .results-finished[data-results-disp="2"] svg g.y.axis g.tick:last').attr('transform', 'translate('+parseInt((legend_bar / max_temp ) * 100)+',0)');
    jQuery('#HSDLabTestsSvr-mainDiv .results-finished[data-results-disp="2"] svg g.y.axis g.tick:last text').text((d3.format("s"))(legend_bar));
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
        var temp = (i2b2.HSDLabTestsSvr.model.stats.matrixData.axis.y.segments[y].count_pos / i2b2.HSDLabTestsSvr.model.stats.matrixData.axis.y.segments[y].count_cohort)
        if (isNaN(temp)) {
            temp = 0;
            var fill = colorGradient(0);
        } else {
            var fill = colorGradient(temp);
            temp = temp * 100;
        }
        jQuery("#HSDLabTestsSvr-mainDiv div[data-results-disp='1'] .row-bar-"+y+" rect").attr("width", Math.round(temp));
        jQuery("#HSDLabTestsSvr-mainDiv div[data-results-disp='1'] .row-bar-"+y+" rect").attr("fill", fill);
        jQuery("#HSDLabTestsSvr-mainDiv div[data-results-disp='1'] .row-bar-"+y+" text").text(i2b2.HSDLabTestsSvr.safePercent(i2b2.HSDLabTestsSvr.toPrecision(temp/100, 4)));
        jQuery("#HSDLabTestsSvr-mainDiv div[data-results-disp='2'] .row-bar-"+y+" rect").attr("width", Math.round((i2b2.HSDLabTestsSvr.model.stats.matrixData.axis.y.segments[y].count_cohort / max_temp)*100));
        jQuery("#HSDLabTestsSvr-mainDiv div[data-results-disp='2'] .row-bar-"+y+" rect").attr("fill", colorGradient(i2b2.HSDLabTestsSvr.model.stats.matrixData.axis.y.segments[y].count_cohort / max_temp));
        jQuery("#HSDLabTestsSvr-mainDiv div[data-results-disp='2'] .row-bar-"+y+" text").text(String(i2b2.HSDLabTestsSvr.model.stats.matrixData.axis.y.segments[y].count_cohort));
    }
    jQuery("#HSDLabTestsSvr-mainDiv div[data-results-disp='2'] .legend-item:nth-child(3) svg g text[text-anchor='end']")[0]
    delete colorGradient;

    // deal with column summary stats
    var max_temp = i2b2.HSDLabTestsSvr.model.stats.matrixData.axis.x.segments.reduce(function(acc, val) { var t = (val.count_pos / val.count_cohort); if (isNaN(t)) {t=0;} if (acc > t) {return acc; } else {return t; } }, 0);
    jQuery("#HSDLabTestsSvr-mainDiv div[data-results-disp='1'] .legend-item:nth-child(2) svg g text[text-anchor='end']").text(i2b2.HSDLabTestsSvr.safePercent(i2b2.HSDLabTestsSvr.toPrecision(max_temp, 4)));
    var max_temp = i2b2.HSDLabTestsSvr.model.stats.matrixData.axis.x.segments.reduce(function(acc, val) { if (acc > val.count_cohort) {return acc}  else {return val.count_cohort} }, 0);
    jQuery("#HSDLabTestsSvr-mainDiv div[data-results-disp='2'] .legend-item:nth-child(2) svg g text[text-anchor='end']").text(max_temp);
    jQuery("#HSDLabTestsSvr-mainDiv div[data-results-disp='2'] .legend-item:nth-child(2) svg g text[text-anchor='start']").text("0");
    // deal with summary bar tick location and label
    var legend_bar = i2b2.HSDLabTestsSvr.toSinglePrecision(max_temp);
    jQuery('#HSDLabTestsSvr-mainDiv .results-finished[data-results-disp="2"] svg g.x.axis g.tick:last').attr('transform', 'translate(0,'+parseInt((legend_bar / max_temp) * 100)+')');
    jQuery('#HSDLabTestsSvr-mainDiv .results-finished[data-results-disp="2"] svg g.x.axis g.tick:last text').text((d3.format("s"))(legend_bar));
    // make sure there is only one minor tick line on the second screen
    while (jQuery('#HSDLabTestsSvr-mainDiv .results-finished[data-results-disp="2"] svg g.x.axis g.tick.minor').length > 1) {
        jQuery('#HSDLabTestsSvr-mainDiv .results-finished[data-results-disp="2"] svg g.x.axis g.tick.minor:first').remove();
    }

    // color gradient setup
//	var colorScheme = d3.schemePurples;
//	var colorGradient = d3.scale.ordinal(colorScheme);
    var colorGradient = d3.scale.linear()
        .domain([0,0.5,1])
        .range(["#f1e4fb", "#d4b6ec", "#b188d2"]);

    // each summary stat
    for (var x=0; x < cx; x++) {
        var segment = i2b2.HSDLabTestsSvr.model.stats.matrixData.axis.x.segments[x];
        var temp = segment.count_pos / segment.count_cohort;
        if (isNaN(temp)) {
            var fill = colorGradient(0);
            temp = 0;
        } else {
            var fill = colorGradient(temp);
            temp = temp * 100;
        }
        jQuery("#HSDLabTestsSvr-mainDiv div[data-results-disp='1'] .col-bar-"+x+" rect").attr("height", Math.round(temp));
        jQuery("#HSDLabTestsSvr-mainDiv div[data-results-disp='1'] .col-bar-"+x+" rect").attr("fill", fill);
        jQuery("#HSDLabTestsSvr-mainDiv div[data-results-disp='1'] .col-bar-"+x+" text").text(i2b2.HSDLabTestsSvr.safePercent(i2b2.HSDLabTestsSvr.toPrecision(temp/100, 4)));
        jQuery("#HSDLabTestsSvr-mainDiv div[data-results-disp='2'] .col-bar-"+x+" rect").attr("height", Math.round((segment.count_cohort / max_temp)*100));
        jQuery("#HSDLabTestsSvr-mainDiv div[data-results-disp='2'] .col-bar-"+x+" rect").attr("fill", colorGradient(segment.count_pos / max_temp));
        jQuery("#HSDLabTestsSvr-mainDiv div[data-results-disp='2'] .col-bar-"+x+" text").text(String(segment.count_cohort));
    }

    delete colorGradient;

    // hide the "working" status screen
    jQuery('#HSDLabTestsSvr-mainDiv .results-working').css('display', 'none');
    // show visualization selector tab bar (and select first tab)
    jQuery('#HSDLabTestsSvr-mainDiv .hsd-tabs').css('display', '');
    jQuery('#HSDLabTestsSvr-mainDiv .hsd-tabs li.tab').removeClass("selected");
    jQuery('#HSDLabTestsSvr-mainDiv .hsd-tabs li.tab:first').addClass("selected");
    // display first visualization
    jQuery('#HSDLabTestsSvr-mainDiv .results-finished').css('display', 'none');
    jQuery('#HSDLabTestsSvr-mainDiv .results-finished[data-results-disp="1"]').css('display', '');
};


i2b2.HSDLabTestsSvr.DataRetrieved = function() {
    // optimization - only requery when the input data is changed
    i2b2.HSDLabTestsSvr.model.dirtyResultsData = false;

    // extract the results id
    i2b2.HSDLabTestsSvr.model.HSD_QRI_id = i2b2.h.XPath(i2b2.HSDLabTestsSvr.model.ajaxResults.refXML, 'descendant::query_result_instance/result_instance_id/text()/..')[0].firstChild.nodeValue;

    i2b2.HSDLabTestsSvr.model.stats = {};
    i2b2.HSDLabTestsSvr.model.stats.xml = i2b2.HSDLabTestsSvr.model.StatsXML;

    // change from XML to standard format for visualization
    i2b2.HSDLabTestsSvr.model.stats.matrixData = i2b2.HSDLabTestsSvr.dataengine.process(
        i2b2.HSDLabTestsSvr.model.stats.xml,
        i2b2.HSDLabTestsSvr.config.rowSegmentor,
        i2b2.HSDLabTestsSvr.config.colSegmentor,
        i2b2.HSDLabTestsSvr.model.prsCohort,
        i2b2.HSDLabTestsSvr.model.conceptLab,
        i2b2.HSDLabTestsSvr.model.conceptOutcome
    );


//    process: function(data, rowSegmentor, colSegmentor, patientset, labtest, outcome) {


    // make call to get the actual statistics data
    /*
    i2b2.HSDLabTestsSvr.model.stats = {};
    var scopedCB = new i2b2_scopedCallback();
    scopedCB.callback = function (results) {
        // save the statistics results and then build a visualization
        var resultEnvelopeXml = i2b2.h.XPath(results.refXML, 'descendant::xml_value/text()/..')[0].firstChild.nodeValue;
        var re = new RegExp('<', 'g');
        var resultEnvelope = resultEnvelopeXml.replace(re, '&lt;');
        var re2 = new RegExp('>', 'g');
        resultEnvelope = resultEnvelope.replace(re, '&gt;');

        i2b2.HSDLabTestsSvr.model.stats.xml = resultEnvelope;

        // REBUILD THE SVG DISPLAY DOM
        var dim_x = i2b2.HSDLabTestsSvr.config.colSegmentor.getDimSize();
        var dim_y = i2b2.HSDLabTestsSvr.config.rowSegmentor.getDimSize();
        var svgs = d3.selectAll("svg.HeatMap01")[0];
        i2b2.HSDLabTestsSvr.render.build(svgs[0], dim_x, dim_y);
        i2b2.HSDLabTestsSvr.render.build(svgs[1], dim_x, dim_y);

        // render
        i2b2.HSDLabTestsSvr.StatisticsRetrieved();
        return false;
    };

    // fire off request to get server-calculated statistics
	i2b2.CRC.ajax.getQueryResultInstanceList_fromQueryResultInstanceId("Plugin:HSDLabTestsSvr", {qr_key_value: i2b2.HSDLabTestsSvr.model.HSD_QRI_id}, scopedCallback2);
	*/


};


i2b2.HSDLabTestsSvr.toSinglePrecision = function(value) {
	var temp = String(value);
	return parseInt(temp.substring(0,1)) * Math.pow(10, temp.length - 1);
};

i2b2.HSDLabTestsSvr.toPrecision = function(value, precision) {
	var prec = Math.pow(10, precision);
	return Math.round(value * prec) / prec;
};

i2b2.HSDLabTestsSvr.safePercent = function(value) {
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