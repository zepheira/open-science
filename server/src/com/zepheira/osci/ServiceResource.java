/**
 * Copyright 2008-2009 Zepheira LLC
 */

package com.zepheira.osci;

import static com.zepheira.osci.Vocabulary.SERVICE_TYPE_NS;
import static com.zepheira.osci.Vocabulary.SERVICE_TYPE_REL;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.URI;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import javax.ws.rs.GET;
import javax.ws.rs.HEAD;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Request;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;
import javax.ws.rs.core.Response.ResponseBuilder;

import org.apache.abdera.Abdera;
import org.apache.abdera.factory.Factory;
import org.apache.abdera.model.Collection;
import org.apache.abdera.model.Feed;
import org.apache.abdera.model.Service;
import org.apache.abdera.model.Workspace;

import com.sun.jersey.api.NotFoundException;

/**
 * Produces a static ATOM Service Workspace with entry for the type of services
 * available.
 * 
 * @author James Leigh
 * 
 */
@Path("/services")
public class ServiceResource {
	public static final String CONTENT_PATH = "/services/content";
	public static final String SET_PATH = "/services/tagging";
	public static final String INDIVIDUAL_PATH = "/services/highlighting";
	public static final String LENS_PATH = "/services/lenses";
	private static Abdera abdera = Abdera.getInstance();
	private static Date lastModified;
	private static Map<String, File> services = new HashMap<String, File>();
	static {
		File dir = new File("services");
		dir.mkdirs();
		services.put("content", new File(dir, "content.xml"));
		services.put("tagging", new File(dir, "set.xml"));
		services.put("highlighting", new File(dir, "individual.xml"));
		services.put("lenses", new File(dir, "lens.xml"));
		try {
			for (String id : services.keySet()) {
				File file = services.get(id);
				if (!file.exists()) {
					Feed feed = abdera.newFeed();
					feed.setRights("All content Copyright 2009, EBI");
					feed.setUpdated(new Date());
					String ln = file.getName().replace(".xml", "");
					feed.addLink(SERVICE_TYPE_NS + ln, SERVICE_TYPE_REL);
					OutputStream out = new FileOutputStream(file);
					try {
						feed.writeTo(out);
					} finally {
						out.close();
					}
				}
			}
		} catch (IOException e) {
			throw new AssertionError(e);
		}
		lastModified = new Date();
	}
	private Request request;
	private UriInfo info;

	public ServiceResource(@Context Request request, @Context UriInfo info) {
		this.request = request;
		this.info = info;
	}

	public List<Feed> getFeeds() throws IOException {
		synchronized (services) {
			List<Feed> list = new ArrayList<Feed>(services.size());
			for (String id : services.keySet()) {
				File file = services.get(id);
				if (file == null)
					continue;
				ServiceRegistry reg = new ServiceRegistry(request, info, file);
				list.add(reg.getFeed());
			}
			return list;
		}
	}

	@HEAD
	@Produces("application/atomsvc+xml")
	public Response lastModified() {
		Date lastModified = getLastModified();
		ResponseBuilder rb = request.evaluatePreconditions(lastModified);
		if (rb != null)
			return rb.build();
		return Response.ok().lastModified(lastModified).build();
	}

	@GET
	@Produces("application/atomsvc+xml")
	public Response list() {
		Date lastModified = getLastModified();
		ResponseBuilder rb = request.evaluatePreconditions(lastModified);
		if (rb != null)
			return rb.build();
		Factory af = abdera.getFactory();
		Service service = abdera.newService();
		Workspace ws = af.newWorkspace();
		ws.setTitle("Service Registry");
		synchronized (services) {
			for (String id : services.keySet()) {
				Collection collection = af.newCollection();
				URI tagging = info.getAbsolutePathBuilder().path(id).build();
				collection.setHref(tagging.toASCIIString());
				collection.accepts("entry");
				ws.addCollection(collection);
			}
		}
		service.addWorkspace(ws);
		return Response.ok(service).lastModified(lastModified).build();
	}

	@Path("/{id}")
	public ServiceRegistry collection(@PathParam("id") String id) {
		File file;
		synchronized (services) {
			file = services.get(id);
			if (file == null)
				throw new NotFoundException("Service type " + id + " not found");
		}
		return new ServiceRegistry(request, info, file);
	}

	private Date getLastModified() {
		synchronized (services) {
			Iterator<File> iter = services.values().iterator();
			while (iter.hasNext()) {
				if (!iter.next().exists()) {
					iter.remove();
					lastModified = new Date();
				}
			}
		}
		return lastModified;
	}

}
