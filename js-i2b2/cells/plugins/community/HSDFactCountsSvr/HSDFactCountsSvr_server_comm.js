// we need to create a custom communicator object for
i2b2.HSDFactCountsSvr.ajax = i2b2.hive.communicatorFactory("HSDFactCountsSvr");

// ================================================================================================== //
i2b2.HSDFactCountsSvr.cfg.msgHSDFactCountsSvr = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r'+
    '<ns6:request xmlns:ns4="http://www.i2b2.org/xsd/cell/crc/psm/1.1/"\r'+
    '  xmlns:ns7="http://www.i2b2.org/xsd/cell/crc/psm/querydefinition/1.1/"\r'+
    '  xmlns:ns3="http://www.i2b2.org/xsd/cell/crc/pdo/1.1/"\r'+
    '  xmlns:ns5="http://www.i2b2.org/xsd/hive/plugin/"\r'+
    '  xmlns:ns2="http://www.i2b2.org/xsd/hive/pdo/1.1/"\r'+
    '  xmlns:ns6="http://www.i2b2.org/xsd/hive/msg/1.1/"\r'+
    '  xmlns:ns8="http://www.i2b2.org/xsd/cell/crc/psm/analysisdefinition/1.1/">\r'+
    '	<message_header>\n'+
    '		{{{proxy_info}}}'+
    '		<sending_application>\n'+
    '			<application_name>i2b2_QueryTool</application_name>\n'+
    '			<application_version>' + i2b2.ClientVersion + '</application_version>\n'+
    '		</sending_application>\n'+
    '		<sending_facility>\n'+
    '			<facility_name>PHS</facility_name>\n'+
    '		</sending_facility>\n'+
    '		<receiving_application>\n'+
    '			<application_name>i2b2_DataRepositoryCell</application_name>\n'+
    '			<application_version>' + i2b2.ClientVersion + '</application_version>\n'+
    '		</receiving_application>\n'+
    '		<receiving_facility>\n'+
    '			<facility_name>PHS</facility_name>\n'+
    '		</receiving_facility>\n'+
    '		<message_type>\n'+
    '			<message_code>Q04</message_code>\n'+
    '			<event_type>EQQ</event_type>\n'+
    '		</message_type>\n'+
    '		<security>\n'+
    '			<domain>{{{sec_domain}}}</domain>\n'+
    '			<username>{{{sec_user}}}</username>\n'+
    '			{{{sec_pass_node}}}\n'+
    '		</security>\n'+
    '		<message_control_id>\n'+
    '			<message_num>{{{header_msg_id}}}</message_num>\n'+
    '			<instance_num>0</instance_num>\n'+
    '		</message_control_id>\n'+
    '		<processing_id>\n'+
    '			<processing_id>P</processing_id>\n'+
    '			<processing_mode>I</processing_mode>\n'+
    '		</processing_id>\n'+
    '		<accept_acknowledgement_type>messageId</accept_acknowledgement_type>\n'+
    '		<project_id>{{{sec_project}}}</project_id>\n'+
    '	</message_header>\n'+
    '	<request_header>\n'+
    '		<result_waittime_ms>{{{result_wait_time}}}000</result_waittime_ms>\n'+
    '	</request_header>\n'+
    '	<message_body>\n'+
    '	<ns4:psmheader>\n'+
    '		<user login="{{{sec_user}}}">{{{sec_user}}}</user>\n'+
    '		<patient_set_limit>0</patient_set_limit>\n'+
    '		<estimated_time>0</estimated_time>\n'+
    '		<request_type>CRC_QRY_runQueryInstance_fromAnalysisDefinition</request_type>\n'+
    '	</ns4:psmheader>\n'+
    '		<ns4:request xsi:type="ns4:analysis_definition_requestType" \n'+
    '		  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n'+
    '	<analysis_definition>\n' +
    '		<analysis_plugin_name>HEALTHCARE_SYSTEM_DYNAMICS</analysis_plugin_name>\n' +
    '		<version>1.0</version>\n' +
    '		<crc_analysis_input_param name="ONT request">\n' +
    '			<param type="text" column="hsd_query_type">HSD_GET_AGE_FACTS</param>' +
    '			<param type="int" column="resultInstanceID">{{{result_instance_id}}}</param>\n' +
    '		</crc_analysis_input_param>\n' +
    '		<crc_analysis_result_list>\n' +
    '			<result_output full_name="XML" priority_index="1" name="XML"/>\n' +
    '		</crc_analysis_result_list>\n' +
    '	</analysis_definition>\n'+
    '		</ns4:request>\n'+
    '	</message_body>\n'+
    '</ns6:request>';


i2b2.HSDFactCountsSvr.ajax._addFunctionCall(	"getFactCountSummary",
    "{{{URL}}}request",
    i2b2.HSDFactCountsSvr.cfg.msgHSDFactCountsSvr,
    ["HSD_Request"]);