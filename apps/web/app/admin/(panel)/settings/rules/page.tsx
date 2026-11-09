import { requireAdmin, allowed } from "@/lib/admin/guard";
import { isFresh } from "@/lib/admin/fresh";
import { settingsData } from "@/lib/admin/data/settings";
import { names } from "@/lib/admin/data/content";
import { DEFAULT_RULES, RULE_KEYS, rulesFrom, type LearningRules } from "@/lib/learning-rules";
import { Card, NoAccess, Note, PageHead, When } from "@/components/admin/ui";
import { Confirm } from "@/components/admin/forms";
import { SettingsTabs } from "@/components/admin/SettingsTabs";
import { setRule } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Learning rules" };

/** SET-2: the numbers behind streak freezes, mastery rounds, reviews and trials. */
export default async function RulesPage() {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "settings.view", "settings.rules")) return <NoAccess what="Learning rules" roles="a settings role" />;
  const { ready, settings } = await settingsData();
  const rules = rulesFrom(Object.fromEntries([...settings.values()].map((s) => [s.key, s.value])));
  const who = await names([...settings.values()].map((s) => s.updatedBy).filter(Boolean) as string[]);
  const can = allowed(ctx, "settings.rules") && ready;
  const fresh = isFresh(ctx);
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Admin" }, { label: "Platform settings" }]} title="Platform settings" sub="The numbers behind streak freezes, mastery rounds, reviews and trials." />
      <SettingsTabs current="rules" />
      {!ready ? <Note icon="warning">Migration 0061 is not in the database yet. The app uses the defaults below until it runs.</Note> : null}
      <Note>A change applies from each learner&apos;s next lesson, next settled day or next review. Days already counted, freezes already earned and reviews already planned stay as they are. Learner messages that name a number (for example &quot;5 goal days earn a freeze&quot;) still say the default, so change those words in the same week.</Note>
      <Card label="Learning rules" pad={false}>
        <div className="a-tbl-wrap"><table className="a-tbl">
          <thead><tr><th scope="col">Rule</th><th scope="col" className="num">Now</th><th scope="col" className="num">Default</th><th scope="col">Last change</th><th scope="col"><span className="sr">Change</span></th></tr></thead>
          <tbody>{(Object.keys(RULE_KEYS) as (keyof LearningRules)[]).map((k) => {
            const d = RULE_KEYS[k];
            const s = settings.get(d.key);
            return (
              <tr key={k}>
                <td style={{ maxWidth: 440 }}><b className="t-sm">{d.label}</b><span className="t-xs ink-2" style={{ display: "block" }}>{d.help}</span></td>
                <td className="num w6">{rules[k]}</td>
                <td className="num ink-2">{DEFAULT_RULES[k]}</td>
                <td className="t-sm">{s?.updatedBy ? <><When at={s.updatedAt} rel /><span className="t-xs ink-2" style={{ display: "block" }}>{who.get(s.updatedBy) ?? "A team member"}</span></> : <span className="ink-3">Default</span>}</td>
                <td style={{ textAlign: "end" }}>
                  {can ? (
                    <Confirm action={setRule} small label="Change" icon="gear-six" title={`Change "${d.label}"`} sub={d.help} hidden={[{ name: "rule", value: k }]} fresh={fresh}>
                      <div className="a-field">
                        <label htmlFor={`v-${k}`}>New value<span className="req" aria-hidden="true">*</span></label>
                        {d.options ? (
                          <select id={`v-${k}`} name="value" className="a-in" defaultValue={rules[k]}>{d.options.map((o) => <option key={o} value={o}>{o} days</option>)}</select>
                        ) : <input id={`v-${k}`} name="value" className="a-in" type="number" inputMode="numeric" min={d.min} max={d.max} step={1} defaultValue={rules[k]} required />}
                        <span className="help">{d.options ? `One of ${d.options.join(", ")}.` : `From ${d.min} to ${d.max}.`} Now {rules[k]}, default {DEFAULT_RULES[k]}.</span>
                      </div>
                    </Confirm>
                  ) : null}
                </td>
              </tr>
            );
          })}</tbody>
        </table></div>
      </Card>
      <p className="t-xs ink-3">The week start is not here on purpose: it is fixed for each learner when they sign up (Saturday in Arabic, Monday in English), and changing it would move weeks already counted.</p>
    </main>
  );
}
