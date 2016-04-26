// import invariant from 'invariant';

/* ===============================================================================
New API class (in development)
Scope:
  + simplify common API requests, error handling and data parsing without losing flexibility
  + throttle incoming requests for the same resource (return the same request or cached response)
Todo:
 - throttle
 - global interceptor (request / response)
=============================================================================== */
// Function.prototype.bindAppend = function(context) {
//     var func = this;
//     var args = [].slice.call(arguments).slice(1);
//     return function() {
//         return func.apply(context, [].slice.call(arguments).concat(args));
//     }
// }
import _partialRight from 'lodash/partialRight';

export class APICreator {
  constructor({
    baseUrl,
    headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Origin': '*',
    },
    requestInterceptor = (args) => args,
    responseInterceptor = (resp) => resp,
    responseHandlerGet = (resp) => resp,
    responseHandlerPost = (resp) => resp,
    responseHandlerDelete = (resp) => resp,
    responseHandlerPut = (resp) => resp,
  } = {}) {
    this.defaults = {
      baseUrl: baseUrl,
      headers: headers,
      responseInterceptor: responseInterceptor,
      responseHandlerGet: responseHandlerGet,
      responseHandlerPost: responseHandlerPost,
      responseHandlerDelete: responseHandlerDelete,
      responseHandlerPut: responseHandlerPut,
    };

    this.instances = [];
  }

  create(args, configFn) {
    const options = {
      ...this.defaults,
      ...args,
    };
    return new API(options, configFn);
  }
}

export class API {
  constructor({
    url,
    baseUrl,
    uri,
    headers,
    requestInterceptor,
    responseInterceptor,
    responseHandlerGet,
    responseHandlerPost,
    responseHandlerDelete,
    responseHandlerPut,
  } = {}, configFn) {
    const {URL, PARAMS_SCHEMA} = _parseUrl(url || baseUrl + uri);

    this.URL = URL;
    this.PARAMS_SCHEMA = PARAMS_SCHEMA;
    this.HEADERS = headers;
    this.REQUEST_INTERCEPTOR = requestInterceptor;
    this.RESP_INTERCEPTOR = responseInterceptor;
    this.RESP_HANDLER_GET = responseHandlerGet;
    this.RESP_HANDLER_POST = responseHandlerPost;
    this.RESP_HANDLER_DELETE = responseHandlerDelete;
    this.RESP_HANDLER_PUT = responseHandlerPut;

    this.configFn = configFn;

    // todo: more validation
    // invariant(this.URL, 'API URL should not be undefined');
  }

  _getParamsAndQueryString(params, query) {
    return {
      paramsStr: params ? `/${objectToParamsString(params, this.PARAMS_SCHEMA)}` : '',
      queryStr: query ? `?${objectToQueryString(query)}` : '',
    };
  }

  get({
    url = this.URL,
    headers = this.HEADERS,
    requestInterceptor = this.REQUEST_INTERCEPTOR,
    responseInterceptor = this.RESP_INTERCEPTOR,
    responseHandler = this.RESP_HANDLER_GET,
    params,
    query,
  } = {}) {
    const transform = this.configFn(arguments);
    return transform.headers;
    const {paramsStr, queryStr} = this._getParamsAndQueryString(params, query);
    const respInterceptor = _partialRight(responseInterceptor, {url, headers: transform.headers, params, query});
    const respHandler = _partialRight(responseHandler, {url, headers: transform.headers, params, query});
    return fetch(`${url}${paramsStr}${queryStr}`, {
      method: 'GET',
      headers: transform.headers,
    })
    .then(checkStatus) // low level
    .then(respInterceptor)
    .then(respHandler)
    ;
  }

  post({
    url = this.URL,
    headers = this.HEADERS,
    body,
    query,
    params,
    responseInterceptor = this.RESP_INTERCEPTOR,
    responseHandler = this.RESP_HANDLER_POST,
  } = {}) {
    const {paramsStr, queryStr} = this._getParamsAndQueryString(params, query);
    const respInterceptor = _partialRight(responseInterceptor, {url, headers, params, query});
    const respHandler = _partialRight(responseHandler, {url, headers, params, query});
    return fetch(`${url}${paramsStr}${queryStr}`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    })
    .then(checkStatus)
    .then(respInterceptor)
    .then(respHandler)
    ;
  }

  put({
    url = this.URL,
    headers = this.HEADERS,
    body,
    query,
    params,
    responseInterceptor = this.RESP_INTERCEPTOR,
    responseHandler = this.RESP_HANDLER_PUT,
  } = {}) {
    const {paramsStr, queryStr} = this._getParamsAndQueryString(params, query);
    const respInterceptor = _partialRight(responseInterceptor, {url, headers, params, query});
    const respHandler = _partialRight(responseHandler, {url, headers, params, query});
    return fetch(`${url}${paramsStr}${queryStr}`, {
      method: 'PUT',
      headers: headers,
      body: JSON.stringify(body),
    })
    .then(checkStatus)
    .then(respInterceptor)
    .then(respHandler)
    ;
  }

  delete({
    url = this.URL,
    headers = this.HEADERS,
    query,
    params,
    responseInterceptor = this.RESP_INTERCEPTOR,
    responseHandler = this.RESP_HANDLER_DELETE,
  } = {}) {
    const {paramsStr, queryStr} = this._getParamsAndQueryString(params, query);
    const respInterceptor = _partialRight(responseInterceptor, {url, headers, params, query});
    const respHandler = _partialRight(responseHandler, {url, headers, params, query});
    return fetch(`${url}${paramsStr}${queryStr}`, {
      method: 'DELETE',
      headers: headers,
    })
    .then(checkStatus)
    .then(respInterceptor)
    .then(respHandler)
    ;
  }
}

/* ===============================================================================
HELPER FUNCTIONS
=============================================================================== */
export function checkStatus(resp) {
  // TODO: if debugRow: true -> log
  // console.log('checkStatus', resp);
  if(resp.ok) {
    return _parseJSON(resp);
  } else {
    return _parseJSON(resp).then((err) => {
      return Promise.reject({error: err, resp: resp});
    });
  }
}

function _parseJSON(response) {
  return response.text().then(function(text) {
    return text ? JSON.parse(text) : {};
  });
}

export function objectToQueryString(obj) {
  let parts = [];
  for(var i in obj) {
    if(obj.hasOwnProperty(i)) {
      parts.push(encodeURIComponent(i) + '=' + encodeURIComponent(obj[i]));
    }
  }
  return parts.join('&');
}

export function objectToParamsString(obj, schema) {
  return schema.map((schemaObj) => {
    return Object.keys(schemaObj)
      .map((prop, i) => {
        if(i === 0) {
          if(obj[schemaObj[prop]]) {
            return obj[schemaObj[prop]];
          }
        } else {
          return schemaObj[prop];
        }
      })
      .join('');
  });
}

function _parseUrl(url) {
  const result = {
    URL: null,
    PARAMS_SCHEMA: {},
  };
  // e.g. 'offers/:id/extra/test/:mId'
  const uriArray = url.split('/:');
  // e.g. ['offers', 'id/extra/test', 'mId']

  if(uriArray.length === 1) {
    result.URL = url;
  } else {
    result.URL = uriArray[0];
    result.PARAMS_SCHEMA = uriArray
      .filter((uri, i) => i !== 0)
      .map((uri) => {
        // e.g. uri = 'id/extra/test'
        // e.g. ['id', 'extra', 'test'];
        const subUriArray = uri.split('/');
        // e.g '/extra/test'
        const subUri = subUriArray
          .filter((uri, i) => i !== 0)
          .map((uri) => {
            // e.g. uri = 'extra'
            return `/${uri}`;
          })
          .reduce((a, b) => a+b, '');

        return {
          param: subUriArray[0], // 'id'
          uri: subUri, // '/extra/test'
        };
      });
  }

  return result;
}
