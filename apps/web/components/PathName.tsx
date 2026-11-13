// A path name for display. The Arabic names carry an English term in brackets, for example «… (Form Design)»; the term stays on
// one line (bdi + nowrap) so a narrow card never splits it. English names have no bracket and render as plain text.
const TERM = /^(.*?)(\([A-Za-z][^()]*\))(.*)$/s;

export function PathName({ name }: { name: string }) {
  const m = TERM.exec(name);
  if (!m) return <bdi>{name}</bdi>;
  return (
    <bdi>
      {m[1]}
      <bdi style={{ whiteSpace: "nowrap" }}>{m[2]}</bdi>
      {m[3]}
    </bdi>
  );
}
