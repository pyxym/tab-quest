// Error boundary utility for robust error handling

interface ErrorInfo {
  count: number;
  firstSeen: number;
}

export class ErrorBoundary {
  private static errorCount = new Map<string, ErrorInfo>();
  private static readonly MAX_ERRORS = 5;
  private static readonly ERROR_WINDOW = 60000; // 1 minute

  static async wrap<T>(operation: () => Promise<T>, fallback: T, context: string): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.reportError(error, context);
      return fallback;
    }
  }

  static wrapSync<T>(operation: () => T, fallback: T, context: string): T {
    try {
      return operation();
    } catch (error) {
      this.reportError(error, context);
      return fallback;
    }
  }

  private static reportError(error: unknown, context: string) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${context}] Error:`, errorMessage);

    // Track error frequency
    const now = Date.now();
    const errorKey = `${context}:${errorMessage}`;
    const errorInfo = this.errorCount.get(errorKey) || { count: 0, firstSeen: now };

    errorInfo.count++;

    // Reset counter if outside error window
    if (now - errorInfo.firstSeen > this.ERROR_WINDOW) {
      errorInfo.count = 1;
      errorInfo.firstSeen = now;
    }

    this.errorCount.set(errorKey, errorInfo);

    // Alert if too many errors
    if (errorInfo.count >= this.MAX_ERRORS) {
      console.error(`[${context}] Critical: ${errorInfo.count} errors in ${this.ERROR_WINDOW}ms`);
      // Could trigger user notification here
    }
  }

  static clearErrors(context?: string) {
    if (context) {
      // Clear errors for specific context
      Array.from(this.errorCount.keys())
        .filter((key) => key.startsWith(context + ':'))
        .forEach((key) => this.errorCount.delete(key));
    } else {
      // Clear all errors
      this.errorCount.clear();
    }
  }
}

// Data validation utilities
export class DataValidator {
  static validateTab(tab: any): boolean {
    return (
      typeof tab === 'object' &&
      tab !== null &&
      typeof tab.id === 'number' &&
      (typeof tab.url === 'string' || tab.url === undefined) &&
      (typeof tab.title === 'string' || tab.title === undefined)
    );
  }

  static validateCategory(category: any): boolean {
    return (
      typeof category === 'object' &&
      category !== null &&
      typeof category.id === 'string' &&
      typeof category.name === 'string' &&
      typeof category.color === 'string' &&
      Array.isArray(category.domains) &&
      Array.isArray(category.keywords)
    );
  }

  static validateInsight(insight: any): boolean {
    return (
      typeof insight === 'object' &&
      insight !== null &&
      typeof insight.id === 'string' &&
      typeof insight.type === 'string' &&
      typeof insight.title === 'string' &&
      typeof insight.description === 'string' &&
      typeof insight.priority === 'string' &&
      typeof insight.timestamp === 'number'
    );
  }

  static sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove potentially dangerous protocols
      if (!['http:', 'https:', 'file:', 'chrome:', 'edge:', 'about:'].includes(parsed.protocol)) {
        return '';
      }
      return url;
    } catch {
      return '';
    }
  }

  static sanitizeString(str: string, maxLength: number = 1000): string {
    return str.slice(0, maxLength).replace(/[<>]/g, '');
  }
}
