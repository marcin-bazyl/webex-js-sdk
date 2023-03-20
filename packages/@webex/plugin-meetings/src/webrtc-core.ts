/* eslint-disable @typescript-eslint/no-misused-new */
/* eslint-disable valid-jsdoc */
/* eslint-disable require-jsdoc */
import {
  LocalTrack as WcmeLocalTrack,
  LocalMicrophoneTrack as WcmeLocalMicrophoneTrack,
  LocalCameraTrack as WcmeLocalCameraTrack,
} from '@webex/internal-media-core';

export {createDisplayTrack, LocalDisplayTrack} from '@webex/internal-media-core';

// =====================================================================================================
// Redefine the setMuted() method on the LocalTrack class so that it calls the unmute controllers first
// before calling the original webrtc-core's LocalTrack.setMuted()

const originalSetMuted = WcmeLocalTrack.prototype.setMuted;

Object.defineProperty(WcmeLocalTrack.prototype, 'setMuted', {
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
        return Promise.reject(Error('Unmute is not allowed'));
      }
    }
    console.log('marcin: calling originalSetMuted');

    originalSetMuted.bind(this, muted);

    return Promise.resolve();
  },
});

// To get started, we need a type which we'll use to extend
// other classes from. The main responsibility is to declare
// that the type being passed in is a class.

type Constructor = new (...args: any[]) => {};

// type GConstructor<T = {}> = new (...args: any[]) => T;

// type LocalTrackLike = GConstructor<WcmeLocalTrack>;

// This mixin adds a scale property, with getters and setters
// for changing it with an encapsulated private property:

function addControllableUnmute<TBase extends Constructor>(Base: TBase) {
  /** Class that allows registering unmute controllers - callbacks that determine if an unmute operation is allowed or not.
   *  Unmute will be allowed only if all registered controllers return true in their callbacks.
   */
  return class ControllableUnmute extends Base {
    // Mixins may not declare private/protected properties
    // however, you can use ES2020 private fields
    unmuteControllers = [];

    /**
     * @internal
     */
    addUnmuteController(isUnmuteAllowed: () => boolean) {
      this.unmuteControllers.push(isUnmuteAllowed);
    }

    /**
     * @internal
     */
    removeUnmuteController(isUnmuteAllowed: () => boolean) {
      this.unmuteControllers = this.unmuteControllers.filter((item) => item !== isUnmuteAllowed);
    }

    /** Returns true if unmute operation is allowed */
    isUnmuteAllowed() {
      return this.unmuteControllers.every((controller) => controller());
    }

    setMuted(muted: boolean): Promise<void> {
      console.log(`marcin: setMuted hijacked! muted=${muted}, this=${this}`);

      if (!muted) {
        if (!this.isUnmuteAllowed()) {
          return Promise.reject(Error('Unmute is not allowed'));
        }
      }
      console.log('marcin: calling originalSetMuted');

      // todo super.setMuted(muted);

      return Promise.resolve();
    }
  };
}

// Compose a new class from the WcmeLocalTrack class,
// with the Mixin addControllableUnmute applier:
export const LocalMicrophoneTrack = addControllableUnmute(WcmeLocalMicrophoneTrack);
export const LocalCameraTrack = addControllableUnmute(WcmeLocalCameraTrack);

export {createMicrophoneTrack, createCameraTrack, LocalTrack} from '@webex/internal-media-core';

// class ControllableUnmute {
//   unmuteControllers = [];

//   /**
//    * @internal
//    */
//   addUnmuteController(isUnmuteAllowed: () => boolean) {
//     this.unmuteControllers.push(isUnmuteAllowed);
//   }

//   /**
//    * @internal
//    */
//   removeUnmuteController(isUnmuteAllowed: () => boolean) {
//     this.unmuteControllers = this.unmuteControllers.filter((item) => item !== isUnmuteAllowed);
//   }

//   /** Returns true if unmute operation is allowed */
//   isUnmuteAllowed() {
//     return this.unmuteControllers.every((controller) => controller());
//   }
// }

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

// /** list of LocalTrack methods from webrtc-core that we are overriding in the SDK and changing their types */
// interface OverriddenMethods {
//   setMuted(...args: Parameters<WcmeLocalTrack['setMuted']>): Promise<void>; // we are changing only the return type here: from void to Promise<void>
// }

// // Create the mixin of ControllableUnmute and LocalTrack
// interface LocalTrack
//   extends ControllableUnmute,
//     Omit<WcmeLocalTrack, keyof OverriddenMethods>,
//     OverriddenMethods {
//   new (...args: ConstructorParameters<typeof WcmeLocalTrack>): LocalTrack;
// }

// applyMixins(WcmeLocalTrack, [ControllableUnmute]);

// // update LocalMicrophoneTrack and LocalCameraTrack interfaces to include the new overridden method signatures
// export interface LocalMicrophoneTrack
//   extends Omit<WcmeLocalMicrophoneTrack, keyof OverriddenMethods>,
//     LocalTrack {
//   new (...args: ConstructorParameters<typeof WcmeLocalMicrophoneTrack>): LocalMicrophoneTrack;
// }

// export interface LocalCameraTrack
//   extends Omit<WcmeLocalCameraTrack, keyof OverriddenMethods>,
//     LocalTrack {
//   new (...args: ConstructorParameters<typeof WcmeLocalCameraTrack>): LocalCameraTrack;
// }

// export const LocalMicrophoneTrack = WcmeLocalMicrophoneTrack as unknown as LocalMicrophoneTrack;
// export const LocalCameraTrack = WcmeLocalCameraTrack as unknown as LocalCameraTrack;
// export const LocalTrack = WcmeLocalTrack as unknown as LocalTrack;
// // export {WcmeLocalTrack as LocalTrack};

// // =====================================================================================================
// // We have to define all the functions that return any class based on LocalTrack.
// // We need to do this, otherwise the apps won't see the correct, updated by SDK method signatures on these track classes
// export const createMicrophoneTrack = (
//   ...args: Parameters<typeof wcmeCreateMicrophoneTrack>
// ): Promise<LocalMicrophoneTrack> =>
//   wcmeCreateMicrophoneTrack(...args) as unknown as Promise<LocalMicrophoneTrack>;

// export const createCameraTrack = (
//   ...args: Parameters<typeof wcmeCreateCameraTrack>
// ): Promise<LocalCameraTrack> =>
//   wcmeCreateCameraTrack(...args) as unknown as Promise<LocalCameraTrack>;
