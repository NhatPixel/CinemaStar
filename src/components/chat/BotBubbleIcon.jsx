/** Icon robot cho nút mở chat (floating bubble). */
function BotBubbleIcon({ className = 'h-8 w-8' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 3.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z"
        fill="currentColor"
      />
      <path
        d="M12 6v1.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <rect
        x="5"
        y="8.5"
        width="14"
        height="11"
        rx="3.5"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="9.25" cy="13.5" r="1.35" fill="currentColor" />
      <circle cx="14.75" cy="13.5" r="1.35" fill="currentColor" />
      <path
        d="M9.5 17.25c.65.85 1.55 1.25 2.5 1.25s1.85-.4 2.5-1.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M3.5 13.5h1.75M18.75 13.5H20.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default BotBubbleIcon
