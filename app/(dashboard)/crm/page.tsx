import { createClient } from "@/lib/supabase/server";
import { addContact, updateLeadStatus } from "./actions";

const statuses = ["new", "qualified", "proposal", "won", "lost"] as const;
type PersonaOption = { id: string; name: string };
type ContactRow = {
  id: string; name: string; email: string | null; company: string | null; persona: string | null;
  persona_id: string | null; leads: { id: string; status: string; value: number | string }[];
};

export default async function CRM() {
  const supabase = await createClient();
  const [{ data: contacts = [] }, { data: personas = [] }] = await Promise.all([
    supabase.from("contacts").select("id,name,email,company,persona,persona_id,created_at,leads(id,status,value)").order("created_at", { ascending: false }),
    supabase.from("buyer_personas").select("id,name").eq("status", "active").order("name"),
  ]);
  const personaOptions = (personas ?? []) as PersonaOption[];
  const personaNames = new Map(personaOptions.map(persona => [persona.id, persona.name]));
  const rows = (contacts ?? []) as ContactRow[];

  return <>
    <h1>CRM & lead pipeline</h1>
    <p className="muted">Connect contacts to buyer personas, track opportunity value, and move leads through the sales pipeline.</p>
    <div className="grid two section">
      <div className="card"><h2>Add contact / lead</h2><form action={addContact} className="form">
        <div className="form-row"><label>Name<input name="name" required /></label><label>Email<input name="email" type="email" /></label></div>
        <label>Company<input name="company" /></label>
        <label>Buyer persona<select name="persona_id"><option value="">No persona selected</option>{personaOptions.map(persona => <option key={persona.id} value={persona.id}>{persona.name}</option>)}</select></label>
        <div className="form-row"><label>Lead status<select name="status">{statuses.map(status => <option key={status}>{status}</option>)}</select></label><label>Potential value<input name="value" type="number" min="0" step="0.01" /></label></div>
        <button className="btn">Save contact</button>
      </form></div>
      <div className="card"><h2>Pipeline guide</h2><div className="checks">
        <div className="check"><span className="badge">New</span><span>Initial contact that still needs qualification.</span></div>
        <div className="check"><span className="badge">Qualified</span><span>Problem, fit, authority, and budget are understood.</span></div>
        <div className="check"><span className="badge">Proposal</span><span>Offer or commercial proposal has been shared.</span></div>
        <div className="check"><span className="badge good">Won</span><span>Opportunity converted into a customer.</span></div>
      </div></div>
    </div>
    <div className="card section"><h2>Contacts & opportunities</h2>{!rows.length ? <div className="empty">No contacts yet.</div> :
      <table><thead><tr><th>Contact</th><th>Persona</th><th>Potential value</th><th>Pipeline stage</th></tr></thead><tbody>{rows.map(contact => {
        const lead = contact.leads?.[0];
        return <tr key={contact.id}><td><strong>{contact.name}</strong><br /><span className="muted">{contact.company || contact.email || "â€”"}</span></td>
          <td>{contact.persona_id ? personaNames.get(contact.persona_id) ?? "Archived persona" : contact.persona || "â€”"}</td>
          <td>{lead ? Number(lead.value).toLocaleString() : "â€”"}</td>
          <td>{lead ? <form action={updateLeadStatus} className="form-row"><input type="hidden" name="lead_id" value={lead.id} /><select name="status" defaultValue={lead.status}>{statuses.map(status => <option key={status}>{status}</option>)}</select><button className="btn secondary">Update</button></form> : <span className="badge">contact</span>}</td>
        </tr>;
      })}</tbody></table>}
    </div>
  </>;
}

