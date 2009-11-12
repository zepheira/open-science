/**
 * Copyright 2008-2009 Zepheira LLC
 */

package com.zepheira.osci;

import java.io.IOException;

import com.sun.grizzly.http.SelectorThread;
import com.sun.grizzly.http.servlet.ServletAdapter;
import com.sun.grizzly.standalone.StaticStreamAlgorithm;
import com.sun.jersey.spi.container.servlet.ServletContainer;

public class Server {

	public static void main(String[] args) throws IOException,
			InterruptedException {
		Server server = new Server();
		if (args.length == 2 && "-p".equals(args[0])) {
			server.setPort(Integer.parseInt(args[1]));
		}
		server.start();

		String url = "http://localhost:" + server.getPort();
		System.out.println(String.format("Jersey app started at %s", url));

		server.join();
		server.stop();
		System.exit(0);
	}

	private SelectorThread server;
	private int port = 8080;

	public int getPort() {
		return port;
	}

	public void setPort(int port) {
		this.port = port;
	}

	public String start() throws IOException {
		String pkg = Server.class.getPackage().getName();

		System.out.println("Starting grizzly...");

		ServletAdapter adapter = new ServletAdapter();
		adapter.addInitParameter("com.sun.jersey.config.property.packages", pkg);
		adapter.setServletInstance(new ServletContainer());

		server = new SelectorThread();
		server.setAlgorithmClassName(StaticStreamAlgorithm.class.getName());
		server.setPort(getPort());
		server.setAdapter(adapter);
		server.setMaxThreads(30);

		try {
			server.listen();
		} catch (InstantiationException e) {
			IOException _e = new IOException();
			_e.initCause(e);
			throw _e;
		}
		return "http://localhost:" + server.getPort();
	}

	public void join() throws InterruptedException {
		server.join();
	}

	public void stop() {
		server.stopEndpoint();
	}

}
