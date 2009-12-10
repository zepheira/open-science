# -*- encoding: utf-8 -*-

# Copyright 2008-2009 Zepheira LLC

'''
 Module name:: pubmed_adapter

#
PubMed adapter for Zepheira Open Science Server
 
@ 2009 by Zepheira

This file is part of the open source Zepheira Open Science Server project,
provided under the Apache 2.0 license.

See: http://community.zepheira.com/wiki/open-science/

= Defined REST entry points =

http://open-science.zepheira.com/content/pubmed/source (osci.pubmed.atom) Handles GET
http://open-science.zepheira.com/content/pubmed/discovery (osci.pubmed.discovery) Handles GET

= Configuration =

e.g.

[pubmed_adapter]
osci-base = http://my-open-science-server.com
admin-email = admin@my-open-science-server.com
default-max-results = 100

= Notes on security =

This adapter is to be registered with a ZOSCI server by POSTing a discovery document
with its HTTP end-points.  There is no mechanism to securely send auth details to
the OSCI server, so this server should be mounted so that auth is not required
to access. If you wish to limit access, best bet is to set a firewall or proxy rule to
restrict requestor IP to the ZOSCI server.

'''
#Try: http://localhost:8880/osci.pubmed.atom?search=heart%20attack

import sys, time
import datetime
import urllib, urllib2
from itertools import *
from functools import *

import amara
from amara import bindery
from amara.writers.struct import structwriter, E, NS, ROOT, RAW
from amara.bindery.model import examplotron_model, generate_metadata, metadata_dict
from amara.lib import U
from amara.bindery.html import parse as htmlparse
from amara.namespaces import ATOM_NAMESPACE
from amara.xslt import transform

from amara.tools.atomtools import feed

from akara.services import simple_service
from akara import logger

import logging; logger.setLevel(logging.DEBUG)

#See http://eutils.ncbi.nlm.nih.gov/entrez/query/static/esearch_help.html

#For all DBs:
#NCBI_ESEARCH_PATTERN = 'http://www.ncbi.nlm.nih.gov/entrez/eutils/egquery.fcgi?term=%s'

OPENSEARCH_NAMESPACE = u'http://a9.com/-/spec/opensearch/1.1/'

OSCI_BASE = AKARA.module_config.get('osci-base', 'http://open-science.zepheira.com')
ID_BASE = AKARA.module_config.get('id-base', OSCI_BASE).decode('utf-8')
ADMIN_EMAIL = AKARA.module_config.get('admin-email', 'admin@my-open-science-server.com')
DEFAULT_MAX_RESULTS = int(AKARA.module_config.get('default-max-results', 100))

ATOM_ENVELOPE = '''<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:os="http://a9.com/-/spec/opensearch/1.1/">
  <title>PubMed Open Science adapter</title>
  <id>http://example.org/CHANGE_ME</id>

</feed>
'''

PUBMED_MODEL_XML = """<PubmedArticleSet xmlns:eg="http://examplotron.org/0/" xmlns:ak="http://purl.org/xml3k/akara/xmlmodel">
<PubmedArticle ak:resource="MedlineCitation/PMID">
    <MedlineCitation Owner="NLM" Status="Publisher">
        <PMID>19353725</PMID>
        <!-- Use exslt:date -->
        <DateCreated ak:rel="local-name()" ak:value="concat(Year, '/', Month, '/', Day)">
            <Year>2009</Year>
            <Month>4</Month>
            <Day>8</Day>
        </DateCreated>
        <Article PubModel="Print-Electronic">
            <Journal ak:rel="local-name()" ak:resource="ISSN">
                <ISSN IssnType="Electronic">1099-0801</ISSN>
                <JournalIssue CitedMedium="Internet">
                    <PubDate>
                        <Year>2009</Year>
                        <Month>Apr</Month>
                        <Day>7</Day>
                    </PubDate>
                </JournalIssue>
                <Title ak:rel="local-name()" ak:value=".">Biomedical chromatography : BMC</Title>
                <ISOAbbreviation>Biomed. Chromatogr.</ISOAbbreviation>
            </Journal>

            <ArticleTitle ak:rel="local-name()" ak:value=".">High-performance liquid chromatography and LC-ESI-MS method for identification and quantification of two isomeric polyisoprenylated benzophenones isoxanthochymol and camboginol in different extracts of Garcinia species.</ArticleTitle>
            <Pagination>
                <MedlinePgn/>
            </Pagination>
            <Abstract>
                <AbstractText ak:rel="local-name()" ak:value=".">A rapid, sensitive and simple reverse-phase high-performance liquid chromatography-electrospray ionization mass spectrometric method has been developed for the identification and quantification of two isomeric polyisoprenylated benzophenones, isoxanthochymol and camboginol, in the extracts of the stem bark, seeds and seed pericarps of Garcinia indica and in the fruit rinds of Garcinia cambogia. The separation of isoxanthochymol and camboginol was achieved on a Perkin Elmer RP(8) column (10 x 2.1 mm with 5.0 microm particle size) using a solvent system consisting of a mixture of acetonitrile-water (80:20, v/v) and methanol-acetic acid (99.0:1.0, v/v) as a mobile phase in a gradient elution mode. The limits of detection and quantification were 5 and 10 microg/mL for isoxanthochymol and 50 and 100 microg/mL for camboginol, respectively. The intra- and inter-day precisions were 2.34 and 3.41% for isoxanthochymol and 3.35 and 3.66% for camboginol. The identity of the two isomeric compounds in the samples was determined on a triple quadrupole mass spectrometer with ESI interface operating in the negative ion mode. The method was used to identify and quantify isoxanthochymol and camboginol in the different extracts of two Garcinia species, Garcinia indica and Garcinia cambogia. Copyright (c) 2009 John Wiley &amp; Sons, Ltd.</AbstractText>
            </Abstract>

            <Affiliation ak:rel="local-name()" ak:value=".">Central Institute of Medicinal and Aromatic Plants (CIMAP), PO CIMAP, Lucknow-226015, India.</Affiliation>
            <AuthorList>
                <Author ak:rel="local-name()" ak:resource="">
                    <LastName ak:rel="local-name()" ak:value=".">Kumar</LastName>
                    <FirstName ak:rel="local-name()" ak:value=".">Satyanshu</FirstName>
                    <Initials ak:rel="local-name()" ak:value=".">S</Initials>
                </Author>
            </AuthorList>
            <Language ak:rel="local-name()" ak:value=".">ENG</Language>
            <PublicationTypeList>
                <PublicationType ak:rel="local-name()" ak:value=".">JOURNAL ARTICLE</PublicationType>

            </PublicationTypeList>
            <ArticleDate DateType="Electronic">
                <Year>2009</Year>
                <Month>4</Month>
                <Day>7</Day>
            </ArticleDate>
        </Article>
        <MedlineJournalInfo>
            <MedlineTA>Biomed Chromatogr</MedlineTA>
            <NlmUniqueID>8610241</NlmUniqueID>
        </MedlineJournalInfo>
    </MedlineCitation>
    <PubmedData>
        <History>
            <PubMedPubDate PubStatus="entrez">
                <Year>2009</Year>
                <Month>4</Month>
                <Day>9</Day>
                <Hour>9</Hour>
                <Minute>0</Minute>
            </PubMedPubDate>
            <PubMedPubDate PubStatus="pubmed">
                <Year>2009</Year>
                <Month>4</Month>
                <Day>9</Day>
                <Hour>9</Hour>
                <Minute>0</Minute>
            </PubMedPubDate>
            <PubMedPubDate PubStatus="medline">
                <Year>2009</Year>
                <Month>4</Month>
                <Day>9</Day>
                <Hour>9</Hour>
                <Minute>0</Minute>
            </PubMedPubDate>
        </History>
        <PublicationStatus>aheadofprint</PublicationStatus>
        <ArticleIdList>
            <ArticleId IdType="doi" ak:rel="concat(local-name(), ':', @IdType)" ak:value=".">10.1002/bmc.1202</ArticleId>
            <ArticleId IdType="pubmed">19353725</ArticleId>
        </ArticleIdList>

    </PubmedData>
</PubmedArticle>

</PubmedArticleSet>"""

PUBMED_MODEL = examplotron_model(PUBMED_MODEL_XML)

NCBI_DB = u"pubmed"

PUBMED_NS = OSCI_BASE + u'/content/pubmed/datamodel#'

#Per-article search http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=18324973&retmode=xml
#http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=cancer&reldate=60&datetype=edat&retmax=100&usehistory=y

#http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=11748933,11700088&retmode=xml

#http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=18324973&retmode=xml
NCBI_ARTICLE_ACCESS_PATTERN = "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?"

#http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=cancer&reldate=60&datetype=edat&retmax=100&usehistory=y
NCBI_SEARCH_PATTERN = "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?"

NCBI_HTML_ARTICLE_LINK_BASE = u"http://www.ncbi.nlm.nih.gov/pubmed/"

#def UC(x): return unicode(first_item(x))

@simple_service('GET', OSCI_BASE + '/content/pubmed/source', 'osci.pubmed.atom', 'application/atom+xml')
#def pubmed_adapter(search=None, id=None, fulltext=u'no'):
def pubmed_adapter(search=None, id=None):
    '''
    Sample queries:
    #curl "http://localhost:8880/pubmed?"
    curl "http://localhost:8880/pubmed?search=stem+cells"
    curl "http://localhost:8880/pubmed?id=19358275"
    '''
    #FIXME: How do we handle no search or id param?  Just serve up the latest entries?  Or error as below?
    #assert_(not(search and id), msg="You must specify the 'search' or 'id' query parameter is mandatory.")
    if search:
        #search = first_item(search)
        #reldate: only search for last N days
        #query = urllib.urlencode({'db' : NCBI_DB, 'term': query, 'reldate': '60', 'datetype': 'edat', 'retmax': DEFAULT_MAX_RESULTS, 'usehistory': 'y'})
        query = urllib.urlencode({'term': search, 'db' : NCBI_DB, 'datetype': 'edat', 'retmax': DEFAULT_MAX_RESULTS, 'usehistory': 'y'})
        search_url = NCBI_SEARCH_PATTERN + query
        logger.debug("Term search URL: " + search_url)
        doc = bindery.parse(search_url, standalone=True)
        search_terms = search
        ids = ( unicode(i) for i in doc.eSearchResult.IdList.Id )
        ids = ','.join(ids)
        self_link = '/pubmed?search='+search
    else:
        #ids = first_item(id)
        #fulltext = fulltext[0] if fulltext else u'no'
        #if fulltext == 'yes':
        search_terms = ids
        self_link = '/pubmed?id='+ids
    query = urllib.urlencode({'db' : NCBI_DB, 'id': ids, 'retmode': 'xml'})
    search_url = NCBI_ARTICLE_ACCESS_PATTERN + query
    logger.debug("ID search URL: " + search_url)
    alt_link = search_url
    doc = bindery.parse(search_url, standalone=True, model=PUBMED_MODEL)
    #doc = bindery.parse(open('/Users/uche/tmp/efetch.fcgi.html'), standalone=True, model=PUBMED_MODEL)
    metadata, first_id = metadata_dict(generate_metadata(doc))
    return atom_results(doc, metadata, self_link, alt_link, search_terms)
    #print >> sys.stderr, "Invalid format for this URL pattern: ", (format),


#<os:totalResults>43000</os:totalResults>
#<os:startIndex>1</os:startIndex>
#<os:itemsPerPage>1</os:itemsPerPage>

#PUBMED_ID_BASE = u'http://purl.zepheira.com/osci/content/pubmed?id='
PUBMED_ID_BASE = u'pubmed?id='

def atom_results(doc, metadata, self_link, alt_link, search_terms):
    f = feed(ATOM_ENVELOPE, title=search_terms.decode('utf-8'), id=self_link.decode('utf-8'))
    #f.feed.update = self_link.decode('utf-8')
    f.feed.xml_append(E((ATOM_NAMESPACE, u'link'), {u'rel': u'self', u'type': u'application/atom+xml', u'href': self_link.decode('utf-8')}))
    f.feed.xml_append(E((ATOM_NAMESPACE, u'link'), {u'rel': u'search', u'type': u'application/opensearchdescription+xml', u'href': OSCI_BASE + u'/content/pubmed.discovery'}))
    f.feed.xml_append(E((ATOM_NAMESPACE, u'link'), {u'rel': u'alternate', u'type': u'text/xml', u'href': alt_link.decode('utf-8')}))
    f.feed.xml_append(E((OPENSEARCH_NAMESPACE, u'Query'), {u'role': u'request', u'searchTerms': search_terms.decode('utf-8')}))
    #amara.xml_print(doc, indent=True)
    for aid in islice(doc.PubmedArticleSet.xml_select(u"PubmedArticle/MedlineCitation/PMID"), 0, DEFAULT_MAX_RESULTS):
        #print >> sys.stderr, metadata
        #if u'ArticleTitle' not in resource:
        #    continue
        resource = metadata[unicode(aid)]
        try:
            authors = [ (u'%s, %s, %s'%(U(metadata[a][u'LastName']), U(metadata[a].get(u'FirstName', u'')), U(metadata[a][u'Initials'])), None, None) for a in resource.get(u'Author', []) ]
        except:
            authors = []
        links = [
            (PUBMED_ID_BASE + unicode(aid), u'self'),
            (NCBI_HTML_ARTICLE_LINK_BASE + unicode(aid), u'alternate'),
        ]
        #categories = [ (unicode(k), SD_NS+u'authorKeyword') for k in authkw(article) ]
        elements = [
            E((ATOM_NAMESPACE, u'content'), {u'src': NCBI_HTML_ARTICLE_LINK_BASE + unicode(aid)}),
        #    E((SD_NS, u'sd:journal-cover'), unicode(article.journalCover).strip() if hasattr(article, 'journalCover') else DEFAULT_ICON),
        #    E((SD_NS, u'sd:journal-name'), unicode(article.journalName)),
        ]
        #logger.debug(repr((aid, resource.keys(), resource[u'DateCreated'][0])))
        #if u'ArticleId:doi' in resource and U(resource[u'ArticleId:doi']):
        id_uri = u'doi:' + U(resource[u'ArticleId:doi']) if resource.get(u'ArticleId:doi') else PUBMED_ID_BASE + unicode(aid)
        f.append(
            id_uri,
            U(resource[u'ArticleTitle']),
            updated=datetime.datetime(*(int(bit) for bit in U(resource[u'DateCreated']).split('/'))).isoformat(),
            summary=U(resource.get(u'AbstractText', [])),
            authors=authors,
            links=links,
            #categories=categories,
            elements=elements,
        )
        #print >> sys.stderr, article.xml_select(u'//*[contains(name(), "journal")]')
        #entry['journal_cover'] = 

    #FIXME: indent
    return f.xml_encode()


@simple_service('GET', OSCI_BASE + '/content/pubmed/discovery', 'osci.pubmed.discovery', 'application/opensearchdescription+xml')
def discovery():
    '''
    Sample query:
        curl "http://localhost:8880/osci.pubmed.discovery"
    '''
    doc = '''<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/" xmlns:osci="http://open-science.zepheira.com/content/pubmed/datamodel#">
  <ShortName>PubMed</ShortName>
  <LongName>PubMed OSCI adapter</LongName>
  <Description>PubMed</Description>
  <Contact>%(admin)s</Contact>
  <Url type="application/atom+xml" rel="results" template="%(oscibase)s/osci.pubmed.atom?search={searchTerms}"/>
  <Url type="application/atom+xml" rel="http://open-science.zepheira.com/content/model#id" template="%(oscibase)s/osci.pubmed.atom?id={searchTerms}"/>
  <Attribution>© 2009 Zepheira, LLC</Attribution>
  <osci:metadata-profile href="%(oscibase)s/osci.pubmed.atom/metadata-profile"/>
</OpenSearchDescription>
'''%{'admin': ADMIN_EMAIL, 'oscibase': OSCI_BASE}
    #Check XML
    amara.parse(doc)
    return doc

