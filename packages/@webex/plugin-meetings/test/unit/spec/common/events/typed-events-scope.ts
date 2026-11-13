/*!
 * Copyright (c) 2015-2026 Cisco Systems, Inc. See LICENSE file.
 */
import {assert} from '@webex/test-helper-chai';
import sinon from 'sinon';
import TypedEventsScope from '@webex/plugin-meetings/src/common/events/typed-events-scope';
import LoggerProxy from '@webex/plugin-meetings/src/common/logs/logger-proxy';

describe('plugin-meetings', () => {
  describe('TypedEventsScope', () => {
    const SCOPE = {file: 'test/file', function: 'testFunction'};

    let emitter;
    let debugStub;

    beforeEach(() => {
      debugStub = sinon.stub();
      sinon.stub(LoggerProxy, 'logger').value({...LoggerProxy.logger, debug: debugStub});
      emitter = new TypedEventsScope<{'test:event': {value: number}}>();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('logs the scope and event name, and passes the payload to listeners', () => {
      const listener = sinon.stub();

      emitter.on('test:event', listener);

      assert.isTrue(emitter.emit(SCOPE, 'test:event', {value: 1}));
      assert.calledOnceWithExactly(listener, {value: 1});
      assert.calledOnceWithExactly(debugStub, 'test/file:testFunction->event#test:event');
    });

    [
      {add: 'on', remove: 'off'},
      {add: 'addListener', remove: 'removeListener'},
      {add: 'prependListener', remove: 'off'},
    ].forEach(({add, remove}) => {
      it(`calls a listener added with ${add} until it is removed with ${remove}`, () => {
        const listener = sinon.stub();

        emitter[add]('test:event', listener);
        emitter.emit(SCOPE, 'test:event', {value: 1});
        emitter[remove]('test:event', listener);
        emitter.emit(SCOPE, 'test:event', {value: 2});

        assert.deepEqual(listener.args, [[{value: 1}]]);
      });
    });

    ['once', 'prependOnceListener'].forEach((add) => {
      it(`calls a listener added with ${add} only for the first emit`, () => {
        const listener = sinon.stub();

        emitter[add]('test:event', listener);
        emitter.emit(SCOPE, 'test:event', {value: 1});
        emitter.emit(SCOPE, 'test:event', {value: 2});

        assert.deepEqual(listener.args, [[{value: 1}]]);
      });
    });

    it('calls prepended listeners before existing ones', () => {
      const first = sinon.stub();
      const prepended = sinon.stub();

      emitter.on('test:event', first);
      emitter.prependListener('test:event', prepended);
      emitter.emit(SCOPE, 'test:event', {value: 1});

      sinon.assert.callOrder(prepended, first);
    });
  });
});
