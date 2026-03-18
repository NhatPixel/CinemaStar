function Divider({ text, className = '' }) {
  return (
    <div className={`relative my-8 ${className}`}>
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-700"></div>
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-transparent px-3 text-slate-500 font-medium">
          {text}
        </span>
      </div>
    </div>
  )
}

export default Divider
