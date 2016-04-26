import Tape from 'tape';
import {APIManager} from '../index';

Tape('checkUrl', (t) => {
  t.plan(3);

  const Manager = new APIManager({
    baseUrl: 'baseUrl',
  });

  t.comment('API should inherit config option from the Manager');
  const API = Manager.create();
  t.equal(API._config.baseUrl, 'baseUrl');

  t.comment('API2 should override config option from the Manager');
  const API2 = Manager.create({
    baseUrl: 'newBaseUrl',
  });
  t.equal(API2._config.baseUrl, 'newBaseUrl');

  t.comment('already instantiated API should be updated if the Manager changes global config');
  Manager.updateConfig({
    baseUrl: 'globalUrl',
  });
  t.equal(API._config.baseUrl, 'globalUrl');

});

Tape('checkUrl2', (t) => {
  t.plan(4);

  const defaultHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Origin': '*',
  };

  const Manager = new APIManager({
    baseUrl: 'baseUrl',
  });

  t.comment('API should extend baseUrl with uri to be an URL');
  const API = Manager.create({
    uri: '/8080',
  });
  t.equal(API._config.url, 'baseUrl/8080');
  t.deepEqual(API._config.headers, defaultHeaders, 'should set default headers');

  Manager.extendHeader({
    auth: 'abc',
  });

  t.deepEqual(API._config.headers, {
    auth: 'abc',
    ...defaultHeaders,
  }, 'Manager should update instance headers');

  Manager.removeHeaderProperty('auth');

  t.deepEqual(API._config.headers, defaultHeaders, 'Manager should remove header property');

});
