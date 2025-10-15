---
title: "Beginning IOS BGP Configuration"
excerpt_separator: "<!--more-->"
categories:
  - Blog
tags:
  - Cisco
  - BGP
---

This configuration is Cisco based but JunOS isn't too far of a stretch in my experience.

First off: you need your ASN. You need your address block. Your address block must be at least /24.

A general rule of thumb for awhile has been 2 GB of memory per full BGP table. Sometimes more is required and sometimes significantly less. The table is still growing and 2 GB is my personal baseline required.

### Aliases: you will learn to like them

```plaintext
alias exec sumbgp6 show bgp ipv6 unicast summary
alias exec sumbgp show ip bgp summary
alias exec sbgp show run | section bgp
```

#### Basic BGP stanza

```plaintext
config t
ip bgp-community new-format
!insert your ASN
router bgp 
 !your router id should be set explicitly
 bgp router-id 
 no bgp fast-external-fallover
 !notify syslog of bgp changes
 bgp log-neighbor-changes
 bgp graceful-restart restart-time 120
 bgp graceful-restart stalepath-time 360
 bgp graceful-restart
 neighbor  remote-as 
 neighbor  description 
 neighbor  version 4
 neighbor  activate
```

### Our First BGP Summary

```plaintext
RTRME(config-router)####do sumbgp
BGP router identifier , local AS number 
BGP table version is 464187, main routing table version 464187
446501 network entries using 66082148 bytes of memory
446501 path entries using 28576064 bytes of memory
73561/73558 BGP path/bestpath attribute entries using 9415808 bytes of memory
69308 BGP AS-PATH entries using 2555070 bytes of memory
68 BGP community entries using 1904 bytes of memory
0 BGP route-map cache entries using 0 bytes of memory
0 BGP filter-list cache entries using 0 bytes of memory
BGP using 106630994 total bytes of memory
BGP activity 460823/1679 prefixes, 461759/2621 paths, scan interval 60 secs

Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
  4         2914   79993      80   464166    0    0 01:11:19   446501
```

### BGP: Why you no work?


```
RTRME(config-router)####do sh ip bgp neighbor  advertised-routes

Total number of prefixes 0
```

### To Advertise it: We need to know where it is

```
RTRME(config)####sh ip bgp 
% Network not in table

RTRME(config)####ip route   null 0 200

RTRME(config)####do sh ip bgp 
BGP routing table entry for , version 464822
Paths: (1 available, best ####1, table default)
Multipath: eBGP
  Not advertised to any peer
  Refresh Epoch 1
  Local
    0.0.0.0 from 0.0.0.0 ()
      Origin IGP, metric 0, localpref 100, weight 32768, valid, sourced, local, best
RTRME(config)####
```


### Resetting BGP

This is very aggressive and will reset your peering status. Lookup soft in/out if you are alreadying using BGP in production.

> RTRME####clear ip bgp *

### Things we know about our neighbor

What is their status?

> sh ip bgp neighbors

What are we advertising to them?

```plaintext

RTRME####sh ip bgp neighbors  advertised-routes 
BGP table version is 447010, local router ID is 
Status codes: s suppressed, d damped, h history, * valid, > best, i - internal,
              r RIB-failure, S Stale, m multipath, b backup-path, x best-external, f RT-Filter, a additional-path
Origin codes: i - IGP, e - EGP, ? - incomplete

   Network          Next Hop            Metric LocPrf Weight Path
*>      0.0.0.0                  0         32768 i

Total number of prefixes 1 
```


### References

[Troubleshoot Border Gateway Protocol Routes that Do Not Advertise](https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/19345-bgp-noad.html)
[Zayo Looking Glass](https://lg.zayo.com/lg.cgi)
[Configure and Verify the BGP Conditional Advertisement Feature](https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/16137-cond-adv.html)
