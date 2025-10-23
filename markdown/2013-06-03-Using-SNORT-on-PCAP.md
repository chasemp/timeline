---
title: "Using Snort on a PCAP file"
categories:
  - Blog
tags:
  - Security
  - Snort
  - PCAP
---

Grabbing tcpdump output during a crisis can be hard to remember. Ideally, snort is running as as service inline or at least continually. Sometimes things happen outside of Snort's purview or you are testing what Snort picks ups.


### Install tools

> aptitude install snort snort-rules

### Capture your traffic

> sudo tcpdump -w test

### Generate snort report

> snort -r test -c /etc/snort/snort.conf -l .

```plaintext
[**] [1:485:4] ICMP Destination Unreachable Communication Administratively Prohibited [**]
[Classification: Misc activity] [Priority: 3] 
05/19-01:23:00.201765 74.76.148.114 -> <my_ext_ip>
ICMP TTL:241 TOS:0x0 ID:32480 IpLen:20 DgmLen:56
Type:3  Code:13  DESTINATION UNREACHABLE: ADMINISTRATIVELY PROHIBITED,
PACKET FILTERED
** ORIGINAL DATAGRAM DUMP:
<my_ext_ip>:80 -> 74.76.148.114:25657
TCP TTL:47 TOS:0x0 ID:22893 IpLen:20 DgmLen:44
Seq: 0x654B5258
** END OF DUMP
```

You can edit your `snort.conf` for what kinds of signatures to look for. ICMP can be a good indicator of shenanigans but is also very noisy.
