/**
 * Copyright 2008-2009 Zepheira LLC
 */

package com.zepheira.osci;

import static com.zepheira.osci.Vocabulary.LINKER_REL;
import static com.zepheira.osci.Vocabulary.LINKREL_REL;
import static com.zepheira.osci.Vocabulary.REFLECT_REL;
import static com.zepheira.osci.Vocabulary.SEARCH_REL;

import java.io.File;

import junit.framework.TestCase;

import org.apache.abdera.Abdera;
import org.apache.abdera.ext.opensearch.model.OpenSearchDescription;
import org.apache.abdera.ext.opensearch.model.Url;
import org.apache.abdera.model.Entry;
import org.apache.abdera.model.Feed;
import org.apache.abdera.model.Link;

import com.sun.jersey.api.client.Client;
import com.sun.jersey.api.client.WebResource;
import com.sun.jersey.api.client.WebResource.Builder;

public class EntryEnhanceTest extends TestCase {
	private static final String OPENSEARCH = "application/opensearchdescription+xml";
	private static final String ATOM = "application/atom+xml";
	private static final String WHATIZIT_REL = WhatizitSwissprotService.TAG_REL;
	private static Abdera abdera = Abdera.getInstance();
	private Server server;
	private String base;
	private Client client;
	private WebResource content;
	private WebResource tagging;
	private WebResource whatizit;
	private WebResource highlighting;
	private WebResource reflect;

	@Override
	public void setUp() throws Exception {
		File entries = new File("enhanced");
		if (entries.isDirectory()) {
			for (File file : entries.listFiles()) {
				file.delete();
			}
		}
		System.setProperty("http.keepAlive", "false");
		server = new Server();
		base = server.start();
		client = Client.create();
		content = client.resource(base).path(ServiceResource.CONTENT_PATH);
		tagging = client.resource(base).path(ServiceResource.SET_PATH);
		whatizit = client.resource(base).path(WhatizitSwissprotService.PATH);
		highlighting = client.resource(base).path(
				ServiceResource.INDIVIDUAL_PATH);
		reflect = client.resource(base).path(ReflectService.PATH);
	}

	@Override
	public void tearDown() throws Exception {
		server.stop();
	}

	public void testReflection() throws Exception {
		postHighlightingService();
		String template = getTemplate(postContentService());
		String url = getURL(template, "", 1, 10);
		Feed feed = client.resource(url).accept(ATOM).get(Feed.class);
		boolean tagged = false;
		for (Entry entry : feed.getEntries()) {
			String self = entry.getSelfLinkResolvedHref().toASCIIString();
			entry = client.resource(self).accept(ATOM).get(Entry.class);
			for (Link tag : entry.getLinks(REFLECT_REL)) {
				tagged = true;
				System.out.println(tag.getHref().toASCIIString());
			}
			client.resource(self).delete();
		}
		assertTrue(tagged);
	}

	public void testWhatIzIt() throws Exception {
		postTaggingService();
		postHighlightingService();
		String template = getTemplate(postContentService());
		String url = getURL(template, "", 1, 10);
		Feed feed = client.resource(url).accept(ATOM).get(Feed.class);
		boolean tagged = false;
		for (Entry entry : feed.getEntries()) {
			String self = entry.getSelfLinkResolvedHref().toASCIIString();
			entry = client.resource(self).accept(ATOM).get(Entry.class);
			for (Link tag : entry.getLinks(WHATIZIT_REL)) {
				tagged = true;
				System.out.print(tag.getTitle());
				System.out.print(" ");
				System.out.println(tag.getHref().toASCIIString());
			}
			client.resource(self).delete();
		}
		assertTrue(tagged);
	}

	private void postTaggingService() {
		Entry entry = abdera.newEntry();
		entry.addLink(whatizit.getURI().toASCIIString(), LINKER_REL);
		entry.addLink(WHATIZIT_REL, LINKREL_REL);
		entry = tagging.type(ATOM).accept(ATOM).post(Entry.class, entry);
	}

	private void postHighlightingService() {
		Entry entry = abdera.newEntry();
		entry.addLink(reflect.getURI().toASCIIString(), LINKER_REL);
		entry.addLink(REFLECT_REL, LINKREL_REL);
		entry = highlighting.type(ATOM).accept(ATOM).post(Entry.class, entry);
	}

	private String postContentService() {
		Entry entry = abdera.newEntry();
		Url url = new Url(abdera);
		url.setType(ATOM);
		url
				.setTemplate("http://jamesrdf.blogspot.com/feeds/posts/default?start-index={startIndex}&max-results={count}");
		entry.addExtension(url);
		entry = content.type(ATOM).accept(ATOM).post(Entry.class, entry);
		assertNotNull(entry.getLink(SEARCH_REL));
		return entry.getLink(SEARCH_REL).getHref().toASCIIString();
	}

	private String getTemplate(String search) {
		Builder web = client.resource(search).accept(OPENSEARCH);
		OpenSearchDescription desc = web.get(OpenSearchDescription.class);
		String template = null;
		for (Url u : desc.getUrls()) {
			template = u.getTemplate();
		}
		return template;
	}

	private String getURL(String template, String q, int index, int count) {
		String url = template;
		url = url.replaceAll("\\{searchTerms\\??\\}", q);
		url = url.replaceAll("\\{startIndex\\??\\}", String.valueOf(index));
		url = url.replaceAll("\\{count\\??\\}", String.valueOf(count));
		url = url.replaceAll("\\{[^\\}]+\\?\\}", "");
		return url;
	}

}
