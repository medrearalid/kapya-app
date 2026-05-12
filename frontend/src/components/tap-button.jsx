import PropTypes from 'prop-types'
import { motion } from 'framer-motion'

const tapTransition = {
  type: 'spring',
  stiffness: 500,
  damping: 28,
}

function TapButton({ children, className = '', ...buttonProps }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      transition={tapTransition}
      className={`tap-feedback ${className}`.trim()}
      {...buttonProps}
    >
      {children}
    </motion.button>
  )
}

TapButton.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
}

export default TapButton
