var assert = require('chai').assert;
var esteWatch = require('.././lib');
var fs = require('fs');

var fixturesDir = 'test/fixtures-' + Date.now();
var SAFE_TIMEOUT = 1000;

var arrangeTest = function(file, done) {
  var onChangeCalled = 0;
  var watcher = esteWatch([fixturesDir], function(e) {
    onChangeCalled++;
    assert.deepEqual(e, {
      extension: 'txt',
      filepath: fixturesDir + '/' + file + '.txt'
    });
  });
  watcher.start();
  setTimeout(function() {
    assert.equal(onChangeCalled, 1);
    watcher.dispose();
    done();
  }, SAFE_TIMEOUT);
  fs.writeFileSync(fixturesDir + '/' + file + '.txt', 'foo');
};

var deleteFolderRecursive = function(path) {
  var files = [];
  if (fs.existsSync(path)) {
    files = fs.readdirSync(path);
    files.forEach(function(file, index) {
      var curPath = path + '/' + file;
      if (fs.statSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

describe('index', function() {
  before(function() {
    fs.mkdirSync(fixturesDir);
  });
  after(function() {
    deleteFolderRecursive(fixturesDir);
  });

  it('should throw error for not existing dir', function() {
    var createEsteWatchWithNonExistingDir = function() {
      esteWatch(['notExistingDir'], function(e) {});
    };
    assert.throw(createEsteWatchWithNonExistingDir,
      "[este-watch] Directory 'notExistingDir' does not exits.");
  });

  describe('(current directory)', function() {
    it('should detect new file', function(done) {
      arrangeTest('file', done);
    });

    it('should detect changed file', function(done) {
      arrangeTest('file', done);
    });

    // Because it's impossible for Windows with fs.watch.
    it('should not detect removed file', function(done) {
      var watcherCalled = false;
      var watcher = esteWatch([fixturesDir], function(e) {
        watcherCalled = true;
      });
      watcher.start();
      fs.unlinkSync(fixturesDir + '/file.txt');
      setTimeout(function() {
        watcher.dispose();
        assert.isFalse(watcherCalled);
        done();
      }, SAFE_TIMEOUT);
    });
  });

  describe('(subdirectory)', function() {
    before(function() {
      fs.mkdirSync(fixturesDir + '/a');
    });

    it('should detect new file', function(done) {
      arrangeTest('a/file', done);
    });

    it('should detect changed file', function(done) {
      arrangeTest('a/file', done);
    });
  });

  describe('(subdirectory created after watch start)', function() {
    it('should detect new file', function(done) {
      var watcherCalled = false;
      var watcher = esteWatch([fixturesDir], function(e) {
        watcherCalled = true;
      });
      watcher.start();
      setTimeout(function() {
        fs.mkdirSync(fixturesDir + '/a/b');
      }, 100);
      setTimeout(function() {
        fs.writeFileSync(fixturesDir + '/a/b/foo.txt', 'foo');
      }, 200);
      setTimeout(function() {
        watcher.dispose();
        assert.isTrue(watcherCalled);
        done();
      }, SAFE_TIMEOUT);
    });
  });
});

// TODO: Test for Windows locked file. Need test case.