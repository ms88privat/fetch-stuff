import _partialRight from 'lodash.partialright';

export const APIManager = function({
    baseUrl,
    headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      'Origin': '*',
    },
    requestInterceptor = (args) => args,
    responseInterceptor = (resp) => resp,
  } = {}) {
  if(APIManager.prototype._singletonInstance) {
    return APIManager.prototype._singletonInstance;
  }
  APIManager.prototype._singletonInstance = this;

  this._config = {
    baseUrl,
    headers,
    requestInterceptor,
    responseInterceptor,
  };

  /* ===============================================================================
  keep track of every instance to update them later all at once
  =============================================================================== */
  const instances = [];

  this.updateConfig = (newConfig) => {
    instances.forEach((instance) => instance.updateConfig(newConfig));
  };

  this.extendHeader = (headers) => {
    instances.forEach((instance) => instance.extendHeader(headers));
  };

  this.removeHeaderProperty = (prop) => {
    instances.forEach((instance) => instance.removeHeaderProperty(prop));
  };

  class API {

    constructor({
      url,
      baseUrl,
      uri,
      headers,
      requestInterceptor,
      responseInterceptor,
      responseHandlerGet = (resp) => resp,
      responseHandlerPost = (resp) => resp,
      responseHandlerDelete = (resp) => resp,
      responseHandlerPut = (resp) => resp,
    } = {}) {
      const p = _parseUrl(url || baseUrl + uri);

      this._config = {
        url: p.url,
        paramsSchema: p.paramsSchema,
        baseUrl,
        uri,
        headers,
        requestInterceptor,
        responseInterceptor,
        responseHandlerGet,
        responseHandlerPost,
        responseHandlerDelete,
        responseHandlerPut,
      };

      /* ===============================================================================
      keep reference to this instance for updating it later globaly
      =============================================================================== */
      instances.push(this);
    }

    // TODO: redo _parseUrl
    updateConfig(newConfig) {
      this._config = {
        ...this._config,
        ...newConfig,
      };
    }

    extendHeader(headers) {
      this._config.headers = {
        ...this._config.headers,
        ...headers,
      };
    }

    removeHeaderProperty(prop) {
      if(this._config.headers && this._config.headers[prop]) {
        delete this._config.headers[prop];
      }
    }

    _getParamsAndQueryString(params, query) {
      return {
        paramsStr: params ? `/${objectToParamsString(params, this._config.paramsSchema)}` : '',
        queryStr: query ? `?${objectToQueryString(query)}` : '',
      };
    }

    get({
      url = this._config.url,
      headers = this._config.headers,
      requestInterceptor = this._config.requestInterceptor,
      responseInterceptor = this._config.responseInterceptor,
      responseHandler = this._config.responseHandlerGet,
      params,
      query,
    } = {}) {
      const {paramsStr, queryStr} = this._getParamsAndQueryString(params, query);
      const respInterceptor = _partialRight(responseInterceptor, {url, headers, params, query});
      const respHandler = _partialRight(responseHandler, {url, headers, params, query});
      return fetch(`${url}${paramsStr}${queryStr}`, {
        method: 'GET',
        headers: headers,
      })
      .then(checkStatus) // low level
      .then(respInterceptor)
      .then(respHandler)
      ;
    }
    post({
      url = this._config.url,
      headers = this._config.headers,
      requestInterceptor = this._config.requestInterceptor,
      responseInterceptor = this._config.responseInterceptor,
      responseHandler = this._config.responseHandlerPost,
      body,
      query,
      params,
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
      url = this._config.url,
      headers = this._config.headers,
      requestInterceptor = this._config.requestInterceptor,
      responseInterceptor = this._config.responseInterceptor,
      responseHandler = this._config.responseHandlerPut,
      body,
      query,
      params,
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
      url = this._config.url,
      headers = this._config.headers,
      requestInterceptor = this._config.requestInterceptor,
      responseInterceptor = this._config.responseInterceptor,
      responseHandler = this._config.responseHandlerDelete,
      query,
      params,
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
  create API Instance
  =============================================================================== */
  this.create = (config) => {
    return new API({
      ...this._config,
      ...config,
    });
  };
};

/* ===============================================================================
HELPER FUNCTIONS
=============================================================================== */
export function checkStatus(resp) {
  // TODO: if debugRow: true -> log
  // console.log('checkStatus', resp);
  if(resp.ok) {
    return _parseJSON(resp).catch(catchError);
  } else {
    return _parseJSON(resp).then((err) => {
      // console.log('_parseJSON', err);
      return Promise.reject({error: err, resp: resp});
    }, function(err) {
      return Promise.reject({error: err, resp: resp});
    });
  }
}

function catchError(err) {
  // console.log('catchError', catchError);
  return Promise.reject({error: err});
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
    url: null,
    paramsSchema: {},
  };
  // e.g. 'offers/:id/extra/test/:mId'
  const uriArray = url.split('/:');
  // e.g. ['offers', 'id/extra/test', 'mId']

  if(uriArray.length === 1) {
    result.url = url;
  } else {
    result.url = uriArray[0];
    result.paramsSchema = uriArray
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
