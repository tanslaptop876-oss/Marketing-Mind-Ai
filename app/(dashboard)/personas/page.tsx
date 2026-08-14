import { createClient } from "@/lib/supabase/server";
import { addPersona, archivePersona } from "./actions";

type Persona = {
  id: string;
  name: string;
  segment: string;
  demographics: string | null;
  goals: string[];
  pain_points: string[];
  preferred_channels: string[];
  messaging_notes: string | null;
  budget_range: string | null;
  status: string;
};

export default async function Personas() {
  const supabase = await createClient();
  const { data = [] } = await supabase.from("buyer_personas")
    .select("id,name,segment,demographics,goals,pain_points,preferred_channels,messaging_notes,budget_range,status")
    .order("created_at", { ascending: false });
  const personas = (data ?? []) as Persona[];

  return <>
    <h1>Buyer personas & targeting</h1>
    <p className="muted">Turn audience research into reusable targeting and campaign messaging guidance.</p>
    <div className="grid two section">
      <div className="card">
        <h2>Create persona</h2>
        <form action={addPersona} className="form">
          <div className="form-row">
            <label>Persona name<input name="name" required placeholder="Growth-focused founder" /></label>
            <label>Audience segment<input name="segment" required placeholder="Small business owners" /></label>
          </div>
          <label>Demographics<input name="demographics" placeholder="Age 28â€“45, urban, decision-maker" /></label>
          <label>Goals (comma separated)<input name="goals" placeholder="Generate leads, reduce ad waste, save time" /></label>
          <label>Pain points (comma separated)<input name="pain_points" placeholder="Limited team, unclear ROI, inconsistent content" /></label>
          <label>Preferred channels (comma separated)<input name="preferred_channels" placeholder="Facebook, Google, LinkedIn" /></label>
          <label>Budget range<input name="budget_range" placeholder="$300â€“$1,000/month" /></label>
          <label>Messaging notes<textarea name="messaging_notes" rows={4} placeholder="Lead with measurable growth and simple automation." /></label>
          <button className="btn">Save persona</button>
        </form>
      </div>
      <div className="card">
        <h2>Targeting checklist</h2>
        <div className="checks">
          <div className="check"><span className="badge good">1</span><span>Define one clear audience segment and buying context.</span></div>
          <div className="check"><span className="badge good">2</span><span>Match campaign benefits to goals and pain points.</span></div>
          <div className="check"><span className="badge good">3</span><span>Choose channels where the persona already spends attention.</span></div>
          <div className="check"><span className="badge good">4</span><span>Use the messaging notes when writing campaign content.</span></div>
        </div>
      </div>
    </div>
    <div className="card section">
      <h2>Persona library</h2>
      {!personas.length ? <div className="empty">No personas yet. Create your first targeting profile above.</div> :
        <table><thead><tr><th>Persona</th><th>Goals & pain points</th><th>Channels</th><th>Budget</th><th>Status</th><th></th></tr></thead>
          <tbody>{personas.map(persona => <tr key={persona.id}>
            <td><strong>{persona.name}</strong><br /><span className="muted">{persona.segment}</span>{persona.demographics ? <><br /><span className="small muted">{persona.demographics}</span></> : null}</td>
            <td><span className="small"><strong>Goals:</strong> {persona.goals.join(", ") || "â€”"}<br /><strong>Pains:</strong> {persona.pain_points.join(", ") || "â€”"}</span></td>
            <td>{persona.preferred_channels.length ? persona.preferred_channels.map(channel => <span className="badge" key={channel}>{channel}</span>) : "â€”"}</td>
            <td>{persona.budget_range || "â€”"}</td>
            <td><span className={`badge ${persona.status === "active" ? "good" : ""}`}>{persona.status}</span></td>
            <td>{persona.status === "active" ? <form action={archivePersona}><input type="hidden" name="id" value={persona.id} /><button className="btn secondary">Archive</button></form> : null}</td>
          </tr>)}</tbody>
        </table>}
    </div>
  </>;
}

