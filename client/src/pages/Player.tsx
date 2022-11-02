import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import Meta from "../utils/meta";
import PlayerWidget from "../widgets/player";

const PlayerPage = () => {
  const { channel = "Streaming" } = useParams();
  const [playbackURL, setPlaybackURL] = useState<null | string>(null);
  const location = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const playbackURLParam = queryParams.get("playbackurl");
    if (playbackURLParam) {
      setPlaybackURL(decodeURIComponent(playbackURLParam));
    }
  }, [location.search]);

  return (
    <Meta title={channel}>
      <>{playbackURL && <PlayerWidget playbackURL={playbackURL} />}</>
    </Meta>
  );
};
export default PlayerPage;
