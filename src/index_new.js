import invariant from 'invariant';

export const MySingletonClass = function(config) {
  if(MySingletonClass.prototype._singletonInstance) {
    return MySingletonClass.prototype._singletonInstance;
  }
  MySingletonClass.prototype._singletonInstance = this;

  this._config = config;

  this.getConfig = () => {
    return this._config;
  };

  this.setConfig = (config) => {
    return {
      ...this._config,
      ...config,
    };
  };

  this.create = (config) => {
    return new API({
      ...this._config,
      ...config,
    }, this);
  };
};


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
  } = {}) {
    this.config = {};
    this.config.baseUrl = baseUrl;
    this.config.headers = headers;
    this.config.requestInterceptor = requestInterceptor;
    this.config.responseHandler = responseInterceptor;
  }

  create(args, configFn) {
    return new API({
      ...this.config,
      ...args,
    }, configFn);
  }

  setBaseUrl(args) {

  }
}

export class API extends APICreator {
  constructor(props, configFn) {
    super(props);

    invariant(!props.url || !(props.baseUrl && props.uri), 'no url defined');

    const {url, paramsSchema} = _parseUrl(props.url || props.baseUrl + props.uri);

    this.url = url;
    this.paramsSchema = paramsSchema;

    this.configFn = configFn;
  }

  getBaseUrl() {
    return this.configFn({url: this.url});
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
