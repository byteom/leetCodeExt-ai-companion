import type { PropsWithChildren } from 'react';

interface FeatureCardProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const FeatureCard = ({ title, subtitle, actions, children }: FeatureCardProps) => {
  return (
    <section className="lcai-card">
      <header className="lcai-card-header">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="lcai-card-actions">{actions}</div> : null}
      </header>
      <div className="lcai-card-body">{children}</div>
    </section>
  );
};