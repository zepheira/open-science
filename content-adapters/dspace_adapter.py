# -*- encoding: utf-8 -*-

# Copyright 2008-2009 Zepheira LLC

'''
 Module name:: dspace_adapter
 
MIT DSpace adapter for Zepheira Open Science server
 
See: http://community.zepheira.com/wiki/open-science/
Prerequisites: simplejson, feedparser

= Defined REST entry points =

http://open-science.zepheira.com/content/dspace/source (osci.dspace.atom) Handles GET
http://open-science.zepheira.com/content/dspace/discovery (osci.dspace.discovery) Handles GET

= Configuration =

e.g.

[dspace_adapter]
osci-base = http://my-open-science-server.com
admin-email = admin@my-open-science-server.com

= Notes on security =

This adapter is to be registered with a ZOSCI server by POSTing a discovery document
with its HTTP end-points.  There is no mechanism to securely send auth details to
the OSCI server, so this server should be mounted so that auth is not required
to access. If you wish to limit access, best bet is to set a firewall or proxy rule to
restrict requestor IP to the ZOSCI server.
'''

import sys, time
import datetime
import urllib, urllib2
from itertools import *
from functools import *
from contextlib import closing

import simplejson
import feedparser

import amara
from amara import bindery
from amara.bindery.model import examplotron_model, generate_metadata
from amara.lib import U
#from amara.lib.util import *
from amara.bindery import html
from amara.namespaces import *
from amara.xslt import transform

from amara.tools.atomtools import feed

from akara.services import simple_service

OSCI_BASE = AKARA.module_config.get('osci-base', 'http://open-science.zepheira.com')
ID_BASE = AKARA.module_config.get('id-base', OSCI_BASE).decode('utf-8')
ADMIN_EMAIL = AKARA.module_config.get('admin-email', 'admin@my-open-science-server.com')


ATOM_ENVELOPE = '''<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:ds="%s/dspace/datamodel#" xmlns:os="http://a9.com/-/spec/opensearch/1.1/">
  <title>MIT DSpace Open Science adapter</title>
  <id>CHANGED IN CODE</id>
</feed>
'''%OSCI_BASE

#
OAI_NAMESPACE = u"http://www.openarchives.org/OAI/2.0/"

#OAI-PMH verbs:
# * Identify
# * ListMetadataFormats
# * ListSets
# * GetRecord
# * ListIdentifiers
# * ListRecords

DSPACE_NS = ID_BASE + u'content/dspace/datamodel#'
OPENSEARCH_NAMESPACE = u'http://a9.com/-/spec/opensearch/1.1/'

DEFAULT_MAX_RESULTS = 10

#http://dspace.mit.edu/search?scope=%2F&query=stem+cells&rpp=10&sort_by=0&order=DESC&submit=Go

DSPACE_SEARCH_PATTERN = u"http://dspace.mit.edu/search?%s"
DSPACE_ADAPTER_BASE = OSCI_BASE + u"content/dspace"

DSPACE_ARTICLE = u"http://www.dspace.com/index/details.stp?ID="

RESULTS_DIV = u"aspect_artifactbrowser_SimpleSearch_div_search-results"

DSPACE_OAI_ENDPOINT = u"http://dspace.mit.edu/oai/request"

DSPACE_ARTICLE_BASE = u"http://dspace.mit.edu/handle/"

DSPACE_ID_BASE = u"oai:dspace.mit.edu:"


#Useful:
# http://www.nostuff.org/words/tag/oai-pmh/
# http://libraries.mit.edu/dspace-mit/about/faq.html
# http://wiki.dspace.org/index.php/OaiInstallations - List of OAI installations harvested by DSpace
#Examples:
# http://eprints.sussex.ac.uk/perl/oai2?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:eprints.sussex.ac.uk:67
# http://dspace.mit.edu/oai/request?verb=Identify
# http://dspace.mit.edu/oai/request?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:dspace.mit.edu:1721.1/5451

#Based on: http://dspace.mit.edu/oai/request?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:dspace.mit.edu:1721.1/5451
OAI_MODEL_XML = '''<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:o="http://www.openarchives.org/OAI/2.0/"
         xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd"
         xmlns:eg="http://examplotron.org/0/" xmlns:ak="http://purl.org/xml3k/akara/xmlmodel">
  <responseDate>2009-03-30T06:09:23Z</responseDate>
  <request verb="GetRecord" identifier="oai:dspace.mit.edu:1721.1/5451" metadataPrefix="oai_dc">http://dspace.mit.edu/oai/request</request>
  <GetRecord>
    <record ak:resource="o:header/o:identifier">
      <header>
        <identifier>oai:dspace.mit.edu:1721.1/5451</identifier>
        <datestamp ak:rel="local-name()" ak:value=".">2006-09-20T00:15:44Z</datestamp>
        <setSpec>hdl_1721.1_5443</setSpec>
      </header>
      <metadata>
        <oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" xmlns:dc="http://purl.org/dc/elements/1.1/" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">
          <dc:creator ak:rel="local-name()" ak:value=".">Cohen, Joshua</dc:creator>
          <dc:date ak:rel="local-name()" ak:value=".">2004-08-20T19:48:34Z</dc:date>
          <dc:date>2004-08-20T19:48:34Z</dc:date>
          <dc:date>1991</dc:date>
          <dc:identifier ak:rel="'handle'" ak:value=".">http://hdl.handle.net/1721.1/5451</dc:identifier>
          <dc:description ak:rel="local-name()" ak:value=".">Cohen's Comments on Adam Przeworski's article "Could We Feed Everyone?"</dc:description>
          <dc:format>2146519 bytes</dc:format>
          <dc:format>application/pdf</dc:format>
          <dc:language>en_US</dc:language>
          <dc:publisher ak:rel="local-name()" ak:value=".">Politics and Society</dc:publisher>
          <dc:title ak:rel="local-name()" ak:value=".">"Maximizing Social Welfare or Institutionalizing Democratic Ideals?"</dc:title>
          <dc:type>Article</dc:type>
          <dc:identifier>Joshua Cohen, "Maximizing Social Welfare or Institutionalizing Democratic Ideals?"; Politics and Society, Vol. 19, No. 1</dc:identifier>
        </oai_dc:dc>
      </metadata>
    </record>
  </GetRecord>
</OAI-PMH>
'''

OAI_MODEL = examplotron_model(OAI_MODEL_XML)

@simple_service('GET', 'http://open-science.zepheira.com/content/dspace/source', 'osci.dspace.atom', 'application/atom+xml')
def dspace_adapter(search=None, id=None):
    '''
    Sample queries:
    curl "http://localhost:8880/dspace?search=stem+cells"
    curl "http://localhost:8880/dspace?id=19358275"
    '''
    #FIXME: How do we handle no search or id param?  Just serve up the latest entries?  Or error as below?
    #assert_(not(search and id), msg="You must specify the 'search' or 'id' query parameter is mandatory.")
    if search:
        search = first_item(search)
        #reldate: only search for last N days
        #query = urllib.urlencode({'db' : NCBI_DB, 'term': query, 'reldate': '60', 'datetype': 'edat', 'retmax': DEFAULT_MAX_RESULTS, 'usehistory': 'y'})
        query = urllib.urlencode({'query': search, 'scope': '/', 'rpp': DEFAULT_MAX_RESULTS, 'sort_by': '0', 'order': 'DESC', 'submit': 'Go'})
        search_url = DSPACE_SEARCH_PATTERN%(query)
        #print >> sys.stderr, search_url
        search_terms = search
        alt_link = search_url
        self_link = DSPACE_ADAPTER_BASE + '?' + urllib.urlencode({'search': search})
        doc = html.parse(search_url)

        f = feed(ATOM_ENVELOPE, title=search_terms.decode('utf-8'), id=self_link.decode('utf-8'))
        #f.feed.update = self_link.decode('utf-8')
        f.feed.xml_append(E((ATOM_NAMESPACE, u'link'), {u'rel': u'self', u'type': u'application/atom+xml', u'href': self_link.decode('utf-8')}))
        f.feed.xml_append(E((ATOM_NAMESPACE, u'link'), {u'rel': u'search', u'type': u'application/opensearchdescription+xml', u'href': OSCI_BASE + u'/content/dspace.discovery'}))
        f.feed.xml_append(E((ATOM_NAMESPACE, u'link'), {u'rel': u'alternate', u'type': u'text/xml', u'href': alt_link.decode('utf-8')}))
        f.feed.xml_append(E((OPENSEARCH_NAMESPACE, u'Query'), {u'role': u'request', u'searchTerms': search_terms.decode('utf-8')}))
        maxarticles = DEFAULT_MAX_RESULTS

        #for item in doc.xml_select(u'//*[@class="result_table"]//*[@class="article_title"]'):
        for li in islice(doc.xml_select(u'//*[@id="'+RESULTS_DIV+'"]//*[@class="artifact-description"]/..'), 0, maxarticles):
            row = li.xml_parent.xml_parent
            title = li.xml_select(u'.//*[@class="artifact-title"]')[0]
            rel_id = title.a.href.partition(u'/handle/')[2]
            dspace_id = DSPACE_ID_BASE + rel_id
            alt_link = DSPACE_ARTICLE_BASE + u'1721.1/7488'
            #Do not quote.  DSpace doesn't like that
            #alt_link = DSPACE_ARTICLE_BASE + urllib.quote(u'1721.1/7488', '')
            title = unicode(title)
            summary = unicode(row.xml_select(u'string(.//*[@class="summary"])'))
            updated = unicode(row.xml_select(u'string(.//*[@class="date"])')).strip().partition(u'Published: ')[2]
            #updated = time.strptime(updated, "%m/%d/%Y %H:%M:%S") #2/11/2008 2:20:00 AM
            authors = [ (name.strip(), None, None) for name in unicode(row.xml_select(u'string(.//*[@class="author"]//b)')).split(';') ]

            #Retrieve the DSpace page
            qstr = urllib.urlencode({'verb' : 'GetRecord', 'metadataPrefix': 'oai_dc', 'identifier': dspace_id})
            url = DSPACE_OAI_ENDPOINT + '?' + qstr
            print >> sys.stderr, url
            #keywords = [ (k.strip(), JOVE_TAG) for k in unicode(row.xml_select(u'string(.//*[@class="keywords"])')).split(',') ]

            doc = bindery.parse(url, model=OAI_MODEL)
            #print >> sys.stderr, list(generate_metadata(doc))
            resources, first_id = metadata_dict(generate_metadata(doc))
            record = doc.OAI_PMH

            resource = resources[first_id]

            authors = [ (a, None, None) for a in resource[u'creator'] ]
            links = [
                (DSPACE_ARTICLE_BASE + rel_id, u'alternate'),
                (u'dspace?id=' + dspace_id, u'self'),
            ]
            elements = [
                E((ATOM_NAMESPACE, u'content'), {u'src': alt_link}),
            ]
            f.append(
                dspace_id,
                U(resource['title']),
                updated=U(resource['date']),
                summary=U(resource['description']),
                authors=authors,
                links=links,
                #categories=categories,
                elements=elements,
            )

        #FIXME: indent
        return f.xml_encode()


#<os:totalResults>43000</os:totalResults>
#<os:startIndex>1</os:startIndex>
#<os:itemsPerPage>1</os:itemsPerPage>


@simple_service('GET', 'http://open-science.zepheira.com/content/dspace/discovery', 'osci.dspace.discovery', 'application/opensearchdescription+xml')
def discovery():
    '''
    Sample query:
        curl "http://localhost:8880/osci.dspace.discovery"
    '''
    doc = '''<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/" xmlns:osci="http://open-science.zepheira.com/content/dspace/datamodel#">
  <ShortName>DSpace</ShortName>
  <LongName>DSpace Open Science adapter</LongName>
  <Description>DSpace</Description>
  <Contact>%(admin)s</Contact>
  <Url type="application/atom+xml" rel="results" template="%(oscibase)s/osci.dspace.atom?search={searchTerms}"/>
  <Url type="application/atom+xml" rel="http://open-science.zepheira.com/content/model#id" template="http://open-science.zepheira.com/osci.dspace.atom?doi={searchTerms}"/>
  <Attribution>© 2009 Zepheira, LLC</Attribution>
  <osci:metadata-profile href="%(oscibase)s/osci.dspace.atom/metadata-profile"/>
</OpenSearchDescription>
'''%{'admin': ADMIN_EMAIL, 'oscibase': OSCI_BASE}
    #Check XML
    amara.parse(doc)
    return doc

