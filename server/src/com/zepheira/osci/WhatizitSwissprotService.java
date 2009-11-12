/**
 * Copyright 2008-2009 Zepheira LLC
 */

package com.zepheira.osci;

import javax.ws.rs.Path;

import com.zepheira.osci.base.WhatizitTaggingService;

@Path(WhatizitSwissprotService.PATH)
public class WhatizitSwissprotService extends WhatizitTaggingService {
	public static final String PATH = "/services/tagging/whatizitSwissprot/pipe";
	public static final String TAG_REL = Vocabulary.NS + "whatizitSwissprot";

	@Override
	public String getProcessingPipeline() {
		return "whatizitSwissprot";
	}

	@Override
	public String getTagRel() {
		return TAG_REL;
	}

}
