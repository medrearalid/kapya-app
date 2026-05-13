import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { AnimatePresence, motion } from 'framer-motion'
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
        <AnimatePresence mode="wait">
          {log ? (
            <motion.p
              key={log}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex items-center text-center text-xs font-light text-slate-400 dark:text-slate-500"
            >
              <GlowDot />
              {log}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}

CookingLoader.propTypes = {
  log: PropTypes.string,
  className: PropTypes.string,
}

export default CookingLoader
