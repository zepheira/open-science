/**
 * Copyright 2008-2009 Zepheira LLC
 */

package com.zepheira.osci;

import static com.zepheira.osci.Vocabulary.SEARCH_REL;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Date;

import javax.activation.MimeType;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.HEAD;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Request;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;
import javax.ws.rs.core.Response.ResponseBuilder;

import org.apache.abdera.Abdera;
import org.apache.abdera.ext.opensearch.OpenSearchConstants;
import org.apache.abdera.ext.opensearch.model.Url;
import org.apache.abdera.model.Element;
import org.apache.abdera.model.Entry;
import org.apache.abdera.model.Feed;
import org.apache.abdera.model.Link;

import com.sun.jersey.api.ConflictException;
import com.sun.jersey.api.NotFoundException;

/**
 * Implements the Atom Publishing Protocol for each service registry.
 * 
 * @author James Leigh
 * 
 */
public class ServiceRegistry {
	private static final String OPENSEARCH_TYPE = "application/opensearchdescription+xml";
	private static final String ATOM_TYPE = "application/atom+xml";
	private static Abdera abdera = Abdera.getInstance();
	private Request request;
	private UriInfo info;
	private File file;
	private Object lock;

	public ServiceRegistry(Request request, UriInfo info, File file) {
		this.request = request;
		this.info = info;
		this.file = file;
		this.lock = file;
	}

	public Feed getFeed() throws IOException {
		synchronized (lock) {
			return readFeed();
		}
	}

	@HEAD
	@Produces(ATOM_TYPE)
	public Response lastModified() throws IOException {
		synchronized (lock) {
			Date updated = readFeed().getUpdated();
			ResponseBuilder rb = request.evaluatePreconditions(updated);
			if (rb != null)
				return rb.build();
			return Response.ok().lastModified(updated).build();
		}
	}

	@GET
	@Produces(ATOM_TYPE)
	public Response list() throws IOException {
		String uri = info.getAbsolutePath().toASCIIString();
		synchronized (lock) {
			Feed feed = readFeed();
			Date updated = feed.getUpdated();
			ResponseBuilder rb = request.evaluatePreconditions(updated);
			if (rb != null)
				return rb.build();
			feed.addLink(uri, "edit");
			feed.addLink(uri, "self").setMimeType(ATOM_TYPE);
			return Response.ok(feed).lastModified(updated).build();
		}
	}

	@PUT
	@Consumes(ATOM_TYPE)
	public Response put(Feed feed) throws IOException, URISyntaxException {
		synchronized (lock) {
			Date updated = readFeed().getUpdated();
			ResponseBuilder rb = request.evaluatePreconditions(updated);
			if (rb != null)
				return rb.build();
			writeFeed(feed);
		}
		return Response.noContent().build();
	}

	@POST
	@Consumes(ATOM_TYPE)
	@Produces(ATOM_TYPE)
	public Response post(Entry entry) throws IOException, URISyntaxException {
		URI self;
		String uri = info.getAbsolutePath().toASCIIString();
		validateEntry(entry);
		synchronized (lock) {
			self = info.getAbsolutePathBuilder().path(nextId(uri)).build();
			initEntry(entry, self.toASCIIString());
			Feed feed = readFeed();
			if (removeEntry(feed, self.toASCIIString()))
				throw new ConflictException();
			feed.insertEntry(entry);
			writeFeed(feed);
		}
		Date pub = entry.getPublished();
		return Response.created(self).entity(entry).lastModified(pub).build();
	}

	@HEAD
	@Path("/{id}")
	@Produces(ATOM_TYPE)
	public Response head(@PathParam("id") String id) throws IOException {
		String self = info.getAbsolutePath().toASCIIString();
		synchronized (lock) {
			Entry entry = getEntry(readFeed(), self);
			if (entry == null)
				throw new NotFoundException("Service " + id + " not found");
			Date pub = entry.getPublished();
			ResponseBuilder rb = request.evaluatePreconditions(pub);
			if (rb != null)
				return rb.build();
			return Response.ok().lastModified(pub).build();
		}
	}

	@GET
	@Path("/{id}")
	@Produces(ATOM_TYPE)
	public Response get(@PathParam("id") String id) throws IOException {
		String self = info.getAbsolutePath().toASCIIString();
		synchronized (lock) {
			Entry entry = getEntry(readFeed(), self);
			if (entry == null)
				throw new NotFoundException("Service " + id + " not found");
			Date pub = entry.getPublished();
			ResponseBuilder rb = request.evaluatePreconditions(pub);
			if (rb != null)
				return rb.build();
			return Response.ok(entry).lastModified(pub).build();
		}
	}

	@PUT
	@Path("/{id}")
	@Consumes(ATOM_TYPE)
	public Response put(@PathParam("id") String id, Entry entry)
			throws IOException, URISyntaxException {
		String self = info.getAbsolutePath().toASCIIString();
		validateEntry(entry);
		initEntry(entry, self);
		synchronized (lock) {
			Feed feed = readFeed();
			Entry old = getEntry(feed, self);
			if (old != null) {
				Date published = old.getPublished();
				ResponseBuilder rb = request.evaluatePreconditions(published);
				if (rb != null)
					return rb.build();
			}
			removeEntry(feed, self);
			feed.insertEntry(entry);
			writeFeed(feed);
		}
		return Response.noContent().lastModified(entry.getPublished()).build();
	}

	@DELETE
	@Path("/{id}")
	public Response delete(@PathParam("id") String id) throws IOException,
			URISyntaxException {
		String self = info.getAbsolutePath().toASCIIString();
		synchronized (lock) {
			Feed feed = readFeed();
			Entry entry = getEntry(feed, self);
			if (entry == null)
				throw new NotFoundException("Service " + id + " not found");
			Date published = entry.getPublished();
			ResponseBuilder rb = request.evaluatePreconditions(published);
			if (rb != null)
				return rb.build();
			removeEntry(feed, self);
			writeFeed(feed);
		}
		return Response.noContent().build();
	}

	@Path("/{id}/search")
	public SearchResource search(@PathParam("id") String id) throws IOException {
		String self = info.getAbsolutePath().toASCIIString();
		int idx = self.indexOf("/" + id + "/search") + id.length() + 1;
		String search = null;
		Url template = null;
		synchronized (lock) {
			Entry entry = getEntry(readFeed(), self.substring(0, idx));
			if (entry == null)
				throw new NotFoundException("Service " + id + " not found");
			for (Link link : entry.getLinks("alternate", null)) {
				if (link.getMimeType().getBaseType().equals(OPENSEARCH_TYPE)) {
					search = link.getHref().toString();
				}
			}
			for (Element el : entry.getExtensions(OpenSearchConstants.URL)) {
				Url url = new Url(el);
				String rel = url.getAttributeValue("rel");
				if (url.getType().equals(ATOM_TYPE)
						&& (rel == null || rel.equals("results"))) {
					template = url;
				}
			}
		}
		if (search == null && template == null)
			throw new NotFoundException("Search service " + id + " not found");
		return new SearchResource(request, info, search, template);
	}

	private void validateEntry(Entry entry) throws URISyntaxException,
			IOException {
		if (entry.getId() != null && entry.getId().toASCIIString().length() == 0) {
			throw new WebApplicationException(400);
		}
		for (Link link : entry.getLinks()) {
			try {
				URI uri = new URI(link.getHref().toASCIIString());
				if (!uri.isAbsolute())
					throw new WebApplicationException(400);
			} catch (URISyntaxException e) {
				throw new WebApplicationException(400);
			}
			MimeType mimeType = link.getMimeType();
			if (mimeType != null && mimeType.getBaseType().equals(OPENSEARCH_TYPE)) {
				String search = link.getHref().toString();
				new SearchResource(request, info, search, null).validate();
			}
		}
		for (Element el : entry.getExtensions(OpenSearchConstants.URL)) {
			Url url = new Url(el);
			if (url.getTemplate().length() == 0)
				throw new WebApplicationException(400);
		}
}

	/**
	 * Add self link, id, and published date.
	 * 
	 * @return self link
	 */
	private void initEntry(Entry entry, String self) throws URISyntaxException,
			IOException {
		entry.setPublished(new Date());
		if (entry.getId() == null) {
			entry.setId(self);
		}
		for (Link link : entry.getLinks("self", "edit", SEARCH_REL)) {
			link.discard();
			try {
				URI uri = new URI(link.getHref().toASCIIString());
				if (!uri.isAbsolute())
					throw new WebApplicationException(400);
			} catch (URISyntaxException e) {
				throw new WebApplicationException(400);
			}
		}
		entry.addLink(self, "edit");
		entry.addLink(self, "self").setMimeType(ATOM_TYPE);
		for (Link link : entry.getLinks("alternate", null)) {
			if (!link.getHref().isAbsolute())
				throw new WebApplicationException(400);
			if (link.getMimeType().getBaseType().equals(OPENSEARCH_TYPE)) {
				Link l = entry.addLink(self + "/search", SEARCH_REL);
				l.setMimeType(OPENSEARCH_TYPE);
				return;
			}
		}
		for (Element el : entry.getExtensions(OpenSearchConstants.URL)) {
			Url url = new Url(el);
			if (url.getTemplate().length() == 0)
				throw new WebApplicationException(400);
			if (url.getType().equals(ATOM_TYPE)) {
				Link l = entry.addLink(self + "/search", SEARCH_REL);
				l.setMimeType(OPENSEARCH_TYPE);
			}
		}
	}

	/**
	 * @return a unique id not used in the Feed
	 */
	private String nextId(String uri) throws IOException, URISyntaxException {
		synchronized (lock) {
			Feed feed = readFeed();
			int max = 0;
			for (Entry entry : feed.getEntries()) {
				for (Link link : entry.getLinks("self")) {
					if (link.getHref().toASCIIString().startsWith(uri)) {
						String href = link.getHref().toASCIIString();
						assert href.startsWith(uri);
						String id = href.substring(uri.length());
						if (id.startsWith("/i")) {
							try {
								int idx = Integer.parseInt(id.substring(2));
								if (max < idx) {
									max = idx;
								}
							} catch (NumberFormatException e) {
								// non-numeric id
							}
						}
					}
				}
			}
			return "i" + String.valueOf(max + 1);
		}
	}

	private Entry getEntry(Feed feed, String self) {
		for (Entry e : feed.getEntries()) {
			for (Link link : e.getLinks("self")) {
				if (self.equals(link.getHref().toASCIIString())) {
					return e;
				}
			}
		}
		return null;
	}

	private boolean removeEntry(Feed feed, String self) {
		boolean modified = false;
		for (Entry e : feed.getEntries()) {
			for (Link link : e.getLinks()) {
				if (self.equals(link.getHref().toASCIIString())) {
					e.discard();
					modified = true;
					break;
				}
			}
		}
		return modified;
	}

	private Feed readFeed() throws IOException {
		try {
			InputStream in = new FileInputStream(file);
			try {
				Feed feed = abdera.getParser().<Feed> parse(in).getRoot();
				feed.setUpdated(new Date(file.lastModified()));
				return feed.complete();
			} finally {
				in.close();
			}
		} catch (FileNotFoundException e) {
			throw new NotFoundException("Feed " + file.getName() + " not found");
		}
	}

	private void writeFeed(Feed feed) throws IOException {
		File tmp = new File(file.getParentFile(), file.getName() + ".part");
		feed.setUpdated(new Date());
		OutputStream out = new FileOutputStream(tmp);
		try {
			feed.writeTo(out);
			if (!tmp.renameTo(file))
				throw new IOException("Could not write to file: " + file.getName());
		} finally {
			out.close();
		}
	}
}
