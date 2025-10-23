---
title: "deviantART Registrar Name.com Compromised"
excerpt_separator: "<!--more-->"
categories:
  - Blog
tags:
  - dA
---

So name.com was hacked and deviantart.com was one of the credentials dumped from their DB.

How do I know? [Name.com Tells Customers To Change Password Due To Breach](https://news.ycombinator.com/item?id=5676311)

![Name.com letter to customers on comprompise](/assets/images/post/namecomhack.png)

What's interesting is that we know our password and we know their hash of it now.

Even though the site where it was posted has been taken down at this time.

[![coworker post](/assets/images/post/namecomhack-hn.png)](https://news.ycombinator.com/item?id=5677739)

Now we know for esure they were/are(?) storing our password using [`MySQL PASSWORD()`](https://dev.mysql.com/doc/refman/4.1/en/encryption-functions.html#function_password)

No actual damage was done for us as this point. 

Damn, though, that sucks all around.

---
