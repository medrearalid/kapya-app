import { AlertTriangle, RotateCcw } from 'lucide-react'
import { motion } from 'framer-motion'
import { Component } from 'react'
import PropTypes from 'prop-types'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error, errorInfo) {
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, errorInfo)
    }
  }

  handleReload = () => {
    if (globalThis.window) {
      globalThis.window.location.reload()
    }
  }

  render() {
    const { hasError, error } = this.state
    const { children } = this.props

    if (!hasError) {
      return children
    }

    const isDevMode = Boolean(import.meta.env.DEV)

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-950 via-slate-950 to-zinc-900 px-4 py-10 text-slate-100">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          className="w-full max-w-lg rounded-3xl border border-zinc-700/70 bg-zinc-900/85 p-6 text-center shadow-2xl shadow-black/40 backdrop-blur"
        >
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-amber-300">
            <AlertTriangle className="h-7 w-7" aria-hidden="true" />
          </div>

          <h1 className="mt-5 text-xl font-semibold text-zinc-100">
            Sistemde anlık bir senkronizasyon sorunu oluştu
          </h1>
          <p className="mt-2 text-sm text-zinc-300">
            Uygulama güvenli moda alındı. Sayfayı yenileyerek kaldığınız yerden devam edebilirsiniz.
          </p>

          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Sayfayı Yenile
          </button>

          {isDevMode && error?.message ? (
            <p className="mt-4 break-words text-xs text-zinc-400">{error.message}</p>
          ) : null}
        </motion.section>
      </div>
    )
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  onError: PropTypes.func,
}

export default ErrorBoundary
