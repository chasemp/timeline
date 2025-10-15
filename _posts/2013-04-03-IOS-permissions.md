---
title: "IOS Granular Permissions"
excerpt_separator: "<!--more-->"
categories:
  - Blog
tags:
  - IOS
  - Cisco
  - IAM
---


If you have tiered levels of administrators, or you want to create an account for automation purposes best practice is to define a custom security level in IOS.

<!--more-->

Levels 1 and 15 are defined by default.

### Allowing lower levels to see your configuration: IOS

```plaintext
conf t
username backup privilege 3 secret <SECRET>
privilege exec level 3 show startup-config
privilege exec level 3 show
wr mem
```

### Allowing lower levels to see your configuration: FreeRADIUS:

> /etc/freeradius/users

```plaintext
backup
    Service-Type = NAS-Prompt-User,
    cisco-avpair = "shell:priv-lvl=3",
    Auth-Type = System,
```

### Defining the next user tier for NAT information: IOS

```plaintext
conf t
username natinfo privilege 4 secret <SECRET>
privilege exec level 4 show nat64 statistics
wr mem
```

### Defining the next user tier for NAT information: FreeRADIUS

```plaintext
natinfo
    Service-Type = NAS-Prompt-User,
    cisco-avpair = "shell:priv-lvl=4",
    Auth-Type = System,
```

### Notes

* Permissions stack up which means a user at Level 4 can also issue 'show startup-configuration'
* `show running-config` command does not work in this way for the IOS devices I have tried.


