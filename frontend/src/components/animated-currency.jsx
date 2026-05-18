import PropTypes from 'prop-types'
import { animate } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

const currencyFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 2,
})

function AnimatedCurrency({ value, className, duration = 1 }) {
  const [displayValue, setDisplayValue] = useState(0)
  const lastValueRef = useRef(0)

  useEffect(() => {
    const safeTarget = Math.max(0, Number(value) || 0)

    const controls = animate(lastValueRef.current, safeTarget, {
      duration,
      ease: 'easeOut',
      onUpdate: (latest) => {
        setDisplayValue(latest)
      },
    })

    lastValueRef.current = safeTarget

    return () => {
      controls.stop()
    }
  }, [duration, value])

  return <span className={className}>{currencyFormatter.format(displayValue)}</span>
}

AnimatedCurrency.propTypes = {
  value: PropTypes.number.isRequired,
  className: PropTypes.string,
  duration: PropTypes.number,
}

AnimatedCurrency.defaultProps = {
  className: '',
  duration: 1,
}

export default AnimatedCurrency
