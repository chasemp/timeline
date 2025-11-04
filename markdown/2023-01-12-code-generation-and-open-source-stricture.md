---
title: "Code generation and open source stricture."
categories:
  - Blog
tags:
  - LinkedIn
date: 2023-01-12T00:00:00.000Z
---

I'm using a [Python library](https://github.com/onelogin/onelogin-python-sdk) that has a public repository and an [OSI](https://opensource.org/licenses) friendly license, but I cannot meaningfully contribute to the project to fix bugs I am encountering. This is fascinating and cumbersome. It's not unusual to find useful [FLOSS](https://en.wikipedia.org/w/index.php?title=Free_and_open-source_software&redirect=yes) code that is [abandonware](https://en.wikipedia.org/wiki/Abandonware), but it is a relatively new phenomenon for the code itself to be programmatically generated.

Enter [OpenAPI Generator](https://openapi-generator.tech/) (you are more likely to be familiar with [Swagger](https://swagger.io/blog/api-strategy/difference-between-swagger-and-openapi/))

Here's my understanding of the value proposition, you've written a server with a [RESTful](https://en.wikipedia.org/wiki/Representational_state_transfer) API interface. Historically, it's been common practice to stub out some examples in documentation using [curl](https://curl.se/). The mental leap to implementation of a client side library in a language of choice is fairly small, but it is not nonexistent. Folks come along and write idiomatic code to create a basic [SDK](https://en.wikipedia.org/wiki/Software_development_kit) in their preferred language (example: [Redis](https://redis.io/) client libraries for [Python](https://github.com/redis/redis-py), [Java](https://github.com/redis/jedis), and .[NET](https://github.com/redis/NRedisStack)). These language specific libraries can be of varying quality and completeness depending on the author, original needs, etc. Changes to how a server side endpoint behaves has to matriculate out to all the various client side libraries. It takes time, it's messy, and it's human maintenance.

Queue the next evolution, you've written a server with a RESTful API. You write a schema definition file that describes in declarative terms the semantics of the API. This [YAML](https://yaml.org/) file conforms to the [OpenAPI Specification (OAS)](https://spec.openapis.org/oas/v3.1.0). Now you can run one of 60+ generators to create consistent client side libraries to allow consumption of your API resources without a human writing novel code for this purpose. When you update your YAML schema you can similarly regenerate your client side code in every language. This is amazing.

[Example](https://raw.githubusercontent.com/openapitools/openapi-generator/master/modules/openapi-generator/src/test/resources/3_0/petstore.yaml) of an OpenAPI YAML schema:

openapi: 3.0
servers:
  - url: 'http://petstore.swagger.io/v2'
info:
  description: >-
    This is a sample server Petstore server. For this sample, you can use the api key
    \`special-key\` to test the authorization filters.
  version: 1.0.0
  title: OpenAPI Petstore
  license:
    name: Apache-2.0
    url: 'https://www.apache.org/licenses/LICENSE-2.0.html'
tags:
  - name: pet
    description: Everything about your Pets
  - name: store
    description: Access to Petstore orders
  - name: user
    description: Operations about user
paths:
  /pet:
    post:
      tags:
        - pet
      summary: Add a new pet to the store
      description: ''
      operationId: addPet
      responses:
        '200':
          description: successful operation
          content:
            application/xml:
              schema:
                $ref: '#/components/schemas/Pet'
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'0
...

Now imagine you write the YAML schema first and the code for the server side endpoint is generated (or more likely has the structure stubbed out), the client side libraries are generated in 60 languages, and the documentation portal to inform humans on the use case and particulars of consumption are consistent and published alongside both. This is even more amazing.

Even though this is a glimpse of the future (opinion) it is not a panacea. The end result server side behavior has to match in exactitude to the description in the schema used to generate downstream artifacts. If not, something will be broken. I am experiencing exactly this issue.

[Onelogin](https://www.onelogin.com/) is an identity and access management provider. I am attempting to use their [client library for Python](https://github.com/onelogin/onelogin-python-sdk) that is generated using the OpenAPI specification described above.

[![No alt text provided for this image](https://media.licdn.com/dms/image/v2/D5612AQFELQB8GKMFAA/article-inline_image-shrink_1500_2232/article-inline_image-shrink_1500_2232/0/1673551169109?e=1762387200&v=beta&t=pX8pHPYq0cvGcHO6iBEb61t2HqqmC2YdHsY3dQVwMLs)](https://github.com/onelogin/onelogin-python-sdk/)

OpenAPI README header

So, what is the bug?

I believe I'm seeing the same behavior in a few cases. Let's take the [getting started code](https://github.com/onelogin/onelogin-python-sdk#getting-started) for generating a token and combine it with the [get\_user](https://github.com/onelogin/onelogin-python-sdk/blob/master/docs/DefaultApi.md#get_user) or the [list\_users(app\_id)](https://github.com/onelogin/onelogin-python-sdk/blob/master/docs/DefaultApi.md#list_users) example.

...
user = api\_instance.get\_user(user\_id\_int)

users = api\_instance.list\_users(app\_id\_int)
...

These can result in some version of the following:

onelogin.exceptions.ApiTypeError: Invalid type for variable 'preferred\_locale\_code'. Required value type is str and passed type was NoneType at \['received\_data'\]\['preferred\_locale\_code'\]

onelogin.exceptions.ApiTypeError: Invalid type for variable 'locked\_until'. Required value type is str and passed type was NoneType at \['received\_data'\]\['locked\_until'\]

onelogin.exceptions.ApiTypeError: Invalid type for variable 'trusted\_idp\_id'. Required value type is int and passed type was NoneType at \['received\_data'\]\['trusted\_idp\_id'\]

This is a classic mismatch in expected behavior between a client and server.

What seem to be happening is the client side code is including the full list of possible params in the query, but in cases where a value is not specified explicitly in the code [None](https://www.w3schools.com/python/ref_keyword_none.asp) is used as the value. The client is assuming with None being a [falsey](https://www.pythonmorsels.com/truthiness/) value it will be non-impacting. The server looks at the full request and recognizes parameters that are NoneType value but have another valid type required (int, str). It returns a status interpreted as an exception (error) by the client code. The server is assuming that any specified value is meaningful and seeking to validate adherence of expected object type.

I can validate the server side is capable of fulfilling the request by using [python-requests](https://pypi.org/project/requests/) to make the same inquiries (including using the same generated token):

import request

class BearerAuth(requests.auth.AuthBase):
    def \_\_init\_\_(self, token):
        self.token = token
    def \_\_call\_\_(self, r):
        r.headers\["authorization"\] = "Bearer " + self.token
        return rs

# Get users for APP <MYAPP> (int)
response = requests.get('https://api.us.onelogin.com/api/2/apps/<MYAPP>/users', auth=BearerAuth(token\['access\_token'\]))

print(response.status\_code)

# Get details for user <MYUSER> (int)
user\_details = requests.get('https://api.us.onelogin.com/api/2/users/<MYUSER>', auth=BearerAuth(token\['access\_token'\]))

print(user\_details.status\_code)

Both queries return valid content and 200 status codes.

At this point we have:

-   Server side code we cannot see but which we can demonstrate functions using primitive requests
-   Client side code that is generated by an OpenAPI schema licensed with [MIT](https://github.com/onelogin/onelogin-python-sdk/blob/master/LICENSE)
-   Client side behavior that is errant

Normally I would attempt to diagnose and search for an existing known issue to discuss, and, if possible, open a [pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/merging-a-pull-request) to address. In this case, the code itself is generated. Fixing it in place is not very useful. Any fix will be overwritten with the next generated version. The only real fix is addressing the OpenAPI schema document or the server side validation that is conflicting.

While I have the code and rights to it the OpenAPI schema is not included.

**This project is open source but still a walled garden.**

Interestingly, the project itself has been updated relatively recently.

![No alt text provided for this image](https://media.licdn.com/dms/image/v2/D5612AQGAy5aAx3MukQ/article-inline_image-shrink_1000_1488/article-inline_image-shrink_1000_1488/0/1673552291803?e=1762387200&v=beta&t=796NJe7cVPvMhThohAFIXTslYLUglia5GmsARmqO9UU)

Updates happening for OneLogin Python SDK

But issues seem to be stale with the last closed issue approximately a year ago.

![No alt text provided for this image](https://media.licdn.com/dms/image/v2/D5612AQFlikv-HDaXlg/article-inline_image-shrink_1500_2232/article-inline_image-shrink_1500_2232/0/1673552399989?e=1762387200&v=beta&t=9JSiuFY2zqTyORGb65zssfuhoSpD1e2Xs7UW21m1obY)

Activity in issues for OneLogin Python SDK

The last comment on an open issue is:

[![No alt text provided for this image](https://media.licdn.com/dms/image/v2/D5612AQEtQIkEAP4Wrw/article-inline_image-shrink_1000_1488/article-inline_image-shrink_1000_1488/0/1673552610769?e=1762387200&v=beta&t=Bur1sfQT4Fhw58Rk04K-Gu6PvVzRQjyFx5IN6OrW1yM)](https://github.com/onelogin/onelogin-python-sdk/issues/70)

OneLogin Python SDK issue #70 comment

I'm not writing this to take a shot at OneLogin. As the landscape of software development changes, there are interesting circumstances where the letter of the law and the intent of what it means to be open source may diverge. As humans create these technologies that allows us to be further removed from certain outcomes (a good thing), it seems we need to be careful about enabling the same social outcomes (a great thing) to preserve a collaborative future.
