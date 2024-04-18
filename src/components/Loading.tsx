import * as React from 'react';
export default function Loading({
  color,
  text,
}: {
  color: string;
  text?: string;
}) {
  return <div style={{ color }}>{text ?? 'Loading...'}</div>;
}
