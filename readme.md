
# sails-count-middleware
While paginating, find the total count by criteria, via an added `X-Total-Count` header to all blueprints `find` requests. Or even an `X-Pagination-JSON` header, or both.

![screen shot 2017-12-21 at 7 15 37 pm](https://user-images.githubusercontent.com/1398375/34266891-817d85fa-e683-11e7-8067-5a80269dd8e5.png)

# Sails version support
It only supports __Sails 1.x+__

# Basic Usage

```
npm install sails-count-middleware --save
```

Then in your `config/http.js`

```javascript
middleware: {
// ....

    // require it with whatever name you want
    addCount: require('sails-count-middleware'),

    // then add it to the order[] array
    order: [
      // ...
      'addCount',
      // ...
     ]
```

# Advanced Usage
You can create a policy, say we called it `api/policies/addCount.js`
```javascript
 module.exports = require('sails-count-middleware').generate({
    // enable both for demo
    totalCountHeader: true
    paginationJsonHeader: true
 });
```
Then in `config/policies.js` you can specify which `find` call will get augmented with the count header.
```javascript
UserController: {
    'find': ['isLoggedIn', 'addCount'],
}
```

# Result
Then make a `GET` call to a `find` blueprint action, with any criteria, even with limit
#### Request
```bash
curl -sSL -D - localhost:1337/user?name=jane&limit=1
```
#### Response
```
HTTP/1.1 200 OK
X-Powered-By: Sails <sailsjs.com>
Content-Type: application/json; charset=utf-8
X-Total-Count: 4                          <---------
X-Pagination-JSON: {"count":4,"limit":1}  <---------
Content-Length: 614
ETag: W/"266-K6bjdxLpUMTlwLOyDQFTFJYi/pQ"
Date: Thu, 21 Dec 2017 17:18:22 GMT
Connection: keep-alive

[
  {..}  // Only 1 result though, since limit=1
]
```

# Client side node
You can use this header however you like, but I recommend the following if you do not want to change the `response.body` that comes back from the __sails__ server.

Just augment that array with a [__non-enumerable__](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty#Enumerable_attribute) `__pagination__` property, this way
when you iterate over or enumerate that array, that property won't be part of that iteration ([*in most cases*](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Enumerability_and_ownership_of_properties)), but you can still access it `response.body.__pagination__.count`

```javascript
    // .... somewhere in your app, on ajax response...
    Object.defineProperty(response.body, '__pagination__', {
        enumerable: false,
        // you must set paginationJsonHeader=true in the options if you want the x-pagination-json header
        value: JSON.parse(response.headers['x-pagination-json'] || 'null')
  });
  // then when you iterate nornmally
  response.body.forEach(() => {
      // ...
  })
  // but you can also use the pagination stuff
  let  {count, limit, skip, sort} = response.body.__pagination__;
  console.log(`count: ${count}, limit: ${limit}, skip: ${skip}, sort: ${sort}`)
```

# Extra Options

There are options that you can change, just call the `generate()` function
```javascript
    addXTotalCount: require('sails-count-middleware').generate({
        // if you want to add an action i.e. 'user/search' or whatever
        actions: ['find', 'populate'], // default or ['find', 'populate', 'user/search']

        // you can rename the headers by passing a string
        // or disable them by setting them to false

        // default option value is true
        // default header name is 'X-Total-Count'
        totalCountHeader:  'X-Count', // this will enable and rename the header
        totalCountHeader: false, // this disable this header
        totalCountHeader: true, // this enable it with the default name

        // default option value is false
        // default header name is 'X-Pagination-JSON'
        paginationJsonHeader: 'X-PJSON', // this will enable and rename the header
        paginationJsonHeader: false, // this disable this header
        paginationJsonHeader: true, // this enable it with the default name

        // if the .count() calls fails, to throw an error or not
        silentError: false // default
    }),
```
