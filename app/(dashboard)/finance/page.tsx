import { createClient } from "@/lib/supabase/server";
import Calculator from "./calculator";
import { deleteFinanceScenario } from "./actions";

type Scenario = {
  id: string; name: string; fixed_costs: number | string; price_per_unit: number | string;
  variable_cost_per_unit: number | string; expected_units: number; created_at: string;
};

export default async function Finance() {
  const supabase = await createClient();
  const { data = [] } = await supabase.from("finance_scenarios")
    .select("id,name,fixed_costs,price_per_unit,variable_cost_per_unit,expected_units,created_at")
    .order("created_at", { ascending: false });
  const scenarios = (data ?? []) as Scenario[];

  return <>
    <h1>Break-even & profitability</h1>
    <p className="muted">Test pricing, costs, and sales assumptions, then save scenarios for comparison. Values use your preferred currency.</p>
    <Calculator />
    <div className="card section"><h2>Saved scenarios</h2>
      {!scenarios.length ? <div className="empty">No saved scenarios yet.</div> : <table><thead><tr><th>Scenario</th><th>Break-even</th><th>Revenue</th><th>Expected profit</th><th>Margin</th><th></th></tr></thead>
        <tbody>{scenarios.map(scenario => {
          const fixed = Number(scenario.fixed_costs), price = Number(scenario.price_per_unit), variable = Number(scenario.variable_cost_per_unit);
          const contribution = price - variable;
          const breakEven = contribution > 0 ? Math.ceil(fixed / contribution) : 0;
          const revenue = price * scenario.expected_units;
          const profit = contribution * scenario.expected_units - fixed;
          const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
          return <tr key={scenario.id}><td><strong>{scenario.name}</strong><br /><span className="small muted">{scenario.expected_units} expected sales</span></td><td>{breakEven}</td><td>{revenue.toLocaleString()}</td><td><span className={`badge ${profit >= 0 ? "good" : "bad"}`}>{profit.toLocaleString()}</span></td><td>{margin.toFixed(1)}%</td><td><form action={deleteFinanceScenario}><input type="hidden" name="id" value={scenario.id} /><button className="btn secondary">Delete</button></form></td></tr>;
        })}</tbody>
      </table>}
    </div>
  </>;
}

