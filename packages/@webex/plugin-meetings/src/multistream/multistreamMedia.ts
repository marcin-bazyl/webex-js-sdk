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

  private onEndedHandler = () => {
    console.log('marcin: share track onended fired!');
    this.meeting.handleMultistreamShareTrackEnded();
  };

  /**
   * Publishes a local track in the meeting
   *
   * @param {MediaStreamTrack} track
   * @returns {Promise}
   */
  async publishTrack(
    track: MediaStreamTrack,
    mediaContent: 'main' | 'slides' = 'main'
  ): Promise<void> {
    // todo: mediaContent parameter is just a temp hack until we use classes from webrtc-core
    this.checkMediaConnection();

    if (mediaContent === 'slides') {
      // we are starting a screen share
      this.meeting.mediaProperties.setLocalShareTrack(track);
      track.addEventListener('ended', this.onEndedHandler);
      Trigger.trigger(
        this.meeting,
        {
          file: 'meeting/index',
          function: 'setLocalShareTrack',
        },
        EVENT_TRIGGERS.MEDIA_READY,
        {
          type: EVENT_TYPES.LOCAL_SHARE, // todo: do we need this event at all for multistream? I'd rather get rid of it
          track,
        }
      );
      await this.meeting.requestScreenShareFloor();
      this.meeting.mediaProperties.mediaDirection.sendShare = true;
    }

    if (mediaContent === 'main') {
      // todo: depending on how muting is done with Local tracks, this code here might need to change...
      if (track.kind === 'audio') {
        // @ts-ignore
        this.meeting.setLocalAudioTrack(track);
        this.meeting.mediaProperties.mediaDirection.sendAudio = true;

        // todo: initialise mute based on the track mute state
        // todo: when we use webrtc-core classes, we'll need to listen for LocalTrackEvents.Muted event and call this.audio.handleClientRequest()

        // audio state could be undefined if you have not sent audio before
        this.meeting.audio =
          this.meeting.audio ||
          createMuteState(AUDIO, this.meeting, this.meeting.mediaProperties.mediaDirection);
      }

      if (track.kind === 'video') {
        // @ts-ignore
        this.meeting.setLocalVideoTrack(track);
        this.meeting.mediaProperties.mediaDirection.sendVideo = true;

        // video state could be undefined if you have not sent video before
        this.meeting.video =
          this.meeting.video ||
          createMuteState(VIDEO, this.meeting, this.meeting.mediaProperties.mediaDirection);
      }
    }

    return this.meeting.mediaProperties.webrtcMediaConnection.publishTrack(track, mediaContent);
  }

  // todo:
  // local share is not shown in sample app - because the app relies on media:ready event but it's registered only for non-multistream
  // when stealing etc, the code that handles locus notifications triggers updateShare() - it should instead do unpublish (look for todo comments)

  /**
   * Unpublishes a local track in the meeting
   *
   * @param {MediaStreamTrack} track
   * @returns {Promise}
   */
  async unpublishTrack(track: MediaStreamTrack): Promise<void> {
    // todo: see todos in publishTrack() - they all apply here too:
    // muting etc
    let mediaContent = 'main';

    this.checkMediaConnection();

    if (track === this.meeting.mediaProperties.shareTrack) {
      // todo: screenshare audio
      console.log('marcin: unpublishing screen share video');
      mediaContent = 'slides';
      track.removeEventListener('ended', this.onEndedHandler);
      // @ts-ignore
      await this.meeting.releaseScreenShareFloor();
      this.meeting.mediaProperties.mediaDirection.sendShare = false;
    }

    if (track === this.meeting.mediaProperties.audioTrack) {
      // @ts-ignore
      this.meeting.setLocalAudioTrack(null);
      this.meeting.mediaProperties.mediaDirection.sendAudio = false;
    }

    if (track === this.meeting.mediaProperties.videoTrack) {
      // @ts-ignore
      this.meeting.setLocalVideoTrack(null);
      this.meeting.mediaProperties.mediaDirection.sendVideo = false;
    }

    await this.meeting.mediaProperties.webrtcMediaConnection.unpublishTrack(track, mediaContent);
  }
}
