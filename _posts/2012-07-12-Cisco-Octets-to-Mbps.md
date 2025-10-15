---
title: Convert Cisco Octets to Mbps
excerpt_separator: "<!--more-->"
categories:
  - Blog
tags:
  - Cisco
---

Depending on the type of counter you want to track you can use one of the two

# SNMP following OIDs

'64' bit counter => oid => '.1.3.6.1.2.1.31.1.1.1'
'32' bit counter => oid => '.1.3.6.1.2.1.2.2'


# Example Readings


Sampe 1 Transferred octets; `28879519327687`

Sampe 2 Transferred octets (10 seconds later) `28879428276119`

That's 91051568 octets in 10 seconds.

Divide by 10 for per second value: 9105156

Multiply by 8 for bits: 72841248

Divide by 1048576 for Mbps: 69

```python
>>> 28879519327687 - 28879428276119
91051568
>>> 91051568 / 10 
9105156
>>> 9105156 * 8
72841248
>>> 72841248 / 1048576
69
```

# Reference

[How To Calculate Bandwidth Utilization Using SNMP](https://www.cisco.com/c/en/us/support/docs/ip/simple-network-management-protocol-snmp/8141-calculate-bandwidth-snmp.html)
[Consider SNMP Counters: Frequently Asked Questions](https://www.cisco.com/c/en/us/support/docs/ip/simple-network-management-protocol-snmp/26007-faq-snmpcounter.html)
