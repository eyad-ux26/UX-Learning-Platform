"""Check every ref quote in content/paths/P02 is copied exactly from the downloaded article text."""
import glob, re, sys, yaml, unicodedata
def norm(s):
    s = unicodedata.normalize("NFKC", s).replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"').replace("\u201d", '"').replace("\u2014", "-").replace("\u2013", "-")
    return re.sub(r"\s+", " ", s)
arts = {}
for f in glob.glob("src-articles/*.txt"):
    slug = f.split("\\")[-1].split("/")[-1][:-4]
    arts[slug] = norm(open(f, encoding="utf-8").read())
bad = 0
for f in sorted(glob.glob("content-repo/content/paths/P02/**/*.yaml", recursive=True)):
    d = yaml.safe_load(open(f, encoding="utf-8"))
    srcs = {s["url"] for s in d.get("sources", []) or []}
    for st in d.get("steps", []) or []:
        r = st.get("ref")
        if not r: continue
        slug = r["url"].rstrip("/").split("/")[-1]
        if r["url"] not in srcs: print(f"{f} {st['id']}: url not in sources"); bad += 1
        if slug not in arts: print(f"{f} {st['id']}: no article {slug}"); bad += 1; continue
        if norm(r["quote"]) not in arts[slug]: print(f"{f} {st['id']}: quote not found: {r['quote'][:80]}"); bad += 1
print("quote problems:", bad)
