interface FloatingWidgetProps {
  open: boolean;
  onToggle: () => void;
}

export const FloatingWidget = ({ open, onToggle }: FloatingWidgetProps) => {
  return (
    <button
      type="button"
      className={`lcai-fab ${open ? 'open' : ''}`}
      onClick={onToggle}
      title={open ? 'Close LeetCode AI Assistant' : 'Open LeetCode AI Assistant'}
      aria-label={open ? 'Close LeetCode AI Assistant' : 'Open LeetCode AI Assistant'}
    >
      <span className="lcai-fab-icon" aria-hidden="true">
        {open ? '×' : '</>'}
      </span>
      <span className="lcai-fab-tooltip" aria-hidden="true">
        {open ? 'Close AI' : 'AI Coach'}
      </span>
    </button>
  );
};
