var assert = require('chai').assert;
var sinon = require('sinon');
require('../helpers/global-error-handler');
var path = require('path');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require("fs"));
var rimraf = require('rimraf');

var JobManager = require('../../lib/job/manager');
var AbstractJobHandler = require('../../lib/job/handler/abstract');
var Logger = require('../../lib/logger');
var serviceLocator = require('../../lib/service-locator');
serviceLocator.register('logger', function() {
  return new Logger();
});

describe('JobManager', function() {

  var globalTmpDir = path.join(__dirname, '/tmp');

  function randomString() {
    return Math.random().toString(36).substring(2, 10);
  }

  function createLocalTmpDir() {
    var tmpDirPath = path.join(globalTmpDir, randomString());
    return fs.mkdirAsync(tmpDirPath).then(function() {
      return tmpDirPath;
    });
  }

  function createJobFile(dir, data) {
    var filepath = path.join(dir, randomString() + '.json');
    return fs.writeFileAsync(filepath, JSON.stringify(data), {encoding: 'utf8', flag: 'w'}).then(function() {
      return filepath;
    });
  }

  function randomTestJobData() {
    return {
      plugin: 'test',
      event: 'test',
      data: {
        streamChannelId: '1',
        audio: '/path/123.rtp',
        video: '/path/124.rtp'
      }
    };
  }

  before(function(done) {
    fs.mkdirAsync(globalTmpDir).then(function() {
      done();
    });
  });

  after(function(done) {
    rimraf(globalTmpDir, function(err) {
      done(err);
    });
  });

  it('test job handler call', function(done) {
    createLocalTmpDir().then(function(tmpDirPath) {
      var jobData = randomTestJobData();
      var testJobHandler = new AbstractJobHandler();
      testJobHandler.handle = sinon.stub().returns(Promise.resolve());
      testJobHandler.getPlugin = sinon.stub().returns(jobData['plugin']);
      testJobHandler.getEvent = sinon.stub().returns(jobData['event']);

      var manager = new JobManager(tmpDirPath, [testJobHandler]);
      manager.start();

      createJobFile(tmpDirPath, jobData).then(function(jobFilepath) {
        setTimeout(function() {
          assert.isTrue(testJobHandler.handle.calledOnce);
          assert.isTrue(testJobHandler.handle.alwaysCalledWithExactly(jobData['data']));

          assert.throws(function() {
            fs.accessSync(jobFilepath);
          });

          fs.rmdirAsync(tmpDirPath).then(function() {
            done();
          });
        }, 1000);//here we need to wait a bit to give time to jobHandler to work.
      });
    });
  });
});
