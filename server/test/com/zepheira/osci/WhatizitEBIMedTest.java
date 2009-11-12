/**
 * Copyright 2008-2009 Zepheira LLC
 */

package com.zepheira.osci;

import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Reader;
import java.io.Writer;
import java.net.HttpURLConnection;
import java.net.URL;

import com.zepheira.osci.Server;
import com.zepheira.osci.WhatizitEBIMedService;

import junit.framework.TestCase;

public class WhatizitEBIMedTest extends TestCase {
	private String path = WhatizitEBIMedService.PATH;
	public Server server;
	private String base;

	@Override
	public void setUp() throws Exception {
		System.setProperty("http.keepAlive", "false");
		server = new Server();
		base = server.start();
	}

	@Override
	public void tearDown() throws Exception {
		server.stop();
	}

	public void testInline() throws Exception {
		String id = "http://dx.doi.org/10.1016/j.jaut.2007.12.001";
		URL url = new URL(base + path);
		HttpURLConnection con = (HttpURLConnection) url.openConnection();
		con.setRequestMethod("POST");
		con.setDoOutput(true);
		con.setDoInput(true);
		con.setRequestProperty("Content-Type", "application/atom+xml");
		con.setRequestProperty("Transfer-Encoding", "chunked");
		con.setChunkedStreamingMode(256);
		Writer writer = new OutputStreamWriter(con.getOutputStream());
		try {
			writer.write("<?xml version=\"1.0\"?>\n");
			writer.write("<entry xmlns=\"http://www.w3.org/2005/Atom\">\n");
			writer.write("<id>");
			writer.write(id);
			writer.write("</id>\n");
			writer.write("<content type='text'>");
			writer.write("Acrylamide, a known disrupter of intermediate filaments, has been used to produce the collapse of vimentin filaments in bovine lens epithelial (BEL) cells, and its potential modulation of staurosporine-induced apoptosis has been investigated . In BEL cells, short treatments with acrylamide caused the collapse of vimentin filaments and microtubules and the almost complete disappearance of stress fibers, with thick f-actin bundles remaining in the cell periphery . Actin organization was less affected in cells pretreated with colchicine and in spreading cells, suggesting that extended microtubules and vimentin filaments are required for acrylamide to produce its maximal effects . Acrylamide alone slightly increased apoptosis compared to controls . However, simultaneous exposure to acrylamide and staurosporine for 8h produced significantly less apoptosis than staurosporine alone, and preincubation with acrylamide followed by staurosporine markedly reduced apoptosis at 8 and 24h of treatment . Acrylamide seems therefore to have a dual effect on BEL cell survival . ");
			writer.write("</content>\n");
			writer.write("</entry>\n");
		} finally {
			writer.close();
		}
		Reader reader = new InputStreamReader(con.getInputStream());
		try {
			int read;
			char[] cbuf = new char[256];
			while ((read = reader.read(cbuf)) >= 0) {
				System.out.print(new String(cbuf, 0, read));
			}
		} finally {
			reader.close();
		}
	}

	public void testInline2() throws Exception {
		String id = "http://dx.doi.org/10.1016/j.jaut.2007.12.001";
		URL url = new URL(base + path);
		HttpURLConnection con = (HttpURLConnection) url.openConnection();
		con.setRequestMethod("POST");
		con.setDoOutput(true);
		con.setDoInput(true);
		con.setRequestProperty("Content-Type", "application/atom+xml");
		con.setRequestProperty("Transfer-Encoding", "chunked");
		con.setChunkedStreamingMode(502);
		Writer writer = new OutputStreamWriter(con.getOutputStream());
		try {
			writer.write("<?xml version=\"1.0\"?>\n");
			writer.write("<entry xmlns=\"http://www.w3.org/2005/Atom\">\n");
			writer.write("<id>");
			writer.write(id);
			writer.write("</id>\n");
			writer.write("<content type='text'>");
			writer.write("The classic cadherins are a group of calcium dependent, homophilic cell-cell adhesion molecules that drive morphogenetic rearrangements and maintain the integrity of cell groups through the formation of adherens junctions . The formation and maintenance of cadherin-mediated adhesions is a multistep process and mechanisms have evolved to regulate each step . This suggests that functional state switching plays an important role in development . Among the many challenges ahead is to determine the developmental role that functional state switching plays in tissue morphogenesis and to define the roles of each of the several regulatory interactions that participate in switching . One correlate of the loss of cadherin-mediated adhesion, the \"turn-off\" of cadherin function, is the exit, or \"drop-out\" of cells from neural and epithelial layers and their conversion to a motile phenotype . We suggest that epithelial mesenchymal conversions may be initiated by signaling pathways that result in the loss of cadherin function . Tyrosine phosphorylation of beta-catenin is one such mechanism . Enhanced phosphorylation of tyrosine residues on beta-catenin is almost invariably associated with loss of the cadherin-actin connection concomitant with loss of adhesive function . There are several tyrosine kinases and phosphatases that have been shown to have the potential to alter the phosphorylation state of beta-catenin and thus the function of cadherins . Our laboratory has focused on the role of the nonreceptor tyrosine phosphatase PTP1B in regulating the phosphorylation of beta-catenin on tyrosine residues . Our data suggest that PTP1B is crucial for maintenance of N-cadherin-mediated adhesions in embryonic neural retina( APRD00017 APRD00140 APRD00362 ) cells . By using an L-cell model system constitutively expressing N-cadherin, we have worked out many of the molecular interactions essential for this regulatory interaction . Extracellular cues that bias this critical regulatory interaction toward increased phosphorylation of beta-catenin may be a critical component of many developmental events . ");
			writer.write("</content>\n");
			writer.write("</entry>\n");
		} finally {
			writer.close();
		}
		Reader reader = new InputStreamReader(con.getInputStream());
		try {
			int read;
			char[] cbuf = new char[256];
			while ((read = reader.read(cbuf)) >= 0) {
				System.out.print(new String(cbuf, 0, read));
			}
		} finally {
			reader.close();
		}
	}

	public void testExternal() throws Exception {
		String id = "http://dx.doi.org/10.1016/j.jaut.2007.12.001";
		URL url = new URL(base + path);
		HttpURLConnection con = (HttpURLConnection) url.openConnection();
		con.setRequestMethod("POST");
		con.setDoOutput(true);
		con.setDoInput(true);
		con.setRequestProperty("Content-Type", "application/atom+xml");
		con.setRequestProperty("Transfer-Encoding", "chunked");
		con.setChunkedStreamingMode(256);
		Writer writer = new OutputStreamWriter(con.getOutputStream());
		try {
			writer.write("<?xml version=\"1.0\"?>\n");
			writer.write("<entry xmlns=\"http://www.w3.org/2005/Atom\">\n");
			writer.write("<id>");
			writer.write(id);
			writer.write("</id>\n");
			writer.write("<content type='html' src='http://dx.doi.org/10.1016/j.foodhyd.2008.09.005'/>\n");
			writer.write("</entry>\n");
		} finally {
			writer.close();
		}
		Reader reader = new InputStreamReader(con.getInputStream());
		try {
			int read;
			char[] cbuf = new char[256];
			while ((read = reader.read(cbuf)) >= 0) {
				System.out.print(new String(cbuf, 0, read));
			}
		} finally {
			reader.close();
		}
	}
}
