import React from 'react'

type Props = { children: React.ReactNode }
type State = { hasError: boolean; error?: Error }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props){
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any){
    console.error('Uncaught error in React tree:', error, info)
  }

  render(){
    if (this.state.hasError) {
      return (
        <div style={{padding:24,fontFamily:'Inter, system-ui, sans-serif'}}>
          <h2>Si è verificato un errore</h2>
          <pre style={{whiteSpace:'pre-wrap',color:'#7f1d1d'}}>{String(this.state.error)}</pre>
          <p>Controlla la console per i dettagli.</p>
        </div>
      )
    }
    return this.props.children
  }
}
