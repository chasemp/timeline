---
title: Settings a modular MOTD in Debian
categories:
  - Blog
tags:
  - Debian
---

Granular control over Debian MOTDMOTD should be used for more than welcome messages

# What version am I on?

```
cat /etc/issue

Debian GNU/Linux 6.0 \n \l
```

# PAM has the ability to build a motd on demand

> mkdir /etc/update-motd.d/
> nano /etc/update-motd.d/test

```bash
#!/bin/bash
echo 'test'
```

> logout
> login

```
test
me@vm:~$ 
```

This way different teams can update the motd, and they can be ordered like 10test, 20test, 30test.
