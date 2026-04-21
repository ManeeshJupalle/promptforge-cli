import { useEffect, useState } from 'react';

// react-diff-viewer-continued pulls in prism + a sizable bundle, so we
// dynamic-import it only when a diff is actually rendered. Placeholder
// text shows while the module loads.
interface Props {
  oldValue: string;
  newValue: string;
  leftTitle?: string;
  rightTitle?: string;
}

type DiffComponent = React.ComponentType<{
  oldValue: string;
  newValue: string;
  splitView: boolean;
  useDarkTheme: boolean;
  leftTitle?: string;
  rightTitle?: string;
  styles?: Record<string, unknown>;
}>;

export function DiffViewer({ oldValue, newValue, leftTitle, rightTitle }: Props) {
  const [Component, setComponent] = useState<DiffComponent | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await import('react-diff-viewer-continued');
      if (!cancelled) setComponent(() => mod.default as unknown as DiffComponent);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Component) {
    return (
      <pre className="overflow-auto rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3 font-mono text-xs text-[color:var(--color-text-dim)]">
        loading diff…
      </pre>
    );
  }
  return (
    <div className="diff-host overflow-hidden rounded border border-[color:var(--color-border)]">
      <Component
        oldValue={oldValue}
        newValue={newValue}
        splitView
        useDarkTheme
        leftTitle={leftTitle}
        rightTitle={rightTitle}
      />
    </div>
  );
}
