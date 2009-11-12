/**
 * Copyright 2008-2009 Zepheira LLC
 */

package com.zepheira.osci;

import static com.zepheira.osci.Vocabulary.TAG_REL;
import junit.framework.TestCase;

import org.apache.abdera.Abdera;
import org.apache.abdera.i18n.iri.IRI;
import org.apache.abdera.model.Entry;

import com.sun.jersey.api.client.Client;
import com.sun.jersey.api.client.WebResource.Builder;

public class ReflectServiceTest extends TestCase {
	private static final String ATOM = "application/atom+xml";
	private static Abdera abdera = Abdera.getInstance();
	private Server server;
	private String base;
	private Client client;
	private Builder reflect;

	@Override
	public void setUp() throws Exception {
		System.setProperty("http.keepAlive", "false");
		server = new Server();
		base = server.start();
		client = Client.create();
		reflect = client.resource(base).path(ReflectService.PATH).type(ATOM).accept(ATOM);
	}

	@Override
	public void tearDown() throws Exception {
		server.stop();
	}

	public void testReflect() throws Exception {
		Entry entry = abdera.newEntry();
		entry.setContent(new IRI("http://leighnet.ca/consulting.html"), "text/html");
		entry = reflect.post(Entry.class, entry);
		entry.writeTo(System.out);
		assertNotNull(entry.getLinkResolvedHref(TAG_REL));
	}

}
