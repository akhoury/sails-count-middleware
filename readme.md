
# sails-count-middleware
While paginating, find the total count by criteria, via an added `X-Total-Count` header to all blueprints `find` requests

![screen shot 2017-12-21 at 3 31 10 am](https://user-images.githubusercontent.com/1398375/34236288-7bd4f658-e5ff-11e7-87b7-53be1433f272.png)


# Sails version support
It only supports __Sails 1.x__

# Basic Usage

```
npm install sails-count-middleware --save
```

Then in your `config/http.js`

```javascript
middleware: {
// ....

    // require it with whatever name you want
    addXTotalCount: require('sails-count-middleware'),

    // then add it to the order[] array
    order: [
      // ...
      'addXTotalCount',
      // ...
     ]
```

# Advanced Usage
You can create a policy, say we called it `api/policies/addCount.js`
```javascript
 module.exports = require('sails-count-middleware')
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
X-Total-Count: 30   <------------------------------- Find the header here with the total counts
Content-Length: 2942
ETag: W/"b7e-riSmb6LicvHvEh5sQ+oJ2rzxbb8"
Date: Wed, 20 Dec 2017 22:22:06 GMT
Connection: keep-alive
[
  {..}  // Only 1 result though, since limit=1
]
```

# Extra Options

There are 2 options that you change, just call the `generate()` function instead
```javascript
    addXTotalCount: require('sails-count-middleware').generate({
        blueprintActions: ['find'], // default
        headerKey: 'X-Total-Count', // default
        silentError: false // default
    }),
```
