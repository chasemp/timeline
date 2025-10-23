---
categories:
  - blog
tags:
  - Proxychains
  - Linux
---

Some commands do not natively support a proxy (RE: telnet).  Other times it is just easier to do a one-off instance rather than mess with environment settings.  A lot of people use this with Tor.

##### ProxyChains

Allows you to send traffic through a proxy without the command itself having foreknowledge.

`aptitude install proxychains`

##### Config file options

Pick one:

1. ./proxychains.conf
2. $(HOME)/.proxychains/proxychains.conf
3. /etc/proxychains.conf

##### /etc/proxychains.conf the global option

```
strict_chain
quiet_mode
tcp_read_time_out 15000
tcp_connect_time_out 8000
[ProxyList]
#replace this with your proxy
http    192.168.1.1 8080
```


##### telnet Before Proxychains (behind a proxy)

```
me@vm:~/pkg$ telnet google.com 80
Trying 2404:6800:4005:806::1006...
Trying 173.194.127.196...
Trying 173.194.127.193...
Trying 173.194.127.200...
Trying 173.194.127.201...
Trying 173.194.127.198...
Trying 173.194.127.199...
Trying 173.194.127.195...
Trying 173.194.127.192...
Trying 173.194.127.206...
Trying 173.194.127.194...
Trying 173.194.127.197...
telnet: Unable to connect to remote host: Network is unreachable
```

##### telnet after ProxyChains (behind a proxy)

```
me@vm:~/pkg$ proxychains telnet google.com 80
ProxyChains-3.1 (http://proxychains.sf.net)
Trying 2404:6800:4005:806::1006...
Trying 173.194.127.196...
Connected to google.com.
Escape character is '^]'.
```

In an environment with heavy automation and numerous service account users it is easy to end up in a situation where compromising one service becomes compromising an entire system.

#### Granting permission to a single command

> vi /etc/sudoers.d/makingpie

```myuser ALL = NOPASSWD: /usr/local/bin/makepie```

> myuser:#sudo makepie

`>>>>mmmmm...pie`

### What if my user needs to call out to a proxy but 'makepie' doesn't support it?

> sudo LD_PRELOAD=libproxychains.so.3 makepie

Sudo is extra granular and doesn't like this idea.

`sudo: sorry, you are not allowed to set the following environment variables: LD_PRELOAD`

### Fixing The heavy handed way

Don't reset user enviroments when using sudo

> visudo

Replace: “Defaults env_reset” with: “Defaults !env_reset”

### Fixing the Piecemeal way

> vi /etc/sudoers.d/ld_preload

```plaintext
#allow users to use proxychains env variable (using sudo)
Defaults env_keep += "LD_PRELOAD"
```

##### Excluding traffic from your proxy

In theory you can set the localnet option in your configuration file to exclude the local LAN by default from proxy  behavior.  This has not worked for me with proxychains under Debian 6.0

In case you are interested though: [localnet docs](https://github.com/haad/proxychains/issues/6#issuecomment-4041824)

##### Reference

[article one](http://benizi.com/postfix-proxychains) [article two](http://www.jameslovecomputers.com/how-to-install-configure-and-use-proxychains/) [official howto](http://proxychains.sourceforge.net/howto.html) [github](https://github.com/haad/proxychains)

