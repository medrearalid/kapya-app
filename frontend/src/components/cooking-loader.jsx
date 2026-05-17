import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { motion } from 'framer-motion'
import PropTypes from 'prop-types'

function GlowDot() {
  return (
    <span className="relative mr-1.5 inline-flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  )
}

function CookingLoader({ log, className = '' }) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <DotLottieReact
        src="/Cooking.lottie"
        loop
        autoplay
        style={{ width: 80, height: 80 }}
      />

      <div className="flex min-h-[1.25rem] items-center">
        <motion.p
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="flex items-center text-center text-xs font-light text-slate-400 dark:text-slate-500"
        >
          <GlowDot />
          {log || 'Ajan dusunuyor...'}
        </motion.p>
      </div>
    </div>
  )
}

CookingLoader.propTypes = {
  log: PropTypes.string,
  className: PropTypes.string,
}

export default CookingLoader
