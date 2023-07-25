/* eslint-disable no-console */

const WebexCore = require('@webex/webex-core').default;
const testUser = require('@webex/test-helper-test-users');
const sinon = require('sinon');

const config = require('./webex-config');

// Include the plugins which you feel will be used by the webex instance
require('@webex/internal-plugin-mercury');
require('@webex/internal-plugin-llm');
require('@webex/internal-plugin-user');
require('@webex/internal-plugin-device');
require('@webex/internal-plugin-conversation');
require('@webex/internal-plugin-support');
require('@webex/plugin-people');
require('@webex/plugin-rooms');
require('@webex/plugin-meetings');

const generateTestUsers = (options = {}) => {
  options.config = options.config || {};
  options.config.orgId = options.config.orgId || process.env.WEBEX_CONVERGED_ORG_ID;

  if (!options.names) {
    return Promise.reject(new Error(`Test user names missing`));
  }

  if (options.names.length !== options.count) {
    return Promise.reject(new Error(`Test user names list does not match the requested user count: ${options.names.length} !== ${options.count}`));
  }

  const namedUsers = {};

  return testUser.create(options)
    .then(async (userSet) => {
      if (userSet.length !== options.count) {
        return Promise.reject(new Error('Test users not created'));
      }

      // Pause for 5 seconds for CI
      await new Promise((done) => setTimeout(done, 5000));

      const userRegisterPromises = [];

      userSet.forEach((user) => {
        // eslint-disable-next-line no-param-reassign
        user.webex = new WebexCore({
          config: config.webex,
          credentials: {
            authorization: user.token,
          },
          meetings: {
            autoUploadLogs: false,
          },
        });

        user.webex.internal.support.submitLogs = sinon.stub().returns(Promise.resolve());

        user.name = options.names.shift();
        namedUsers[user.name] = user;

        userRegisterPromises.push(user.webex.meetings.register());
      });

      return Promise.all(userRegisterPromises).then(() => {
        Object.values(namedUsers).forEach((user) => {
          // SDK logger adds part of a device url as a prefix to all the logs in tests (see Logger.makeLoggerMethod),
          // so we do a log here after device registration so that we can see the prefix for each test user.
          // This makes it easier to analyze the test logs.
          user.webex.logger.log(`==== Test user ${user.name} created.`);
        });
        return namedUsers;
      });
    })
    .catch((error) => {
      console.error('#generateTestUsers=>ERROR', error);
    });
};

const reserveCMR = (user) =>
  user.webex
    .request({
      method: 'POST',
      uri: 'https://whistler-prod.allnint.ciscospark.com/api/v1/reservations',
      headers: {
        authorization: `Bearer ${user.webex.credentials.supertoken.access_token}`,
        'cisco-no-http-redirect': null,
        'spark-user-agent': null,
        trackingid: `ITCLIENT_ ${user.id} _0_imi:true`,
      },
      body: {
        resourceType: 'CMR_3',
        reservedBy: 'SDK_TEST_USER',
        requestMetaData: {
          emailAddress: user.emailAddress,
          loginType: 'loginGuest',
        },
      },
    })
    .then((res) => {
      console.log('SUCCESS ', res);
    });

module.exports = {
  generateTestUsers,
  reserveCMR,
};
