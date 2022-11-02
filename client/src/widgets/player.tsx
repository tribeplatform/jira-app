import { useEffect } from "react";
import videojs from "video.js";
import {
  VideoJSQualityPlugin,
  VideoJSIVSTech,
  registerIVSQualityPlugin,
  registerIVSTech,
  VideoJSEvents,
} from "amazon-ivs-player";

//TODO: Move this files to CDN
const createAbsolutePath = (assetPath: string) =>
  new URL(assetPath, window.location.origin).toString();

// register the tech with videojs
registerIVSTech(videojs, {
  wasmWorker: createAbsolutePath("assets/amazon-ivs-wasmworker.min.js"),
  wasmBinary: createAbsolutePath(`assets/amazon-ivs-wasmworker.min.wasm`),
});

// register the quality plugin
registerIVSQualityPlugin(videojs);

const PlayerWidget = ({ playbackURL }: { playbackURL: string }) => {
  useEffect(() => {
    // create the player with the appropriate types. We're using @types/video.js VideoJsPlayer, and intersecting our Player and Quality Plugin interface
    const player = videojs(
      "videojs-player",
      {
        techOrder: ["AmazonIVS"],
        autoplay: true,
      },
      function () {
        console.warn("Player is ready to use");
      }
    ) as videojs.Player & VideoJSIVSTech & VideoJSQualityPlugin;

    // enable the quality plugin
    player.enableIVSQualityPlugin();

    // listen to IVS specific events
    const events: VideoJSEvents = player.getIVSEvents();
    const ivsPlayer = player.getIVSPlayer();
    ivsPlayer.addEventListener(events.PlayerState.PLAYING, () => {
      console.log("IVS Player is playing");
    });

    player.src(playbackURL);
  }, [playbackURL]);

  return (
    <div className="App">
      <video
        id="videojs-player"
        className="video-js vjs-default-skin vjs-4-3 vjs-big-play-centered"
        controls
        autoPlay
        playsInline
      />
    </div>
  );
};

export default PlayerWidget;
