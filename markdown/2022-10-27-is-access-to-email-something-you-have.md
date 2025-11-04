---
title: "Is access to email \"something you have\"​?"
categories:
  - Blog
tags:
  - LinkedIn
date: 2022-10-27T00:00:00.000Z
---

Is it MFA when a one-time password is sent via an email you have no administrative influence over?

I'm looking at [Okta Email Authentication MFA](https://help.okta.com/en-us/Content/Topics/Security/mfa/email.htm#:~:text=The%20Email%20Authentication%20factor%20allows,%2Dtime%20password%20\(OTP\).). In this thought exercise, access to the 3rd party email system is password based as far as I'll be able to discern. Requiring a one-time pin sent to that email seems more defensible as multiple layers of a single factor (something you know), rather than a second layer (something you have or something you are).

Especially interesting is Okta has equated SMS/Voice/Email as [equivalents](https://help.okta.com/en-us/Content/Topics/Security/mfa/about-mfa.htm), and describes MFA without mention of representation across multiple factors as:

> an added layer of security used to verify an end user's identity when they sign in to an application.

![No alt text provided for this image](https://media.licdn.com/dms/image/v2/D5612AQH5z19JgTuLFg/article-inline_image-shrink_1500_2232/article-inline_image-shrink_1500_2232/0/1666876174954?e=1762387200&v=beta&t=78D0blXQeWM4gqdqPNek4-KMcMSjubf85UYxEzAKG40)

SMS and Voice as "something you have" is arguably reasonable, but I can see where VOIP may invalidate that assumption.

Can access to an email be "something you have"?
