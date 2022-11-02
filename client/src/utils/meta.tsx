import { Helmet } from "react-helmet";

const Meta = (props: { title: string; children: JSX.Element }) => {
  return (
    <div className="wrapper">
      <Helmet>
        <title>{props.title}</title>
        <meta property="og:title" content={props.title} />
        <meta property="og:type" content="video.movie" />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:video" content={window.location.href} />
      </Helmet>
      {props.children}
    </div>
  );
};

export default Meta;
