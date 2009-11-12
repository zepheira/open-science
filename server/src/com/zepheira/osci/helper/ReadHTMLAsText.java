/**
 * Copyright 2008-2009 Zepheira LLC
 */

package com.zepheira.osci.helper;

import java.io.IOException;
import java.nio.CharBuffer;

public class ReadHTMLAsText implements Readable {
	private boolean inTag = false;
	private boolean inEntity = false;
	private Readable content;

	public ReadHTMLAsText(Readable content) {
		this.content = content;
	}

	public int read(CharBuffer cb) throws IOException {
		CharBuffer cbuf = CharBuffer.allocate(cb.remaining());
		int read = content.read(cbuf);
		if (read < 0)
			return read;
		int written = 0;
		for (int i = 0; i < read; i++) {
			char ch = cbuf.get(i);
			switch (ch) {
			case '>':
				if (inTag) {
					inTag = false;
					break;
				}
			case ';':
				if (inEntity) {
					inEntity = false;
					break;
				}
			case '<':
				inTag = true;
				break;
			case '&':
				inEntity = true;
				break;
			case '"':
			case ' ':
				inEntity = false;
			default:
				if (!inTag && !inEntity) {
					written++;
					cb.append(ch);
				}
			}
		}
		return written;
	}

}