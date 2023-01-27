/* eslint-disable valid-jsdoc */
/* eslint-disable import/prefer-default-export */

import {AUDIO, EVENT_TRIGGERS, EVENT_TYPES, VIDEO} from '../constants';
import createMuteState from '../meeting/muteState';
import Meeting from '../meeting';
import Trigger from '../common/events/trigger-proxy';

/**
 * Class wrapping all the multistream specific APIs that need to be exposed at meeting level.
 *
 */
export class MultistreamMedia {
  private meeting: Meeting;

  /**
   * Constructor
   * @param {Meeting} meeting
   */
  constructor(meeting: Meeting) {
    this.meeting = meeting;
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * throws if we don't have a media connection created
   */
  private checkMediaConnection() {
    if (this.meeting?.mediaProperties?.webrtcMediaConnection) {
      return;
    }
    throw new Error('Webrtc media connection is missing');
  }

  /**
   * Publishes a local track in the meeting
   *
   * @param {MediaStreamTrack} track
   * @returns {Promise}
   */
  async publishTracks(tracks: {
    microphone?: MediaStreamTrack;
    camera?: MediaStreamTrack;
    screenShare: {
      audio?: MediaStreamTrack; // todo: for now screen share audio is not supported
      video?: MediaStreamTrack;
    };
  }): Promise<void> {
    this.checkMediaConnection();

    if (tracks.screenShare?.video) {
      // we are starting a screen share
      this.meeting.setLocalShareTrack(tracks.screenShare.video);

      // @ts-ignore
      await this.meeting.requestScreenShareFloor();
      this.meeting.mediaProperties.mediaDirection.sendShare = true;

      await this.meeting.mediaProperties.webrtcMediaConnection.publishTrack(
        tracks.screenShare.video,
        'slides'
      );
    }

    if (tracks.microphone) {
      // todo: depending on how muting is done with Local tracks, this code here might need to change...
      // @ts-ignore
      this.meeting.setLocalAudioTrack(tracks.microphone);
      this.meeting.mediaProperties.mediaDirection.sendAudio = true;

      // todo: initialise mute based on the track mute state
      // todo: when we use webrtc-core classes, we'll need to listen for LocalTrackEvents.Muted event and call this.audio.handleClientRequest()

      // audio state could be undefined if you have not sent audio before
      this.meeting.audio =
        this.meeting.audio ||
        createMuteState(AUDIO, this.meeting, this.meeting.mediaProperties.mediaDirection);

      await this.meeting.mediaProperties.webrtcMediaConnection.publishTrack(
        tracks.microphone,
        'main'
      );
    }

    if (tracks.camera) {
      // @ts-ignore
      this.meeting.setLocalVideoTrack(tracks.camera);
      this.meeting.mediaProperties.mediaDirection.sendVideo = true;

      // video state could be undefined if you have not sent video before
      this.meeting.video =
        this.meeting.video ||
        createMuteState(VIDEO, this.meeting, this.meeting.mediaProperties.mediaDirection);

      await this.meeting.mediaProperties.webrtcMediaConnection.publishTrack(tracks.camera, 'main');
    }

    // todo: transcoded meetings
  }

  // todo:
  // local share is not shown in sample app - because the app relies on media:ready event but it's registered only for non-multistream
  // move this all back to meeting/index.ts

  /**
   * Unpublishes a local track in the meeting
   *
   * @param {MediaStreamTrack} track
   * @returns {Promise}
   */
  async unpublishTracks(tracks: MediaStreamTrack[]): Promise<void> {
    // todo: see todos in publishTrack() - they all apply here too:
    // muting etc
    this.checkMediaConnection();

    const unpublishPromises = [];

    for (const track of tracks) {
      if (track === this.meeting.mediaProperties.shareTrack) {
        // todo: screenshare audio
        console.log('marcin: unpublishing screen share video');

        this.meeting.setLocalShareTrack(null);

        // @ts-ignore
        this.meeting.releaseScreenShareFloor(); // we ignore the returned promise here on purpose
        this.meeting.mediaProperties.mediaDirection.sendShare = false;

        unpublishPromises.push(
          this.meeting.mediaProperties.webrtcMediaConnection.unpublishTrack(track, 'slides')
        );
      }

      if (track === this.meeting.mediaProperties.audioTrack) {
        // @ts-ignore
        this.meeting.setLocalAudioTrack(null);
        this.meeting.mediaProperties.mediaDirection.sendAudio = false;

        unpublishPromises.push(
          this.meeting.mediaProperties.webrtcMediaConnection.unpublishTrack(track, 'main')
        );
      }

      if (track === this.meeting.mediaProperties.videoTrack) {
        // @ts-ignore
        this.meeting.setLocalVideoTrack(null);
        this.meeting.mediaProperties.mediaDirection.sendVideo = false;

        unpublishPromises.push(
          this.meeting.mediaProperties.webrtcMediaConnection.unpublishTrack(track, 'main')
        );
      }
    }

    await Promise.all(unpublishPromises);
  }
}
