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
import com.zepheira.osci.ServiceResource;

import junit.framework.TestCase;

public class ServiceRegistryTest extends TestCase {
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

	public void testListServiceTypes() throws Exception {
		URL url = new URL(base + path);
		HttpURLConnection con = (HttpURLConnection) url.openConnection();
		con.setRequestMethod("GET");
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

	public void testPost() throws Exception {
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
			writer.write("This is a protein: Ca2; and so is this Brca1.\n");
			writer.write("But THIS is not.");
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
		url = new URL(base + path + "/i1");
		con = (HttpURLConnection) url.openConnection();
		con.setRequestMethod("DELETE");
		con.getResponseCode();
	}

	public void testPut() throws Exception {
		String id = "http://dx.doi.org/10.1016/j.jaut.2007.12.001";
		URL url = new URL(base + path + "/whatizit");
		HttpURLConnection con = (HttpURLConnection) url.openConnection();
		con.setRequestMethod("PUT");
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
			writer.write("Whatizit Some errors occurred Session Time Out.");
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

	public void testListServices() throws Exception {
		URL url = new URL(base + path);
		HttpURLConnection con = (HttpURLConnection) url.openConnection();
		con.setRequestMethod("GET");
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

	public void testGet() throws Exception {
		URL url = new URL(base + path + "/whatizit");
		HttpURLConnection con = (HttpURLConnection) url.openConnection();
		con.setRequestMethod("GET");
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

	public void testDelete() throws Exception {
		URL url = new URL(base + path + "/whatizit");
		HttpURLConnection con = (HttpURLConnection) url.openConnection();
		con.setRequestMethod("DELETE");
		System.out.println(con.getResponseCode());
		System.out.println(con.getResponseMessage());
	}
}
