---
title: Basic Python JSON REST API Client Example
excerpt_separator: "<!--more-->"
categories:
  - Blog
tags:
  - standard
---

JSON REST API's are increasingly common and useful.

A basic client example for using something like [nagios api](https://github.com/zorkian/nagios-api)


```Python
import sys
import os
import urllib
import json
import urllib2

class JSONRestClient(object):
    def __init__(self, remote):
        self.url = remote

    def _get(self, trail):
        getme = self.url + trail
        req = urllib2.Request(getme)
        return json.loads(urllib2.urlopen(req, timeout=120).read())

    def _post(self, trail, **kwargs):
        data = json.dumps(kwargs)
        req = urllib2.Request(self.url + trail, data, {'Content-Type': 'application/json'})
        f = urllib2.urlopen(req)
        response = f.read()
        f.close()
        return json.loads(response)

    def state(self):
        return self._get('state')
```


# Getting state info from nagios api

r = JSONRestClient('http://remotehost:8080')
print r.state()
