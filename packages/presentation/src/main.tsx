import { StrictMode, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null };
  componentDidCatch(e: Error, _info: ErrorInfo) {
    this.setState({ error: e.message + '\n' + e.stack });
  }
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) {
      return (
        <pre style={{ background: '#1a0000', color: '#ff6b6b', padding: 32, fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {this.state.error}
        </pre>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
