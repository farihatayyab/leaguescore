// Team / competition ka logo; logo na ho to pehla harf dikhata hai
export default function Crest({ src, name = "", size = 28, round = false }) {
  const style = { width: size, height: size };
  if (!src) {
    return (
      <span className="crest-fb" style={{ ...style, fontSize: size * 0.42 }} aria-hidden="true">
        {(name[0] || "?").toUpperCase()}
      </span>
    );
  }
  return (
    <img
      className={round ? "crest round" : "crest"}
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      style={style}
    />
  );
}
