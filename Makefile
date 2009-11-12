all: openscience.tar.gz

openscience.tar:
	find . -not -path "*.svn*" -not -name "Makefile" -not -name "*.tar" -print0 | tar -c --no-recursion --null --files-from=- -f $@
	mkdir openscience
	tar xf $@ -Copenscience
	rm $@
	tar cf $@ openscience
	rm -rf openscience

openscience.tar.gz: openscience.tar
	gzip -9 $^

clean:
	rm -rf openscience
	rm -f openscience.tar openscience.tar.gz
