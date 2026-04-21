import { Route, Switch } from 'wouter';
import { Layout } from './components/Layout.js';
import { Runs } from './pages/Runs.js';
import { RunDetail } from './pages/RunDetail.js';
import { Compare } from './pages/Compare.js';
import { Trends } from './pages/Trends.js';
import { TestExplorer } from './pages/TestExplorer.js';

export function App() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Runs} />
        <Route path="/runs/:id" component={RunDetail} />
        <Route path="/compare" component={Compare} />
        <Route path="/trends" component={Trends} />
        <Route path="/tests" component={TestExplorer} />
        <Route>
          <div className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 text-center text-sm text-[color:var(--color-text-dim)]">
            Nothing here — try the nav above.
          </div>
        </Route>
      </Switch>
    </Layout>
  );
}
