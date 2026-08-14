"use client";

import { useMemo, useState } from "react";
import { saveFinanceScenario } from "./actions";

export default function Calculator() {
  const [fixed, setFixed] = useState(1000);
  const [price, setPrice] = useState(100);
  const [variable, setVariable] = useState(30);
  const [units, setUnits] = useState(20);
  const result = useMemo(() => {
    const margin = price - variable;
    const breakEven = margin > 0 ? Math.ceil(fixed / margin) : 0;
    const revenue = price * units;
    const profit = margin * units - fixed;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { margin, breakEven, revenue, profit, profitMargin };
  }, [fixed, price, variable, units]);

  return <div className="grid two section">
    <div className="card"><h2>Scenario inputs</h2><form action={saveFinanceScenario} className="form">
      <label>Scenario name<input name="name" required placeholder="Starter plan Â· Base case" /></label>
      <label>Monthly fixed costs<input name="fixed_costs" type="number" min="0" step="0.01" value={fixed} onChange={event => setFixed(+event.target.value)} /></label>
      <label>Price per sale<input name="price_per_unit" type="number" min="0" step="0.01" value={price} onChange={event => setPrice(+event.target.value)} /></label>
      <label>Variable cost per sale<input name="variable_cost_per_unit" type="number" min="0" step="0.01" value={variable} onChange={event => setVariable(+event.target.value)} /></label>
      <label>Expected monthly sales<input name="expected_units" type="number" min="0" step="1" value={units} onChange={event => setUnits(+event.target.value)} /></label>
      {result.margin <= 0 ? <div className="alert">Price must be higher than the variable cost per sale.</div> : <button className="btn">Save scenario</button>}
    </form></div>
    <div><div className="grid two">
      <div className="card"><span className="muted">Break-even sales</span><div className="metric">{result.breakEven}</div></div>
      <div className="card"><span className="muted">Contribution margin</span><div className="metric">{result.margin.toLocaleString()}</div></div>
      <div className="card"><span className="muted">Revenue</span><div className="metric">{result.revenue.toLocaleString()}</div></div>
      <div className="card"><span className="muted">Expected profit</span><div className="metric">{result.profit.toLocaleString()}</div></div>
      <div className="card"><span className="muted">Profit margin</span><div className="metric">{result.profitMargin.toFixed(1)}%</div></div>
    </div></div>
  </div>;
}

