---
title: Read JSON in Bash with Python
categories:
  - Blog
tags:
  - JSON
  - Bash
  - Python
---

Getting JSON from a flat file in a shell script

JSON is become a defacto serialization standard. Getting at the info in Bash is nice.

`cat /var/myfile`

```json
{'this': 'you'}
```

Create a script that can access this data

```bash
#!/bin/bash
set -e
FILE='/var/file'
if [[ ! -a $FILE ]]; then
    exit 0
fi
dict_value=`python -c 'import json, os; d=json.loads(open("/var/file").read()); print d["this"]'`
echo $dict_value
```

Run it as a command `./script.sh`

> you
