---
title: "Bash Troubleshooting Boilerplate"
categories:
  - Blog
tags:
  - Bash
  - Linux
---

I have a bash script that is being called multiple times instead of once.  I need to track down where it is being called from.

Boiler plate that is nice for troubleshooting

```bash
function trouble {
    echo "--------------------"
    date
    echo "whoami: $(whoami)"
    echo "userid: $(id -u)"
    echo "My pid is $$"
    echo "working dir: $(pwd)"
    echo "Called as: $0"
    echo "Arguments: $@"
    echo "user_pstree_begin"
    pstree $(whoami) -l
    echo "user_pstree_end"
    echo "pid_pstree_begin"
    pstree -np $$
    echo "pid_pstree_end"
    echo "--------------------"
}

set -x
epochtime=$(date +%s)
file="/tmp/debug-$epochtime.log"
logger "Creating: $file"
trouble > $file
```

### Looks like

```plaintext

@:~# cat /tmp/debug-1369940847.log 
--------------------
Thu May 30 12:07:27 PDT 2013
whoami: 
userid: 0
My pid is 19891
ps_tree_begin
test.sh(19891)---pstree(19896)
ps_tree_end
working dir: /home/
Called as: ./test.sh
Arguments: 
--------------------
@:~# 
```

Syslog: `<host> <me>: Creating: /tmp/debug-1369940847.log`

This is especially helpful for cron jobs or background scripts.
