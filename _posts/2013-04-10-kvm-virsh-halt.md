---
title: "Halting a KVM guest with virsh"
excerpt_separator: "<!--more-->"
categories:
  - Blog
tags:
  - KVM
  - Linux
  - virsh
---


KVM is great but I'm making a note so I remember because this command gives me pause every time.  When a new VM has no OS or doesn't make it past the bootloader it appears to be non-responsive for the graceful shutdown command.

### Sometimes `shutdown` in the virtual shell for KVM fails.


```plaintext
virsh # shutdown myvm
Domain myvm is being shutdown
```

#### But...


```
114 myvm            running
```

In order to shutdown this host I use the 'destroy' command. Destroy does not remove any files or otherwise permanently change the host data. Which for me, is unintuitive. It does remove it from the list of hosts shown with the 'list' command. Destroy is like pulling the plug.

> virsh #destroy myvm

The command that does what I would expect destroy to do is: 'undefine'.
