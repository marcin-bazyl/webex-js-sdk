/* eslint-disable require-jsdoc */
import {LocalTrack} from '@webex/internal-media-core';

export {
  createCameraTrack,
  createMicrophoneTrack,
  createDisplayTrack,
  LocalCameraTrack,
  LocalDisplayTrack,
  LocalMicrophoneTrack,
} from '@webex/internal-media-core';

// class ControllableUnmute {
//   unmuteControllers = [];

//   addUnmuteController(isUnmuteAllowed: () => boolean) {
//     this.unmuteControllers.push(isUnmuteAllowed);
//   }

//   removeUnmuteController(isUnmuteAllowed: () => boolean) {
//     this.unmuteControllers = this.unmuteControllers.filter((item) => item !== isUnmuteAllowed);
//   }

//   isUnmuteAllowed() {
//     return this.unmuteControllers.every((controller) => controller());
//   }
// }

// class Dummy {}

// function applyMixins(derivedCtor: any, constructors: any[]) {
//   constructors.forEach((baseCtor) => {
//     Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
//       Object.defineProperty(
//         derivedCtor.prototype,
//         name,
//         Object.getOwnPropertyDescriptor(baseCtor.prototype, name) || Object.create(null)
//       );
//     });
//   });
// }

// interface LocalTrack extends ControllableUnmute, Dummy {}

// applyMixins(LocalTrack, [ControllableUnmute, Dummy]);

// ==================================================

// type Constructor = new (...args: any[]) => {};

// function AddControllableUnmute<TBase extends Constructor>(Base: TBase) {
//   return class ControllableUnmute extends Base {
//     _unmuteControllers = [];

//     addUnmuteController(isUnmuteAllowed: () => boolean) {
//       this._unmuteControllers.push(isUnmuteAllowed);
//     }

//     removeUnmuteController(isUnmuteAllowed: () => boolean) {
//       this._unmuteControllers = this._unmuteControllers.filter((item) => item !== isUnmuteAllowed);
//     }
//   };
// }

// class LocalTrack extends AddControllableUnmute(WcmeLocalTrack) {}

// =====================================

Object.defineProperty(LocalTrack.prototype, 'addUnmuteController', {
  enumerable: true,
  configurable: true,
  writable: true,
  value(isUnmuteAllowed: () => boolean) {
    console.log('marcin: adding controller, this=', this);
    if (this.unmuteControllers) {
      this.unmuteControllers.push(isUnmuteAllowed);
    } else {
      this.unmuteControllers = [isUnmuteAllowed];
    }
  },
});

Object.defineProperty(LocalTrack.prototype, 'removeUnmuteController', {
  enumerable: true,
  configurable: true,
  writable: true,
  value(isUnmuteAllowed: () => boolean) {
    console.log('marcin: removing controller, this=', this);
    if (this.unmuteControllers) {
      this.unmuteControllers = this.unmuteControllers.filter((item) => item !== isUnmuteAllowed);
    }
  },
});

const originalSetMuted = LocalTrack.prototype.setMuted;

Object.defineProperty(LocalTrack.prototype, 'setMuted', {
  enumerable: true,
  configurable: true,
  writable: true,
  value(muted: boolean) {
    console.log(`marcin: setMuted hijacked! muted=${muted}, this=${this}`);

    if (!muted) {
      const unmuteAllowed = this.unmuteControllers
        ? this.unmuteControllers.every((controller) => controller())
        : true;

      if (!unmuteAllowed) {
        throw new Error('Unmute is not allowed');
      }
    }
    console.log('marcin: calling originalSetMuted');

    return originalSetMuted.bind(this, muted);
  },
});

export {LocalTrack};
