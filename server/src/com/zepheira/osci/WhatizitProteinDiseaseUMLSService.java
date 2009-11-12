/**
 * Copyright 2008-2009 Zepheira LLC
 */

package com.zepheira.osci;

import javax.ws.rs.Path;

import com.zepheira.osci.base.WhatizitTaggingService;

@Path(WhatizitProteinDiseaseUMLSService.PATH)
public class WhatizitProteinDiseaseUMLSService extends WhatizitTaggingService {
	public static final String PATH = "/services/tagging/whatizitProteinDiseaseUMLS/pipe";
	public static final String TAG_REL = Vocabulary.NS + "whatizitProteinDiseaseUMLS";

	@Override
	public String getProcessingPipeline() {
		return "whatizitProteinDiseaseUMLS";
	}

	@Override
	public String getTagRel() {
		return TAG_REL;
	}

}
