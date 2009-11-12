/**
 * Copyright 2008-2009 Zepheira LLC
 */

package com.zepheira.osci;

import java.io.OutputStreamWriter;
import java.io.Writer;
import java.net.HttpURLConnection;
import java.net.URL;

import com.zepheira.osci.Server;
import com.zepheira.osci.ServiceResource;

import junit.framework.TestCase;

public class BadRequestsTest extends TestCase {
	private String path = ServiceResource.SET_PATH;
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

	public void testEmptyId() throws Exception {
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
			writer.write("</id>\n");
			writer.write("<content type='text'>");
			writer.write("This is a protein: Ca2; and so is this Brca1.\n");
			writer.write("But THIS is not.");
			writer.write("</content>\n");
			writer.write("</entry>\n");
		} finally {
			writer.close();
		}
		assertEquals(400, con.getResponseCode());
	}

	public void testEmptyLink() throws Exception {
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
			writer.write("<link href=''/>\n");
			writer.write("</entry>\n");
		} finally {
			writer.close();
		}
		assertEquals(400, con.getResponseCode());
	}
}
