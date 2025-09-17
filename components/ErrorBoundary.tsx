import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react-native';

interface ErrorInfo {
  componentStack: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{
    error: Error;
    errorInfo: ErrorInfo;
    onRetry: () => void;
    onReset: () => void;
  }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate a unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
    
    this.setState({
      errorInfo,
    });

    // Log error to external service if needed
    this.logErrorToService(error, errorInfo);
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    try {
      // You can implement external error logging here
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location?.href || 'unknown',
        errorId: this.state.errorId,
      };

      console.log('Error data for logging:', errorData);
      
      // Example: Send to external logging service
      // fetch('/api/log-error', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorData),
      // }).catch(err => console.warn('Failed to log error:', err));
      
    } catch (loggingError) {
      console.warn('Failed to log error:', loggingError);
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  private handleReset = () => {
    // Clear any timeouts
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    // Reset state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });

    // Optional: Navigate to home or reload the app
    // You might want to use navigation here to go back to home screen
  };

  private getErrorCategory = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('camera') || message.includes('permission')) {
      return 'Camera Error';
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'Network Error';
    }
    if (message.includes('database') || message.includes('supabase')) {
      return 'Database Error';
    }
    if (message.includes('qr') || message.includes('scan')) {
      return 'Scanning Error';
    }
    
    return 'Application Error';
  };

  private getErrorSuggestion = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('camera') || message.includes('permission')) {
      return 'Please check camera permissions and try again.';
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'Please check your internet connection and try again.';
    }
    if (message.includes('database') || message.includes('supabase')) {
      return 'There seems to be an issue with the database. Please try again later.';
    }
    if (message.includes('qr') || message.includes('scan')) {
      return 'Please ensure the QR code is clear and try scanning again.';
    }
    
    return 'Please try again or restart the application.';
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      
      if (this.props.fallback && error && errorInfo) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={error}
            errorInfo={errorInfo}
            onRetry={this.handleRetry}
            onReset={this.handleReset}
          />
        );
      }

      return (
        <View style={styles.container}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconContainer}>
              <AlertTriangle size={64} color="#EA580C" />
            </View>
            
            <Text style={styles.title}>
              {error ? this.getErrorCategory(error) : 'Something went wrong'}
            </Text>
            
            <Text style={styles.message}>
              {error ? this.getErrorSuggestion(error) : 'An unexpected error occurred'}
            </Text>

            {error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorDetailsTitle}>Error Details:</Text>
                <Text style={styles.errorDetailsText}>{error.message}</Text>
                {this.state.errorId && (
                  <Text style={styles.errorId}>Error ID: {this.state.errorId}</Text>
                )}
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={this.handleRetry}
              >
                <RefreshCw size={20} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resetButton}
                onPress={this.handleReset}
              >
                <Home size={20} color="#6B7280" />
                <Text style={styles.resetButtonText}>Reset App</Text>
              </TouchableOpacity>
            </View>

            {__DEV__ && error && errorInfo && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Debug Information:</Text>
                <ScrollView style={styles.debugScroll} nestedScrollEnabled>
                  <Text style={styles.debugText}>
                    Stack Trace:{'\n'}
                    {error.stack}
                  </Text>
                  <Text style={styles.debugText}>
                    Component Stack:{'\n'}
                    {errorInfo.componentStack}
                  </Text>
                </ScrollView>
              </View>
            )}
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: '100%',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  errorDetails: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 8,
  },
  errorDetailsText: {
    fontSize: 14,
    color: '#7F1D1D',
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  errorId: {
    fontSize: 12,
    color: '#991B1B',
    fontFamily: 'monospace',
    marginTop: 8,
    opacity: 0.8,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  resetButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  debugContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
    width: '100%',
    maxHeight: 200,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  debugScroll: {
    maxHeight: 150,
  },
  debugText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
    lineHeight: 16,
    marginBottom: 8,
  },
});

// Hook for using error boundary in functional components
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    console.error('Captured error:', error);
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
};

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<any>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};