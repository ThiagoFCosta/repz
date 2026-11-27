import type { CSSProperties, ReactNode } from 'react';
import { Icon, type IconName } from '../core/Icon';
import { cx } from '../core/cx';
import './PromptCard.css';

export interface PromptCardProps {
  title: ReactNode;
  description?: ReactNode;
  cta?: ReactNode;
  icon?: IconName;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Sugestão de pergunta para o assistente; hover tinge de lime-50. */
export function PromptCard({ title, description, cta = 'Saiba mais', icon, onClick, disabled = false, className, style }: PromptCardProps) {
  return (
    <button type="button" className={cx('pr-prompt', className)} onClick={onClick} disabled={disabled} style={style}>
      <span className="pr-prompt__title">
        {icon ? <Icon name={icon} size={18} color="var(--text-success)" /> : null}{title}
      </span>
      {description ? <span className="pr-prompt__desc">{description}</span> : null}
      <span className="pr-prompt__cta">{cta}<Icon name="arrow-right" size={16} /></span>
    </button>
  );
}
