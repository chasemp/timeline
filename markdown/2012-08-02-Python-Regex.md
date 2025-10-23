---
title: Basic Python Regex Extraction
categories:
  - Blog
tags:
  - Python
  - Regex
---

When dealing with totally unstructured data sometimes it is necessary to go full regex.

Extracting values from a string using regex

``` python
import re
string = 'working on X000 for Y1111'

tag_matches = {'x': 'X\d{1,6}',
               'y': 'Y\d{1,6}'}

for k, v in tag_matches.iteritems():
    title_search = re.search(v, string, re.IGNORECASE)
    if title_search:
        print k, title_search.group(0)
```


### Console Output

`y Y1111`

`x X000`

One thing I see people do a lot is use regex to replace values in a string. In python this is as easy as.

```python
a = 'one two three'
print a.replace('one', 'turtles')
turles two three
```
