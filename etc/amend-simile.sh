#!/bin/sh

# Checkout from SVN: http://simile-widgets.googlecode.com/svn/api-site/trunk/
# Place this script in the root directory of the checkout.  Run it.

FILES=`find . -name "*" -not -path "*.svn*" -exec grep -l 'http://api.simile-widgets.org' \{} \;`

for FILE in $FILES ; do
    cat $FILE | sed 's/http:\/\/api\.simile-widgets\.org/http:\/\/example\.new\.hostname/g' > $FILE.new
    mv $FILE.new $FILE
done
